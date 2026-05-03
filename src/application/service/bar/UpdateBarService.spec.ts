import { UpdateBarService } from './UpdateBarService';
import { BarNotFoundException } from '../../../domain/exception/BarNotFoundException';
import { BarData } from '../../port/out/bar/FindBarPort';

const BAR_ID = '00000000-0000-0000-0000-000000000001';

const makeBar = (overrides: Partial<BarData> = {}): BarData => ({
  id: BAR_ID,
  name: '原本酒吧',
  address: '台北市',
  phone: null,
  website: null,
  imageUrl: null,
  latitude: null,
  longitude: null,
  googlePlaceId: null,
  barTag: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const mockFindBar = {
  findById: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
};
const mockSaveBar = {
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

describe('UpdateBarService', () => {
  let service: UpdateBarService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UpdateBarService(mockFindBar, mockSaveBar);
  });

  it('成功更新並回傳更新後資料', async () => {
    mockFindBar.findById.mockResolvedValueOnce(makeBar());
    mockSaveBar.update.mockResolvedValueOnce(makeBar({ name: '新名稱' }));

    const result = await service.execute({ barId: BAR_ID, name: '新名稱' });

    expect(result.name).toBe('新名稱');
    expect(mockSaveBar.update).toHaveBeenCalledWith(
      BAR_ID,
      expect.objectContaining({ name: '新名稱' }),
    );
  });

  it('酒吧不存在時拋出 BarNotFoundException', async () => {
    mockFindBar.findById.mockResolvedValue(null);

    await expect(
      service.execute({ barId: BAR_ID, name: '新名稱' }),
    ).rejects.toThrow(BarNotFoundException);
  });
});
