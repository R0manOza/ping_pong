import { io } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from './game';
import { Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost/:3002';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: false 
});