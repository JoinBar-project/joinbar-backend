import { GetBarService } from './GetBarService';
import { BarNotFoundException } from '../../../domain/exception/BarNotFoundException';
import { BarData } from '../../port/out/bar/FindBarPort';

const BAR_ID = '00000000-0000-0000-0000-000000000001';

const makeBar = (overrides: Partial<BarData> = {}): BarData => ({
  id: BAR_ID,
  name: '測試酒吧',
  address: '台北市信義區',
  phone: null,
  website: null,
  imageUrl: null,
  latitude: null,
  longitude: null,
  googlePlaceId: 'ChIJ_place_id',
  barTag: {
    sport: true,
    music: true,
    student: false,
    bistro: false,
    drink: false,
    joy: false,
    romantic: false,
    oldschool: false,
    highlevel: false,
    easy: false,
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const mockFindBar = {
  findById: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
};

describe('GetBarService', () => {
  let service: GetBarService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GetBarService(mockFindBar);
  });

  it('成功回傳酒吧詳情，tags 轉換為字串陣列', async () => {
    mockFindBar.findById.mockResolvedValue(makeBar());

    const result = await service.execute({ barId: BAR_ID });

    expect(result.id).toBe(BAR_ID);
    expect(result.tags).toEqual(['sport', 'music']);
    expect(mockFindBar.findById).toHaveBeenCalledWith(BAR_ID);
  });

  it('找不到酒吧時拋出 BarNotFoundException', async () => {
    mockFindBar.findById.mockResolvedValue(null);

    await expect(service.execute({ barId: BAR_ID })).rejects.toThrow(
      BarNotFoundException,
    );
  });
});
