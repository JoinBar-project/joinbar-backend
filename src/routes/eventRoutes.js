const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
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
router.post('/create', authenticateToken,upload.single('image'), createEvent);

router.post('/:id/join', authenticateToken, joinEvent);
router.use('/:id/messages', eventMessageRoutes);

router.get('/:id', getEvent);
router.put('/:id/update', authenticateToken, updateEvent);
router.delete('/:id/delete', authenticateToken, softDeleteEvent);

module.exports = router;