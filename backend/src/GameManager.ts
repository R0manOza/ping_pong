import { Server, Socket } from 'socket.io';
import { 
  GameRoom, 
  GameState, 
  Player, 
  ClientToServerEvents, 
  ServerToClientEvents,
  GAME_CONFIG 
} from  './game';

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map();

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents>) {}

  addPlayer(socket: Socket, playerName: string): void {
    // Find or create a room
    let room = this.findAvailableRoom();
    
    if (!room) {
      room = this.createRoom();
    }

    const player: Player = {
      id: socket.id,
      paddle: {
        x: room.players.size === 0 ? 20 : GAME_CONFIG.CANVAS_WIDTH - 30,
        y: GAME_CONFIG.CANVAS_HEIGHT / 2 - GAME_CONFIG.PADDLE_HEIGHT / 2,
        width: GAME_CONFIG.PADDLE_WIDTH,
        height: GAME_CONFIG.PADDLE_HEIGHT,
        side: room.players.size === 0 ? 'left' : 'right'
      },
      ready: false
    };

    room.players.set(socket.id, player);
    this.playerRooms.set(socket.id, room.id);

    // Update game state
    if (room.players.size === 1) {
      room.gameState.players.player1 = player;
    } else {
      room.gameState.players.player2 = player;
    }

    socket.join(room.id);
    this.io.to(room.id).emit('playerJoined', socket.id);
    this.io.to(room.id).emit('gameStateUpdate', room.gameState);

    console.log(`Player ${socket.id} joined room ${room.id}. Players: ${room.players.size}/2`);
  }

  removePlayer(playerId: string): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players.delete(playerId);
    this.playerRooms.delete(playerId);

    // Stop game loop if running
    if (room.gameLoop) {
      clearInterval(room.gameLoop);
      room.gameLoop = undefined;
    }

    // Reset game state if room becomes empty
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
    } else {
      // Reset game for remaining player
      room.gameState.gameStatus = 'waiting';
      this.io.to(roomId).emit('playerLeft', playerId);
      this.io.to(roomId).emit('gameStateUpdate', room.gameState);
    }
  }

  handlePaddleMove(playerId: string, direction: 'up' | 'down' | 'stop'): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room || room.gameState.gameStatus !== 'playing') return;

    const player = room.players.get(playerId);
    if (!player) return;

    const paddle = player.paddle;
    const speed = GAME_CONFIG.PADDLE_SPEED;

    switch (direction) {
      case 'up':
        paddle.y = Math.max(0, paddle.y - speed);
        break;
      case 'down':
        paddle.y = Math.min(GAME_CONFIG.CANVAS_HEIGHT - paddle.height, paddle.y + speed);
        break;
      case 'stop':
        // Paddle stops moving
        break;
    }

    // Update the corresponding player in game state
    if (player.paddle.side === 'left') {
      room.gameState.players.player1 = player;
    } else {
      room.gameState.players.player2 = player;
    }
  }

  setPlayerReady(playerId: string): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player) {
      player.ready = true;
    }

    // Check if both players are ready
    const players = Array.from(room.players.values());
    if (players.length === 2 && players.every(p => p.ready)) {
      this.startGame(room);
    }
  }

  private findAvailableRoom(): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.size < 2 && room.gameState.gameStatus === 'waiting') {
        return room;
      }
    }
    return undefined;
  }

  private createRoom(): GameRoom {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const room: GameRoom = {
      id: roomId,
      players: new Map(),
      gameState: {
        ball: {
          x: GAME_CONFIG.CANVAS_WIDTH / 2,
          y: GAME_CONFIG.CANVAS_HEIGHT / 2,
          velocityX: GAME_CONFIG.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
          velocityY: GAME_CONFIG.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
          radius: GAME_CONFIG.BALL_RADIUS
        },
        players: {
          player1: {} as Player,
          player2: {} as Player
        },
        score: {
          player1: 0,
          player2: 0
        },
        gameStatus: 'waiting'
      }
    };

    this.rooms.set(roomId, room);
    return room;
  }

  private startGame(room: GameRoom): void {
    room.gameState.gameStatus = 'playing';
    this.io.to(room.id).emit('gameStarted');
    
    // Start game loop
    room.gameLoop = setInterval(() => {
      this.updateGameState(room);
      this.io.to(room.id).emit('gameStateUpdate', room.gameState);
    }, 1000 / GAME_CONFIG.FRAME_RATE);

    console.log(`Game started in room ${room.id}`);
  }

  private updateGameState(room: GameRoom): void {
    const { ball, players, score } = room.gameState;

    // Update ball position
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    // Ball collision with top/bottom walls
    if (ball.y <= ball.radius || ball.y >= GAME_CONFIG.CANVAS_HEIGHT - ball.radius) {
      ball.velocityY = -ball.velocityY;
    }

    // Ball collision with paddles
    const player1Paddle = players.player1?.paddle;
    const player2Paddle = players.player2?.paddle;

    if (player1Paddle && this.checkPaddleCollision(ball, player1Paddle)) {
      ball.velocityX = Math.abs(ball.velocityX);
      ball.x = player1Paddle.x + player1Paddle.width + ball.radius;
    }

    if (player2Paddle && this.checkPaddleCollision(ball, player2Paddle)) {
      ball.velocityX = -Math.abs(ball.velocityX);
      ball.x = player2Paddle.x - ball.radius;
    }

    // Scoring
    if (ball.x < 0) {
      score.player2++;
      this.resetBall(ball);
    } else if (ball.x > GAME_CONFIG.CANVAS_WIDTH) {
      score.player1++;
      this.resetBall(ball);
    }

    // Check for game end
    if (score.player1 >= GAME_CONFIG.WINNING_SCORE || score.player2 >= GAME_CONFIG.WINNING_SCORE) {
      room.gameState.gameStatus = 'finished';
      const winner = score.player1 >= GAME_CONFIG.WINNING_SCORE ? 'player1' : 'player2';
      
      if (room.gameLoop) {
        clearInterval(room.gameLoop);
        room.gameLoop = undefined;
      }
      
      this.io.to(room.id).emit('gameEnded', winner);
    }
  }

  private checkPaddleCollision(ball: any, paddle: any): boolean {
    return ball.x - ball.radius < paddle.x + paddle.width &&
           ball.x + ball.radius > paddle.x &&
           ball.y - ball.radius < paddle.y + paddle.height &&
           ball.y + ball.radius > paddle.y;
  }

  private resetBall(ball: any): void {
    ball.x = GAME_CONFIG.CANVAS_WIDTH / 2;
    ball.y = GAME_CONFIG.CANVAS_HEIGHT / 2;
    ball.velocityX = GAME_CONFIG.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    ball.velocityY = GAME_CONFIG.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
  }
}