const { z } = require('zod');
const updateUserDataSchema = z.object({
  username: z.union([
    z.string()
      .min(2, '姓名不可少於 2 個字元')
      .max(20, '姓名最多為 20 個字元'),
    z.undefined()]),
  nickname: z.union([
    z.string()
      .min(1, '使用者名稱至少需要 1 個字元')
      .max(100, '使用者名稱不可超過 100 個字元'),
      z.undefined()]),
  birthday: z.union([
    z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '生日格式錯誤，請輸入 YYYY-MM-DD 格式')
      .refine((date) => {
        const birthDate = new Date(date);
        return !isNaN(birthDate.getTime());
        }, '請輸入有效的日期')
      .refine((date) => {
        const birthDate = new Date(date);
        const today = new Date();
        return birthDate <= today;
        }, '生日不能是未來日期'),
    z.undefined()]),
  avatarUrl: z.union([
    z.string().url('請輸入正確的頭像網址格式'),
    z.undefined()]),
});

const validateUpdateUserData = (req, res, next) => {
  try {
    updateUserDataSchema.parse(req.body);
    next();
  } catch (err) {
    res.status(400).json({ error: err.errors });
  }
};

module.exports = validateUpdateUserData;