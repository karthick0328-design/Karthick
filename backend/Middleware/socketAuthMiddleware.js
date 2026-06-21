// Middleware/socketAuthMiddleware.js (NEW: Dedicated file for Socket.io JWT authentication)
const jwt = require('jsonwebtoken');

const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;  // Attach user to socket
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = authenticateSocket;