import { NotFoundException } from '@nestjs/common';
import { GetUserService } from './GetUserService';
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
  birthday: new Date('1990-01-01'),
  avatarUrl: 'https://storage/avatar.jpg',
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

describe('GetUserService', () => {
  let service: GetUserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GetUserService(mockFindUser);
  });

  it('成功回傳使用者 profile', async () => {
    mockFindUser.findProfileById.mockResolvedValue(makeProfile());

    const result = await service.execute({ userId: USER_ID });

    expect(result).toEqual({
      id: USER_ID,
      email: 'alice@example.com',
      username: 'alice',
      nickname: '小愛',
      role: 'USER',
      birthday: new Date('1990-01-01'),
      avatarUrl: 'https://storage/avatar.jpg',
      createdAt: new Date('2024-01-01'),
    });
    expect(mockFindUser.findProfileById).toHaveBeenCalledWith(USER_ID);
  });

  it('email 為 null 時（LINE 使用者）正常回傳', async () => {
    mockFindUser.findProfileById.mockResolvedValue(
      makeProfile({ email: null, avatarUrl: null, avatarKey: null }),
    );

    const result = await service.execute({ userId: USER_ID });

    expect(result.email).toBeNull();
    expect(result.avatarUrl).toBeNull();
  });

  it('找不到使用者時拋出 NotFoundException', async () => {
    mockFindUser.findProfileById.mockResolvedValue(null);

    await expect(service.execute({ userId: USER_ID })).rejects.toThrow(
      NotFoundException,
    );
  });
});
