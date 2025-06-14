const express = require('express');
const {
  createEvent,
  getEvent,
  updateEvent,
  softDeleteEvent,
  getAllEvents
} = require('../controllers/eventControllers');

const { joinEvent } = require('../controllers/joinEventController');
const eventMessageRoutes = require('./eventMessageRoutes');
const authenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();

router.get('/all', getAllEvents);
router.post('/create', authenticateToken, createEvent);

router.post('/:id/join', authenticateToken, joinEvent);
router.use('/:id/messages', eventMessageRoutes);

router.get('/:id', getEvent);
router.put('/update/:id', authenticateToken, updateEvent);
router.delete('/delete/:id', authenticateToken, softDeleteEvent);

module.exports = router;