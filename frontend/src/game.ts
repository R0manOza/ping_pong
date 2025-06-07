

export interface GameState {
    ball: Ball;
    players: {
      player1: Player;
      player2: Player;
    };
    score: {
      player1: number;
      player2: number;
    };
    gameStatus: 'waiting' | 'playing' | 'finished';
  }
  
  export interface Ball {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    radius: number;
  }
  
  export interface Player {
    id: string;
    paddle: Paddle;
    ready: boolean;
  }
  
  export interface Paddle {
    x: number;
    y: number;
    width: number;
    height: number;
    side: 'left' | 'right';
  }
  
  export interface GameRoom {
    id: string;
    players: Map<string, Player>;
    gameState: GameState;
    gameLoop?: any;
  }
  
  // Socket Events
  export interface ServerToClientEvents {
    gameStateUpdate: (gameState: GameState) => void;
    playerJoined: (playerId: string) => void;
    playerLeft: (playerId: string) => void;
    gameStarted: () => void;
    gameEnded: (winner: string) => void;
    error: (message: string) => void;
  }
  
  export interface ClientToServerEvents {
    joinGame: (playerName?: string) => void;
    paddleMove: (direction: 'up' | 'down' | 'stop') => void;
    playerReady: () => void;
  }
  
  export const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 400,
    PADDLE_WIDTH: 10,
    PADDLE_HEIGHT: 80,
    BALL_RADIUS: 8,
    BALL_SPEED: 5,
    PADDLE_SPEED: 6,
    WINNING_SCORE: 5,
    FRAME_RATE: 60,
  } as const;