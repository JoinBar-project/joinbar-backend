const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  getMessagesByEventId,
  postMessageToEvent,
  updateMessage,
  deleteMessage
} = require('../controllers/eventMessageController');

const authenticateToken = require('../middlewares/authenticateToken');
const isMessageOwner = require('../middlewares/isMessageOwner');

router.get('/', getMessagesByEventId);

router.post('/', authenticateToken, postMessageToEvent);

router.put('/:messageId', authenticateToken, isMessageOwner, updateMessage);

router.delete('/:messageId', authenticateToken, isMessageOwner, deleteMessage);

module.exports = router;
