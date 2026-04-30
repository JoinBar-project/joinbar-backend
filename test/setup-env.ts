/**
 * E2E 測試前設定最低限度的環境變數，
 * 確保 getEnv() singleton 在 Jest 啟動時能通過驗證。
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/joinbar_test';
process.env.JWT_ACCESS_SECRET = 'e2e-test-access-secret-minimum-32-chars!!';
process.env.JWT_REFRESH_SECRET = 'e2e-test-refresh-secret-minimum-32-chars!';
process.env.ACCESS_TOKEN_EXPIRES_IN = '7200';
process.env.REFRESH_TOKEN_EXPIRES_IN = '604800';
process.env.BCRYPT_ROUNDS = '1'; // 測試環境使用最低 cost factor 加速
process.env.CORS_ORIGIN = 'http://localhost:3000';
