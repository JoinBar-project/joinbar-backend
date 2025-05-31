const express = require('express');
const { createEvent, getEvent, updateEvent, softDeleteEvent } = require('../controllers/eventControllers');

const router = express.Router();

router.post('/create', createEvent);
router.get('/:id', getEvent);
router.put('/update/:id', updateEvent);
router.delete('/delete/:id', softDeleteEvent);


module.exports = router;