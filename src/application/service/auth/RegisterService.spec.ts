import { BadRequestException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { RegisterService } from './RegisterService';
import { FeatureFlagService } from '../FeatureFlagService';
import { PasswordPolicyService } from '../PasswordPolicyService';
import { EmailAlreadyExistsException } from '../../../domain/exception/EmailAlreadyExistsException';

jest.mock('../../../infrastructure/validate-env', () => ({
  getEnv: () => ({
    BCRYPT_ROUNDS: 1,
    API_BASE_URL: 'https://api.example.com',
  }),
}));

const VALID_EMAIL = 'user@example.com';
const VALID_PASSWORD = 'ValidPass1';
const VALID_USERNAME = 'testuser';

const makeDeps = (overrides?: { emailVerificationEnabled?: boolean }) => {
  const findUser = {
    existsByEmail: jest.fn().mockResolvedValue(false),
    findByEmailWithPassword: jest.fn(),
    findByProviderUid: jest.fn(),
    findById: jest.fn(),
  };
  const saveUser = {
    createWithEmailProvider: jest.fn().mockResolvedValue(undefined),
    createWithLineProvider: jest.fn(),
    upsertLineProvider: jest.fn(),
    updatePassword: jest.fn(),
    setEmailVerified: jest.fn(),
    updateLoginSecurity: jest.fn(),
    updateLastLoginAt: jest.fn(),
  };
  const sendEmail = {
    sendMail: jest.fn().mockResolvedValue(undefined),
  };
  const passwordPolicy = {
    validateOrThrow: jest.fn(),
    onModuleInit: jest.fn(),
    minLength: 8,
    maxLength: 32,
  } as unknown as PasswordPolicyService;
  const featureFlags = {
    isEnabled: jest.fn(
      (flag: string) =>
        flag === 'emailVerificationEnabled' &&
        (overrides?.emailVerificationEnabled ?? false),
    ),
  } as unknown as FeatureFlagService;

  const service = new RegisterService(
    findUser as never,
    saveUser as never,
    sendEmail as never,
    passwordPolicy,
    featureFlags,
  );

  return { service, findUser, saveUser, sendEmail, passwordPolicy };
};

describe('RegisterService', () => {
  beforeEach(() => {
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
  });
  describe('成功路徑', () => {
    it('emailVerificationEnabled=false → createWithEmailProvider（無 token），回傳 verified=true', async () => {
      const { service, saveUser } = makeDeps({
        emailVerificationEnabled: false,
      });

      const result = await service.execute({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
        username: VALID_USERNAME,
      });

      expect(result.verified).toBe(true);
      expect(saveUser.createWithEmailProvider).toHaveBeenCalledWith(
        expect.objectContaining({ username: VALID_USERNAME }),
        'hashed-password',
        // 無 verifyToken / verifyExpires
      );
      const args = saveUser.createWithEmailProvider.mock.calls[0];
      expect(args).toHaveLength(2);
    });

    it('emailVerificationEnabled=true → createWithEmailProvider（含 token），回傳 verified=false', async () => {
      const { service, saveUser } = makeDeps({
        emailVerificationEnabled: true,
      });

      const result = await service.execute({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
        username: VALID_USERNAME,
      });

      expect(result.verified).toBe(false);
      const args = saveUser.createWithEmailProvider.mock.calls[0];
      // user, passwordHash, verifyToken, verifyExpires
      expect(args).toHaveLength(4);
      expect(typeof args[2]).toBe('string');
      expect(args[2]).toHaveLength(64); // 32 bytes hex
      expect(args[3]).toBeInstanceOf(Date);
    });

    it('emailVerificationEnabled=true → 寄送驗證信到指定 email', async () => {
      const { service, sendEmail } = makeDeps({
        emailVerificationEnabled: true,
      });

      await service.execute({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
        username: VALID_USERNAME,
      });

      expect(sendEmail.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: VALID_EMAIL }),
      );
    });
  });

  describe('驗證失敗', () => {
    it('email 格式不正確 → BadRequestException', async () => {
      const { service } = makeDeps();

      await expect(
        service.execute({
          email: 'not-an-email',
          password: VALID_PASSWORD,
          username: VALID_USERNAME,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('密碼不符合策略 → BadRequestException（由 PasswordPolicyService 拋出）', async () => {
      const { service, passwordPolicy } = makeDeps();
      (passwordPolicy.validateOrThrow as jest.Mock).mockImplementation(() => {
        throw new BadRequestException('密碼不符合安全策略');
      });

      await expect(
        service.execute({
          email: VALID_EMAIL,
          password: 'weak',
          username: VALID_USERNAME,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('email 已存在 → EmailAlreadyExistsException', async () => {
      const { service, findUser } = makeDeps();
      findUser.existsByEmail.mockResolvedValue(true);

      await expect(
        service.execute({
          email: VALID_EMAIL,
          password: VALID_PASSWORD,
          username: VALID_USERNAME,
        }),
      ).rejects.toThrow(EmailAlreadyExistsException);
    });
  });

  describe('email 驗證信', () => {
    it('sendMail 失敗 → 主流程不中斷，仍回傳 verified=false', async () => {
      const { service, sendEmail } = makeDeps({
        emailVerificationEnabled: true,
      });
      sendEmail.sendMail.mockRejectedValue(new Error('smtp error'));

      const result = await service.execute({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
        username: VALID_USERNAME,
      });

      expect(result.verified).toBe(false);
    });

    it('emailVerificationEnabled=false → 不寄送驗證信', async () => {
      const { service, sendEmail } = makeDeps({
        emailVerificationEnabled: false,
      });

      await service.execute({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
        username: VALID_USERNAME,
      });

      expect(sendEmail.sendMail).not.toHaveBeenCalled();
    });
  });

  it('createWithEmailProvider 傳入正確的 user.email', async () => {
    const { service, saveUser } = makeDeps();

    await service.execute({
      email: VALID_EMAIL,
      password: VALID_PASSWORD,
      username: VALID_USERNAME,
    });

    const user = saveUser.createWithEmailProvider.mock.calls[0][0];
    expect(user.email?.toString()).toBe(VALID_EMAIL);
  });
});
