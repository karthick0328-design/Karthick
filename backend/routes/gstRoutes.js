const express = require('express');
const router = express.Router();
const { getGSTReport } = require('../Controller/gstController');
const { authenticateUser, isFinancialManager } = require('../Middleware/authMiddleware');

router.use(authenticateUser);
router.use(isFinancialManager);

router.get('/report', getGSTReport);

module.exports = router;
