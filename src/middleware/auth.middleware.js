const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Verify JWT access token and attach user to request
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data
    const users = await query(
      'SELECT u.id, u.name, u.email, u.role_id, r.name AS role, u.is_active FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
      [decoded.userId]
    );

    if (!users.length || !users[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    req.user = users[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

/**
 * Restrict route to admin role only
 */
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

/**
 * Allow specific roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Verify JWT access token from header or query parameter
 * Used for download links where Authorization header can't be set
 */
async function authenticateWithQuery(req, res, next) {
  try {
    let token;
    
    // Try to get token from Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      // Fallback to query parameter for download links
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data
    const users = await query(
      'SELECT u.id, u.name, u.email, u.role_id, r.name AS role, u.is_active FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
      [decoded.userId]
    );

    if (!users.length || !users[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    req.user = users[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

module.exports = { authenticate, authenticateWithQuery, requireAdmin, requireRole };
