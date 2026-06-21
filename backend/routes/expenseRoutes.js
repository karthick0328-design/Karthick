const express = require('express');
const router = express.Router();
const { authenticateUser, isFinancialPersonnel, isFinancialManager } = require('../Middleware/authMiddleware');
const financialUpload = require('../Middleware/financialUploadMiddleware');
const {
    getAllExpenses,
    createExpense,
    deleteExpense
} = require('../Controller/expenseController');

router.use(authenticateUser);
router.use(isFinancialPersonnel);

router.get('/', getAllExpenses);
router.post('/', (req, res, next) => {
    financialUpload.single('file')(req, res, (err) => {
        if (err) {
            console.error(`[${new Date().toISOString()}] ❌ Expense Upload Error:`, err.message);
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        }
        next();
    });
}, createExpense);
router.delete('/:id', isFinancialManager, deleteExpense);

module.exports = router;
