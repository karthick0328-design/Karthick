const express = require('express');
const router = express.Router();
const { addCashBookEntry, getCashBookTransactions } = require('../Controller/cashBookController');
const { authenticateUser, isFinancialManager } = require('../Middleware/authMiddleware');

router.use(authenticateUser); // Ensure user is logged in
router.use(isFinancialManager);

router.post('/entry', addCashBookEntry);
router.get('/transactions', getCashBookTransactions);

module.exports = router;
