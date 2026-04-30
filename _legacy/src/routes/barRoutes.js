const express = require('express');
const router = express.Router();
const barController = require('../controllers/barController');
const favoritesController = require('../controllers/favoritesController');

router.get('/bars', barController.getBars);
router.post('/bars', barController.createBar);

router.get('/favorites', favoritesController.getFavorites);
router.put('/favorites/:barId', favoritesController.toggleFavorite);
router.get('/favorites/:barId/status', favoritesController.checkFavoriteStatus);

module.exports = router;
