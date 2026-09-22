const db = require('../database/db');

// Middleware to authenticate user from token or headers
function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    // Default to guest/customer if unauthenticated
    req.user = { id: 0, role: 'customer', name: 'Guest / Customer' };
    return next();
  }

  try {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Check if token matches standard base64 session or user id/username
    let user = null;

    if (token.startsWith('usr_')) {
      const parts = token.split('_'); // usr_ID_ROLE
      const userId = parseInt(parts[1]);
      user = db.prepare('SELECT id, username, name, amharic_name, role, barber_id, is_active FROM users WHERE id = ?').get(userId);
    } else {
      // Direct token format: username:pin encoded or username lookup
      user = db.prepare('SELECT id, username, name, amharic_name, role, barber_id, is_active FROM users WHERE username = ? OR id = ?').get(token, parseInt(token) || -1);
    }

    if (user && user.is_active) {
      req.user = user;
    } else {
      req.user = { id: 0, role: 'customer', name: 'Guest / Customer' };
    }
    next();
  } catch (err) {
    req.user = { id: 0, role: 'customer', name: 'Guest / Customer' };
    next();
  }
}

// Middleware to enforce specific roles
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Requires one of [${allowedRoles.join(', ')}] role(s). Current role: ${req.user ? req.user.role : 'none'}`
      });
    }
    next();
  };
}

module.exports = {
  authenticateUser,
  requireRole
};
