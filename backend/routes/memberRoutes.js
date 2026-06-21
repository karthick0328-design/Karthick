const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../Middleware/authMiddleware');
const memberController = require('../Controller/memberController');

router.get('/', authenticateUser, memberController.getAllMembers);
router.post('/start-chat', authenticateUser, memberController.startDirectChat);

module.exports = router;
