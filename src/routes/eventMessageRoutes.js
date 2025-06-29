const express = require('express');
const router = express.Router({ mergeParams: true });

const { getMessagesByEventId, postMessageToEvent } = require('../controllers/eventMessageController');

const authenticateToken = require('../middlewares/authenticateToken');
const formatApiResponse = require('../middlewares/formatApiResponse');

router.get('/', formatApiResponse, getMessagesByEventId);

router.post('/', authenticateToken, formatApiResponse, postMessageToEvent);

module.exports = router;