const express = require('express');
const router = express.Router();
const {
  authenticateUser,
  isSalaryAuthorized,
  isHRPersonnel,
  isFinancialManager,
  isFinancialPersonnel
} = require('../Middleware/authMiddleware');

const {
  getSalaries,
  getSalaryById,
  createSalary,
  updateSalary,
  deleteSalary,
  getDepartmentRates,
  createOrUpdateDepartmentRate,
  deleteDepartmentRate,
  getUserSalaryAndAttendance,
  submitAttendanceToFinance,
  getFinanceSubmissions,
  processSalaryByFinance,
  creditSalary
} = require('../Controller/salaryController');

// --- Specific Routes (Put these BEFORE generic ones like /:id) ---

// Department-rate routes
router.get('/department-rates', authenticateUser, isSalaryAuthorized, getDepartmentRates);
router.post('/department-rate', authenticateUser, isSalaryAuthorized, createOrUpdateDepartmentRate);
router.delete('/department-rate/:id', authenticateUser, isSalaryAuthorized, deleteDepartmentRate);

// User-specific salary/attendance route
router.get('/user/:uniqueId', authenticateUser, isSalaryAuthorized, getUserSalaryAndAttendance);

// NEW: Salary Process Workflow Routes (Must be before generic /:id)
router.post('/submit-attendance', authenticateUser, isHRPersonnel, submitAttendanceToFinance);
router.get('/finance/submissions', authenticateUser, isFinancialPersonnel, getFinanceSubmissions);
router.post('/process-salary', authenticateUser, isFinancialPersonnel, processSalaryByFinance);
router.post('/credit-salary/:id', authenticateUser, isFinancialPersonnel, creditSalary);

// --- Generic Salary Routes ---

router.get('/', authenticateUser, isSalaryAuthorized, getSalaries);
router.get('/:id', authenticateUser, isSalaryAuthorized, getSalaryById);
router.post('/', authenticateUser, isSalaryAuthorized, createSalary);
router.put('/:id', authenticateUser, isSalaryAuthorized, updateSalary);
router.delete('/:id', authenticateUser, isSalaryAuthorized, deleteSalary);

module.exports = router;