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

const router = express.Router();

router.get('/all', getAllEvents);
router.post('/create', createEvent);

router.post('/:id/join', joinEvent);
router.use('/:id/messages', eventMessageRoutes);

router.get('/:id', getEvent);
router.put('/update/:id', updateEvent);
router.delete('/delete/:id', softDeleteEvent);

module.exports = router;