const { z } = require("zod")
const signupSchema = z.object({
  username: z.string()
    .min(2, "姓名不可少於 2 個字元")
    .max(20, "姓名最多為 20 個字元")
    .regex(/^[a-zA-Z0-9_]*$/, "只能包含英文、數字及底線，不可包含空白及特殊符號"),
  nickname: z.string().optional(),
  password: z.string().min(8, "密碼長度不可小於 8 個字元"),
  email: z.string().email("email 格式不正確"),
  birthday: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true; // 如果沒填則直接通過
      return !isNaN(Date.parse(date)); // 有填的話，檢查是否為有效日期格式
    }, {
      message: "生日格式錯誤，請輸入 YYYY-MM-DD 格式"
    })
})

const validateSignup = (req, res, next) => {
  try {
    signupSchema.parse(req.body) // 驗證資料
    next()
  } catch (err) {
    res.status(400).json({ error: err.errors })
  }
}

module.exports = validateSignup
