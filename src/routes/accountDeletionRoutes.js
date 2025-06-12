const express = require('express');
const router = express.Router();
const { deleteAccount, getDeletionWarning } = require('../controllers/accountDeletionController');
const authenticateToken = require('../middlewares/authenticateToken');

router.use(authenticateToken);

// 獲取帳戶註銷警告資訊
router.get('/deletion-warning', getDeletionWarning);

// 執行帳戶註銷
router.delete('/delete', deleteAccount);

module.exports = router;