const db = require('../database/db');
const licenseManager = require('../utils/licenseManager');

const subscriptionController = {
  getStatus: (req, res) => {
    try {
      const status = licenseManager.getSubscriptionStatus(db);
      res.json({ success: true, data: status });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  activateKey: (req, res) => {
    try {
      const { licenseKey } = req.body;
      if (!licenseKey) {
        return res.status(400).json({ success: false, error: 'Please enter a license key.' });
      }
      const result = licenseManager.verifyAndApplyLicenseKey(db, licenseKey);
      res.json({
        success: true,
        message: `Subscription successfully renewed! Added ${result.daysAdded} days. Valid until ${result.formattedExpiry}.`,
        data: result
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  adminOverride: (req, res) => {
    try {
      const { masterPin, months, days, plan } = req.body;
      let daysToAdd = days;
      if (months) {
        daysToAdd = months * 30;
        if (months === 12) daysToAdd = 365;
      }
      if (!daysToAdd) daysToAdd = 30;

      const result = licenseManager.developerDirectExtend(db, masterPin, daysToAdd, plan);
      res.json({
        success: true,
        message: `Subscription extended by ${result.daysAdded} days. Valid until ${result.formattedExpiry}.`,
        data: result
      });
    } catch (err) {
      res.status(403).json({ success: false, error: err.message });
    }
  }
};

module.exports = subscriptionController;
