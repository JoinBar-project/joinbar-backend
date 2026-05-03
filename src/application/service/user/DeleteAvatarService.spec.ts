import { DeleteAvatarService } from './DeleteAvatarService';
import { UserProfileData } from '../../port/out/user/FindUserPort';

const USER_ID = '00000000-0000-0000-0000-000000000001';

const makeProfile = (
  overrides: Partial<UserProfileData> = {},
): UserProfileData => ({
  id: USER_ID,
  email: 'alice@example.com',
  username: 'alice',
  nickname: null,
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

describe('DeleteAvatarService', () => {
  let service: DeleteAvatarService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUser.clearAvatar.mockResolvedValue(undefined);
    mockFileStorage.delete.mockResolvedValue(undefined);
    service = new DeleteAvatarService(
      mockFindUser,
      mockUpdateUser,
      mockFileStorage,
    );
  });

  it('有頭像時刪除 Storage 檔案並清空欄位', async () => {
    mockFindUser.findProfileById.mockResolvedValue(
      makeProfile({ avatarKey: 'avatars/old.jpg', avatarUrl: 'https://old' }),
    );

    await service.execute({ userId: USER_ID });

    expect(mockFileStorage.delete).toHaveBeenCalledWith('avatars/old.jpg');
    expect(mockUpdateUser.clearAvatar).toHaveBeenCalledWith(USER_ID);
  });

  it('沒有頭像時冪等回傳，不呼叫 Storage', async () => {
    mockFindUser.findProfileById.mockResolvedValue(makeProfile());

    await service.execute({ userId: USER_ID });

    expect(mockFileStorage.delete).not.toHaveBeenCalled();
    expect(mockUpdateUser.clearAvatar).not.toHaveBeenCalled();
  });
});
