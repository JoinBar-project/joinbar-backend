const { z } = require('zod');
const signupSchema = z.object({
  username: z.string()
    .min(2, '姓名不可少於 2 個字元')
    .max(20, '姓名最多為 20 個字元'),
  nickname: z.union([
    z.string()
      .min(1, '使用者名稱至少需要 1 個字元') // 避免使用者輸入空字串
      .max(100, '使用者名稱不可超過 100 個字元'),
    z.undefined()]),
  password: z.string()
    .min(8, '密碼至少需要 8 個字元')
    .max(100, '密碼不可超過 100 個字元')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,'密碼必須包含至少 1 個大寫字母、小寫字母和數字'),
  email: z.string().email('email 格式不正確'),
  birthday: z.union([
    z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '生日格式錯誤，請輸入 YYYY-MM-DD 格式')
      .refine((date) => {
        const birthDate = new Date(date); // 先將使用者輸入的字串轉成 JS 日期物件
        return !isNaN(birthDate.getTime()); // 將日期轉成毫秒，並判斷是否為數字
      }, '請輸入有效的日期')
      .refine((date) => {
        const birthDate = new Date(date);
        const today = new Date();
        return birthDate <= today;
      }, '生日不能是未來日期'),
    z.undefined()]),
});

const validateSignup = (req, res, next) => {
  try {
    signupSchema.parse(req.body); // 驗證資料
    next();
  } catch (err) {
    res.status(400).json({ error: err.errors });
  }
};

module.exports = validateSignup;
