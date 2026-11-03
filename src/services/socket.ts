import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function initSocket(userId?: string): Socket {
  if (!socket) {
    // Connect to same origin (port 3000 in dev and prod)
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected with ID:', socket?.id);
      if (userId) {
        socket?.emit('user:online', userId);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });
  }

  if (userId && socket.connected) {
    socket.emit('user:online', userId);
  }

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
