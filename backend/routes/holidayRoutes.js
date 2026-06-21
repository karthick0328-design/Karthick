// routes/holidayRoutes.js
const express = require('express');
const router = express.Router();
const { createHoliday, getHolidays, getHolidayById, updateHoliday, deleteHoliday } = require('../Controller/hoildayController');
const { authenticateUser, isAdminOrHR } = require('../Middleware/authMiddleware');

router.get('/', authenticateUser, getHolidays);
router.post('/', authenticateUser, isAdminOrHR, createHoliday);
router.get('/:id', authenticateUser, isAdminOrHR, getHolidayById);
router.put('/:id', authenticateUser, isAdminOrHR, updateHoliday);
router.delete('/:id', authenticateUser, isAdminOrHR, deleteHoliday);

module.exports = router;