const db = require('../database/db');
const licenseManager = require('../utils/licenseManager');

function checkSubscription(req, res, next) {
  // Always allow subscription management and auth endpoints
  const path = req.path;
  
  if (
    path.startsWith('/api/subscription') ||
    path.startsWith('/api/auth') ||
    path === '/api/health' ||
    (path === '/api/settings' && req.method === 'GET') ||
    !path.startsWith('/api')
  ) {
    return next();
  }

  const status = licenseManager.getSubscriptionStatus(db);

  if (status.isExpired || status.status === 'tampered') {
    return res.status(403).json({
      success: false,
      code: 'SUBSCRIPTION_EXPIRED',
      error: status.message || 'SmartBarber subscription has expired. Please enter a valid renewal license key to continue.',
      machineId: status.machineId,
      daysRemaining: 0,
      expiryDate: status.expiryDate
    });
  }

  next();
}

module.exports = { checkSubscription };
