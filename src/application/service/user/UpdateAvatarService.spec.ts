import { UpdateAvatarService } from './UpdateAvatarService';
import { UserProfileData } from '../../port/out/user/FindUserPort';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const SIGNED_URL = 'https://storage.googleapis.com/signed/avatar.jpg';

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

describe('UpdateAvatarService', () => {
  let service: UpdateAvatarService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileStorage.upload.mockResolvedValue(undefined);
    mockFileStorage.getSignedUrl.mockResolvedValue(SIGNED_URL);
    mockUpdateUser.updateAvatar.mockResolvedValue(undefined);
    service = new UpdateAvatarService(
      mockFindUser,
      mockUpdateUser,
      mockFileStorage,
    );
  });

  it('無舊頭像時直接上傳並回傳 signed URL', async () => {
    mockFindUser.findProfileById.mockResolvedValue(makeProfile());

    const result = await service.execute({
      userId: USER_ID,
      fileBuffer: Buffer.from('img'),
      mimeType: 'image/jpeg',
      originalName: 'photo.jpg',
    });

    expect(mockFileStorage.delete).not.toHaveBeenCalled();
    expect(mockFileStorage.upload).toHaveBeenCalledTimes(1);
    expect(mockUpdateUser.updateAvatar).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ avatarUrl: SIGNED_URL }),
    );
    expect(result.avatarUrl).toBe(SIGNED_URL);
  });

  it('有舊頭像時先上傳新檔、更新 DB，再刪除舊檔', async () => {
    const order: string[] = [];
    mockFindUser.findProfileById.mockResolvedValue(
      makeProfile({ avatarKey: 'avatars/old.jpg', avatarUrl: 'https://old' }),
    );
    mockFileStorage.upload.mockImplementation(async () => {
      order.push('upload');
    });
    mockUpdateUser.updateAvatar.mockImplementation(async () => {
      order.push('updateAvatar');
    });
    mockFileStorage.delete.mockImplementation(async () => {
      order.push('delete');
    });

    await service.execute({
      userId: USER_ID,
      fileBuffer: Buffer.from('img'),
      mimeType: 'image/png',
      originalName: 'new.png',
    });

    expect(order).toEqual(['upload', 'updateAvatar', 'delete']);
    expect(mockFileStorage.delete).toHaveBeenCalledWith('avatars/old.jpg');
  });

  it('產生的 avatarKey 以 avatars/{userId}/ 開頭', async () => {
    mockFindUser.findProfileById.mockResolvedValue(makeProfile());

    await service.execute({
      userId: USER_ID,
      fileBuffer: Buffer.from('img'),
      mimeType: 'image/jpeg',
      originalName: 'test.jpg',
    });

    const uploadCall = mockFileStorage.upload.mock.calls[0][0];
    expect(uploadCall.key).toMatch(new RegExp(`^avatars/${USER_ID}/`));
  });

  it('無副檔名的檔名使用 bin 作為副檔名', async () => {
    mockFindUser.findProfileById.mockResolvedValue(makeProfile());

    await service.execute({
      userId: USER_ID,
      fileBuffer: Buffer.from('img'),
      mimeType: 'image/jpeg',
      originalName: 'avatar',
    });

    const uploadCall = mockFileStorage.upload.mock.calls[0][0];
    expect(uploadCall.key).toMatch(/\.bin$/);
  });
});
