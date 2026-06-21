const express = require('express');
const router = express.Router();
const { authenticateUser, isFinancialManager } = require('../Middleware/authMiddleware');
const {
    getFinanceTeam,
    updateEmployeeFinanceAccess
} = require('../Controller/financeController');

// All routes are protected by auth and financial manager check
router.use(authenticateUser);
router.use(isFinancialManager);

router.get('/team', getFinanceTeam);
router.put('/team/access', updateEmployeeFinanceAccess);

module.exports = router;
