// middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    // Prefer Bearer token from Authorization header, fallback to cookie if present
    let token = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token; // fallback for older clients
    }

    if (!token) {
      console.warn('Auth: no token provided (no Authorization header and no cookie)');
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error && error.stack ? error.stack : error);

    if (error.name === 'JsonWebTokenError') {
      console.warn('Auth: invalid token -', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      console.warn('Auth: token expired');
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message,
    });
  }
};

module.exports = { authenticate };
