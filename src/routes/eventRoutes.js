const express = require('express');
const { createEvent, getEvent, updateEvent, softDeleteEvent, getAllEvents } = require('../controllers/eventControllers');
const authenticateToken = require('../middlewares/authenticateToken');
const withTaiwanTime = require('../middlewares/withTaiwanTime');
const formatBigIntResponse = require('../middlewares/formatBigIntResponse')

const router = express.Router();

router.get('/all', withTaiwanTime, formatBigIntResponse, getAllEvents);
router.post('/create', authenticateToken, formatBigIntResponse, withTaiwanTime, createEvent);
router.get('/:id', formatBigIntResponse, withTaiwanTime, getEvent);
router.put('/update/:id', authenticateToken, formatBigIntResponse, withTaiwanTime,  updateEvent);
router.delete('/delete/:id', authenticateToken, formatBigIntResponse, withTaiwanTime, softDeleteEvent);


module.exports = router;