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
        message: `Subscription successfully renewed! Added ${result.addedText || result.daysAdded + ' days'}. Valid until ${result.formattedExpiry}.`,
        data: result
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  getDeveloperChallenge: (req, res) => {
    try {
      const challengeData = licenseManager.generateDeveloperChallenge(db);
      res.json({ success: true, data: challengeData });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  verifyDeveloperChallenge: (req, res) => {
    try {
      const { otpToken } = req.body;
      if (!otpToken) {
        return res.status(400).json({ success: false, error: 'Please enter the Developer One-Time Pass.' });
      }
      const result = licenseManager.verifyAndExecuteDeveloperChallenge(db, otpToken);
      res.json({
        success: true,
        message: `Workstation successfully unlocked by verified developer! Added ${result.addedText}. Valid until ${result.formattedExpiry}.`,
        data: result
      });
    } catch (err) {
      res.status(403).json({ success: false, error: err.message });
    }
  }
};

module.exports = subscriptionController;
