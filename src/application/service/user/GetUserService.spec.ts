import { GetUserService } from './GetUserService';
import { UserProfileData } from '../../port/out/user/FindUserPort';
import { UserNotFoundException } from '../../../domain/exception/UserNotFoundException';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const FRESH_SIGNED_URL = 'https://storage.googleapis.com/fresh/avatar.jpg';

const makeProfile = (
  overrides: Partial<UserProfileData> = {},
): UserProfileData => ({
  id: USER_ID,
  email: 'alice@example.com',
  username: 'alice',
  nickname: '小愛',
  role: 'USER',
  birthday: new Date('1990-01-01'),
  avatarUrl: 'https://storage/old-stale-url.jpg',
  avatarKey: 'avatars/user-001.jpg',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

const mockFindUser = {
  findByEmailWithPassword: jest.fn(),
  findByProviderUid: jest.fn(),
  findById: jest.fn(),
  existsByEmail: jest.fn(),
  findByEmailVerifyToken: jest.fn(),
  findProfileById: jest.fn(),
};

const mockFileStorage = {
  upload: jest.fn(),
  getSignedUrl: jest.fn().mockResolvedValue(FRESH_SIGNED_URL),
  delete: jest.fn(),
};

describe('GetUserService', () => {
  let service: GetUserService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileStorage.getSignedUrl.mockResolvedValue(FRESH_SIGNED_URL);
    service = new GetUserService(mockFindUser, mockFileStorage);
  });

  it('成功回傳使用者 profile，avatarUrl 為即時產生的 signed URL', async () => {
    mockFindUser.findProfileById.mockResolvedValue(makeProfile());

    const result = await service.execute({ userId: USER_ID });

    expect(result).toEqual({
      id: USER_ID,
      email: 'alice@example.com',
      username: 'alice',
      nickname: '小愛',
      role: 'USER',
      birthday: new Date('1990-01-01'),
      avatarUrl: FRESH_SIGNED_URL,
      createdAt: new Date('2024-01-01'),
    });
    expect(mockFindUser.findProfileById).toHaveBeenCalledWith(USER_ID);
    expect(mockFileStorage.getSignedUrl).toHaveBeenCalledWith(
      'avatars/user-001.jpg',
    );
  });

  it('email 為 null 時（LINE 使用者）正常回傳，無頭像時 avatarUrl 為 null', async () => {
    mockFindUser.findProfileById.mockResolvedValue(
      makeProfile({ email: null, avatarUrl: null, avatarKey: null }),
    );

    const result = await service.execute({ userId: USER_ID });

    expect(result.email).toBeNull();
    expect(result.avatarUrl).toBeNull();
    expect(mockFileStorage.getSignedUrl).not.toHaveBeenCalled();
  });

  it('找不到使用者時拋出 UserNotFoundException', async () => {
    mockFindUser.findProfileById.mockResolvedValue(null);

    await expect(service.execute({ userId: USER_ID })).rejects.toThrow(
      UserNotFoundException,
    );
  });
});
