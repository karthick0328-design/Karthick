const express = require('express');
const router = express.Router();
const {
  getAllVacancies,
  getOpenVacancies,
  createVacancy,
  updateVacancy,
  deleteVacancy,
  getVacancy
} = require('../Controller/vacancyController');
const {
  getApplications,
  updateApplicationStatus,
} = require('../Controller/applicationsController'); // NEW IMPORT
const { authenticateUser, isHRPersonnel } = require('../Middleware/authMiddleware');

// All vacancy routes require Admin OR HR Personnel
router
  .route('/')
  .get(authenticateUser, isHRPersonnel, getAllVacancies)
  .post(authenticateUser, isHRPersonnel, createVacancy);

router.get('/open', authenticateUser, isHRPersonnel, getOpenVacancies);

router
  .route('/:id')
  .get(authenticateUser, isHRPersonnel, getVacancy)
  .put(authenticateUser, isHRPersonnel, updateVacancy)
  .delete(authenticateUser, isHRPersonnel, deleteVacancy);

// NEW: Applications routes under /api/vacancies/applications
router
  .route('/applications')
  .get(authenticateUser, isHRPersonnel, getApplications);

router
  .route('/applications/:id/status')
  .put(authenticateUser, isHRPersonnel, updateApplicationStatus);

module.exports = router;