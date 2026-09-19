const { Server } = require('socket.io');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket.IO] Initialized and listening for real-time clients');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('[Socket.IO] Socket.io has not been initialized. Call initSocket first.');
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
