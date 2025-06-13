const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

// 建立郵件傳送器
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 測試郵件連線
const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('郵件服務連線成功');
    return true;
  } catch(err) {
    console.error('郵件服務連線失敗:', err);
    return false;
  }
};

// 寄送驗證信
const sendVerificationEmail = async (email, verificationToken, username) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '帳號驗證 - 請完成信箱驗證',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">歡迎加入我們！</h2>
        <p>親愛的 ${username}，</p>
        <p>感謝您註冊我們的服務！請點擊下方按鈕來驗證您的信箱：</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
            style="background-color: #007bff; color: white; padding: 12px 30px; 
						text-decoration: none; border-radius: 5px; display: inline-block;">
            驗證信箱
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          或複製以下連結到瀏覽器：<br>
          <a href="${verificationUrl}">${verificationUrl}</a>
        </p>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          此驗證連結將在 24 小時後失效。<br>
          如果您沒有註冊此帳號，請忽略此信件。
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('驗證信已寄送:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('寄送驗證信失敗:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  testEmailConnection,
  sendVerificationEmail,
};