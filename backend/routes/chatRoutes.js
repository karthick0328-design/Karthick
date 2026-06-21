const express = require('express');
const router = express.Router();
const { authenticateUser, isAdmin } = require('../Middleware/authMiddleware');
const chatController = require('../Controller/chatController');

// All chat routes require authentication
router.use(authenticateUser);

router.get('/all-conversations', isAdmin, chatController.getAllConversations);
router.post('/conversations', chatController.createConversation);
router.get('/conversations', chatController.getMyConversations);

router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/conversations/:conversationId/messages', chatController.sendMessage);

router.post('/upload', require('../Middleware/chatUploadMiddleware').single('file'), chatController.uploadAttachment);

router.post('/messages/:messageId/action', chatController.performAction);

module.exports = router;
