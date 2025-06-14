const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, patchUserById, getDeletedUsers } = require('../controllers/usersControllers');
const authenticateToken = require('../middlewares/authenticateToken');
const validateUpdateUserData = require('../middlewares/validateUpdateUserData');

router.use(authenticateToken);

router.get('/', getAllUsers);
router.get('/deleted', getDeletedUsers); // 獲取已註銷用戶（僅管理員）
router.get('/:id', getUserById);
router.patch('/:id', validateUpdateUserData, patchUserById);

module.exports = router;
