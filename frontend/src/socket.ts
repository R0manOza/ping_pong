import { io } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from './game';
import { Socket } from 'socket.io-client';

const SERVER_URL = process.env.NODE_ENV === 'production' ? '/' : 'http://localhost:3001';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: false 
});