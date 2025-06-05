import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './GameManager';

import { ClientToServerEvents, ServerToClientEvents } from "./game"

const app = express();
const server = createServer(app);


const ALLOWED_ORIGIN = "http://localhost:5173"; 

// Configure CORS
app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true
}));

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"]
  }
});

const gameManager = new GameManager(io);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('joinGame', (playerName) => {
    gameManager.addPlayer(socket, playerName || `Player-${socket.id.substring(0, 6)}`);
  });

  socket.on('paddleMove', (direction) => {
    gameManager.handlePaddleMove(socket.id, direction);
  });

  socket.on('playerReady', () => {
    gameManager.setPlayerReady(socket.id);
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    gameManager.removePlayer(socket.id);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Game server ready for connections`);
});