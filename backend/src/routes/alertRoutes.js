const express = require('express');
const router = express.Router();
const {
  getAlerts,
  getLatestAlert,
} = require('../controllers/alertController');

// Routes mapped to /api/alerts
router.get('/', getAlerts);
router.get('/latest', getLatestAlert);

module.exports = router;
