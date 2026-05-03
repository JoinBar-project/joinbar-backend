import { DeleteUserService } from './DeleteUserService';

const USER_ID = '00000000-0000-0000-0000-000000000001';

const mockUpdateUser = {
  updateProfile: jest.fn(),
  softDelete: jest.fn(),
  updateAvatar: jest.fn(),
  clearAvatar: jest.fn(),
};

const mockClearUserContext = {
  clearUserContext: jest.fn(),
};

describe('DeleteUserService', () => {
  let service: DeleteUserService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUser.softDelete.mockResolvedValue(undefined);
    mockClearUserContext.clearUserContext.mockResolvedValue(undefined);
    service = new DeleteUserService(mockUpdateUser, mockClearUserContext);
  });

  it('成功軟刪除並清除 UserContext 快取', async () => {
    await service.execute({ userId: USER_ID });

    expect(mockUpdateUser.softDelete).toHaveBeenCalledWith(USER_ID);
    expect(mockClearUserContext.clearUserContext).toHaveBeenCalledWith(USER_ID);
  });

  it('softDelete 的呼叫順序在 clearUserContext 之前', async () => {
    const order: string[] = [];
    mockUpdateUser.softDelete.mockImplementation(async () => {
      order.push('softDelete');
    });
    mockClearUserContext.clearUserContext.mockImplementation(async () => {
      order.push('clearUserContext');
    });

    await service.execute({ userId: USER_ID });

    expect(order).toEqual(['softDelete', 'clearUserContext']);
  });
});
