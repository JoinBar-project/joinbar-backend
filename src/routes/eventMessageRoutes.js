const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  getMessagesByEventId,
  postMessageToEvent
} = require('../controllers/eventMessageController');

const authenticateToken = require('../middlewares/authenticateToken');

router.get('/', getMessagesByEventId);

router.post('/', authenticateToken, postMessageToEvent);

module.exports = router;
