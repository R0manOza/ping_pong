// frontend/src/components/PongGame.tsx
import React, { useRef, useEffect, useState } from 'react';
import { socket } from './socket';
import { type GameState, type Player, GAME_CONFIG } from './game';
const PongGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [statusMessage, setStatusMessage] = useState('Connecting to server...');
  const [gameEndedMessage, setGameEndedMessage] = useState('');
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Function to draw the game state on the canvas
  const draw = (ctx: CanvasRenderingContext2D, state: GameState) => {
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // Draw paddles
    ctx.fillStyle = 'white';
    const { player1, player2 } = state.players;
    if (player1?.paddle) {
      ctx.fillRect(player1.paddle.x, player1.paddle.y, player1.paddle.width, player1.paddle.height);
    }
    if (player2?.paddle) {
      ctx.fillRect(player2.paddle.x, player2.paddle.y, player2.paddle.width, player2.paddle.height);
    }

    // Draw ball
    if (state.gameStatus === 'playing') {
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw score
    ctx.font = '32px Arial';
    ctx.fillText(state.score.player1.toString(), GAME_CONFIG.CANVAS_WIDTH / 4, 50);
    ctx.fillText(state.score.player2.toString(), (GAME_CONFIG.CANVAS_WIDTH * 3) / 4, 50);
  };

  useEffect(() => {
    // Connect to the server
    socket.connect();
    
    function onConnect() {
      setStatusMessage('Connected! Waiting for players...');
    }

    function onGameStateUpdate(newState: GameState) {
      setGameState(newState);
      if (newState.gameStatus === 'waiting') {
        setStatusMessage(`Waiting for opponent... (${Object.values(newState.players).filter(p => p.id).length}/2)`);
      } else if (newState.gameStatus === 'playing') {
        setStatusMessage('');
      }
    }

    function onGameEnded(winner: string) {
      setGameEndedMessage(`${winner} wins!`);
    }

    // Register socket listeners
    socket.on('connect', onConnect);
    socket.on('gameStateUpdate', onGameStateUpdate);
    socket.on('gameEnded', onGameEnded);

    // Canvas drawing loop
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (context && gameState) {
      draw(context, gameState);
    }

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'ArrowUp') {
        socket.emit('paddleMove', 'up');
      } else if (e.key === 's' || e.key === 'ArrowDown') {
        socket.emit('paddleMove', 'down');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on component unmount
    return () => {
      socket.off('connect', onConnect);
      socket.off('gameStateUpdate', onGameStateUpdate);
      socket.off('gameEnded', onGameEnded);
      socket.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Effect to re-draw canvas whenever gameState changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (context && gameState) {
      draw(context, gameState);
    }
  }, [gameState]);


  const handleJoinGame = () => {
    socket.emit('joinGame');
    setStatusMessage('Joined game. Waiting for opponent...');
  };

  const handleReady = () => {
    socket.emit('playerReady');
    setIsPlayerReady(true);
    setStatusMessage('You are ready! Waiting for opponent...');
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Ping Pong</h1>
      <canvas
        ref={canvasRef}
        width={GAME_CONFIG.CANVAS_WIDTH}
        height={GAME_CONFIG.CANVAS_HEIGHT}
        style={{ border: '1px solid white', backgroundColor: 'black' }}
      />
      <div>
        {!gameState && <button onClick={handleJoinGame}>Join Game</button>}
        {gameState?.gameStatus === 'waiting' && !isPlayerReady && (
          <button onClick={handleReady}>Ready Up</button>
        )}
        <h3>{statusMessage}</h3>
        {gameEndedMessage && <h2>{gameEndedMessage}</h2>}
      </div>
    </div>
  );
};

export default PongGame;