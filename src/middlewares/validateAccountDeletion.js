const { z } = require('zod');

const accountDeletionSchema = z.object({
  password: z.union([
    z.string()
      .min(1, '密碼不能為空'),
    z.undefined()
  ]),
  confirmText: z.string()
  .refine(
    (text) => text === '刪除我的帳戶',
    '請輸入正確的確認文字：刪除我的帳戶'
  )
});

const validateAccountDeletion = (req, res, next) => {
  try {
    accountDeletionSchema.parse(req.body);
    next();
  } catch (error) {
    console.error('帳戶註銷驗證失敗:', error.errors);
    const errorMessages = error.errors.map(err => ({
      field: err.path.join('.'), 
      message: err.message
    }));

    return res.status(400).json({
      success: false,
      error: '驗證失敗',
      details: errorMessages
    });
  }
};

module.exports = { validateAccountDeletion };