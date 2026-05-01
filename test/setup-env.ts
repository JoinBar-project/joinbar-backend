/**
 * E2E 測試前設定最低限度的環境變數，
 * 確保 getEnv() singleton 在 Jest 啟動時能通過驗證。
 */
process.env.NODE_ENV = 'test';
// Prisma 直接讀取 DATABASE_URL（不經 getEnv()）
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/joinbar_test';
// validate-env 必填欄位（無 default）
process.env.ACCESS_SECRET = 'e2e-test-access-secret-minimum-32-chars!!';
process.env.COOKIE_SECRET = 'e2e-test-cookie-secret-minimum-32-chars!';
process.env.BCRYPT_ROUNDS = '1'; // 測試環境使用最低 cost factor 加速
