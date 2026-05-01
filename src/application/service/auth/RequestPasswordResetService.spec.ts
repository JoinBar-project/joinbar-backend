import { RequestPasswordResetService } from './RequestPasswordResetService';
import { User } from '../../../domain/model/User';
import { RoleName } from '../../../domain/value-object/Role';

jest.mock('../../../infrastructure/validate-env', () => ({
  getEnv: () => ({
    APP_PASSWORD_RESET_TOKEN_EXPIRES_IN: 30,
    APP_PASSWORD_RESET_URL: 'https://app.example.com/reset-password',
  }),
}));

const USER_ID = '33333333-3333-4333-8333-333333333333';
const USER_EMAIL = 'user@example.com';

const makeActiveUser = () =>
  User.reconstitute({
    id: USER_ID,
    email: USER_EMAIL,
    username: 'testuser',
    nickname: null,
    role: RoleName.USER,
    failedLoginCount: 0,
    lockedAt: null,
    lastPasswordChange: null,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
  });

const makeDeletedUser = () =>
  User.reconstitute({
    id: USER_ID,
    email: USER_EMAIL,
    username: 'testuser',
    nickname: null,
    role: RoleName.USER,
    failedLoginCount: 0,
    lockedAt: null,
    lastPasswordChange: null,
    deletedAt: new Date('2024-06-01'),
    createdAt: new Date('2024-01-01'),
  });

const makeDeps = () => {
  const findUser = {
    findByEmailWithPassword: jest.fn().mockResolvedValue({
      user: makeActiveUser(),
      passwordHash: 'hash',
      providerId: 'provider-id',
    }),
    findByProviderUid: jest.fn(),
    findById: jest.fn(),
    existsByEmail: jest.fn(),
    findByEmailVerifyToken: jest.fn(),
  };
  const resetToken = {
    createToken: jest.fn().mockResolvedValue(undefined),
    findByToken: jest.fn(),
    markUsed: jest.fn(),
  };
  const sendEmail = {
    sendMail: jest.fn().mockResolvedValue(undefined),
  };

  const service = new RequestPasswordResetService(
    findUser as never,
    resetToken as never,
    sendEmail as never,
  );

  return { service, findUser, resetToken, sendEmail };
};

describe('RequestPasswordResetService', () => {
  it('有效 email → 建立 token 並寄送重設信', async () => {
    const { service, resetToken, sendEmail } = makeDeps();

    await service.execute({ email: USER_EMAIL });

    expect(resetToken.createToken).toHaveBeenCalledWith(
      USER_ID,
      expect.any(String),
      expect.any(Date),
    );
    const token: string = resetToken.createToken.mock.calls[0][1];
    expect(token).toHaveLength(64); // 32 bytes hex

    expect(sendEmail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: USER_EMAIL }),
    );
  });

  it('token 有效期為 APP_PASSWORD_RESET_TOKEN_EXPIRES_IN 分鐘', async () => {
    const { service, resetToken } = makeDeps();
    const before = Date.now();

    await service.execute({ email: USER_EMAIL });

    const expiresAt: Date = resetToken.createToken.mock.calls[0][2];
    const diffMs = expiresAt.getTime() - before;
    expect(diffMs).toBeGreaterThanOrEqual(30 * 60 * 1000 - 100);
    expect(diffMs).toBeLessThanOrEqual(30 * 60 * 1000 + 100);
  });

  it('email 不存在 → 靜默回傳（不洩漏 email 存在與否）', async () => {
    const { service, findUser, resetToken, sendEmail } = makeDeps();
    findUser.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      service.execute({ email: 'ghost@example.com' }),
    ).resolves.toBeUndefined();
    expect(resetToken.createToken).not.toHaveBeenCalled();
    expect(sendEmail.sendMail).not.toHaveBeenCalled();
  });

  it('帳號已停用 → 靜默回傳', async () => {
    const { service, findUser, resetToken, sendEmail } = makeDeps();
    findUser.findByEmailWithPassword.mockResolvedValue({
      user: makeDeletedUser(),
      passwordHash: 'hash',
      providerId: 'provider-id',
    });

    await expect(
      service.execute({ email: USER_EMAIL }),
    ).resolves.toBeUndefined();
    expect(resetToken.createToken).not.toHaveBeenCalled();
    expect(sendEmail.sendMail).not.toHaveBeenCalled();
  });

  it('sendMail 失敗 → 主流程不中斷', async () => {
    const { service, sendEmail, resetToken } = makeDeps();
    sendEmail.sendMail.mockRejectedValue(new Error('smtp error'));

    await expect(
      service.execute({ email: USER_EMAIL }),
    ).resolves.toBeUndefined();
    expect(resetToken.createToken).toHaveBeenCalledTimes(1);
  });

  it('重設信包含 APP_PASSWORD_RESET_URL + token 的連結', async () => {
    const { service, resetToken, sendEmail } = makeDeps();

    await service.execute({ email: USER_EMAIL });

    const token: string = resetToken.createToken.mock.calls[0][1];
    const mail = sendEmail.sendMail.mock.calls[0][0];
    expect(mail.html).toContain(
      `https://app.example.com/reset-password?token=${token}`,
    );
  });
});
