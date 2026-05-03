import { UpdateUserService } from './UpdateUserService';
import { UserProfileData } from '../../port/out/user/FindUserPort';

const USER_ID = '00000000-0000-0000-0000-000000000001';

const makeProfile = (
  overrides: Partial<UserProfileData> = {},
): UserProfileData => ({
  id: USER_ID,
  email: 'alice@example.com',
  username: 'alice',
  nickname: '小愛',
  role: 'USER',
  birthday: null,
  avatarUrl: null,
  avatarKey: null,
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

const mockUpdateUser = {
  updateProfile: jest.fn(),
  softDelete: jest.fn(),
  updateAvatar: jest.fn(),
  clearAvatar: jest.fn(),
};

const mockFileStorage = {
  upload: jest.fn(),
  getSignedUrl: jest.fn(),
  delete: jest.fn(),
};

describe('UpdateUserService', () => {
  let service: UpdateUserService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUser.updateProfile.mockResolvedValue(undefined);
    service = new UpdateUserService(
      mockFindUser,
      mockUpdateUser,
      mockFileStorage,
    );
  });

  it('成功更新 username 後回傳更新後 profile', async () => {
    mockFindUser.findProfileById.mockResolvedValue(
      makeProfile({ username: 'bob' }),
    );

    const result = await service.execute({
      userId: USER_ID,
      username: 'bob',
    });

    expect(mockUpdateUser.updateProfile).toHaveBeenCalledWith(USER_ID, {
      username: 'bob',
    });
    expect(result.username).toBe('bob');
  });

  it('可更新 birthday', async () => {
    const birthday = new Date('1995-06-15');
    mockFindUser.findProfileById.mockResolvedValue(makeProfile({ birthday }));

    const result = await service.execute({ userId: USER_ID, birthday });

    expect(mockUpdateUser.updateProfile).toHaveBeenCalledWith(USER_ID, {
      birthday,
    });
    expect(result.birthday).toEqual(birthday);
  });

  it('有頭像時 avatarUrl 為即時產生的 signed URL', async () => {
    const SIGNED_URL = 'https://storage.googleapis.com/signed/avatar.jpg';
    mockFindUser.findProfileById.mockResolvedValue(
      makeProfile({ avatarKey: 'avatars/user-001.jpg' }),
    );
    mockFileStorage.getSignedUrl.mockResolvedValue(SIGNED_URL);

    const result = await service.execute({ userId: USER_ID, nickname: 'test' });

    expect(mockFileStorage.getSignedUrl).toHaveBeenCalledWith(
      'avatars/user-001.jpg',
    );
    expect(result.avatarUrl).toBe(SIGNED_URL);
  });
});
