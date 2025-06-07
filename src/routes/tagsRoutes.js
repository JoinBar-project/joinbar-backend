const express = require('express');
const { createTag, getListTag, getTag, deleteTag } = require('../controllers/eventTagControllers');

const router = express.Router();

router.post('/createTag', createTag);
router.get('/list', getListTag);
router.get('/:id', getTag);
router.delete('/deleteTag/:id', deleteTag);


module.exports = router;