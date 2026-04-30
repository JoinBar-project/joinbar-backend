const multer = require('multer');

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jfif'];
  if (!allowedTypes.includes(file.mimetype)) {
    const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
    error.message = '不支援的圖片格式';
    return cb(error);
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1 * 1024 * 1024, // 最大 1MB
  },
  fileFilter,
});

module.exports = upload;