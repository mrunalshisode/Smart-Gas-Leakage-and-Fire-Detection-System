const Alert = require('../models/Alert');

// GET /api/alerts
// Fetch recent safety alerts (optional ?limit=20, ?severity=HIGH)
const getAlerts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const filter = {};

    if (req.query.severity) {
      filter.severity = req.query.severity.toUpperCase();
    }
    if (req.query.alertType) {
      filter.alertType = req.query.alertType.toUpperCase();
    }

    const alerts = await Alert.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve alerts',
      error: error.message,
    });
  }
};

// GET /api/alerts/latest
// Fetch the most recent alert
const getLatestAlert = async (req, res) => {
  try {
    const latest = await Alert.findOne().sort({ timestamp: -1 });
    return res.status(200).json({
      success: true,
      data: latest || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve latest alert',
      error: error.message,
    });
  }
};

module.exports = {
  getAlerts,
  getLatestAlert,
};
