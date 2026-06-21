const express = require('express');
const router = express.Router();
const softwareIssueController = require('../Controller/softwareIssueController');
const { authenticateUser } = require('../Middleware/authMiddleware');
const upload = require('../Middleware/issueUploadMiddleware'); 

router.route('/')
    .post(authenticateUser, upload.array('attachments', 5), softwareIssueController.createIssue)
    .get(authenticateUser, softwareIssueController.getIssues);

router.route('/:id')
    .get(authenticateUser, softwareIssueController.getIssueById);

router.route('/:id/status')
    .put(authenticateUser, softwareIssueController.updateIssueStatus);

router.route('/:id/comments')
    .post(authenticateUser, upload.array('attachments', 5), softwareIssueController.addComment);

module.exports = router;
