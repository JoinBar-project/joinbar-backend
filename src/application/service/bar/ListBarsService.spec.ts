import { ListBarsService } from './ListBarsService';
import { BarData } from '../../port/out/bar/FindBarPort';

const BAR_ID = '00000000-0000-0000-0000-000000000001';

const makeBar = (overrides: Partial<BarData> = {}): BarData => ({
  id: BAR_ID,
  name: '測試酒吧',
  address: '台北市信義區',
  phone: '02-1234-5678',
  website: null,
  imageUrl: null,
  latitude: 25.033,
  longitude: 121.565,
  googlePlaceId: null,
  barTag: {
    sport: true,
    music: false,
    student: false,
    bistro: false,
    drink: true,
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

describe('ListBarsService', () => {
  let service: ListBarsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ListBarsService(mockFindBar);
  });

  it('無篩選條件，回傳分頁列表與 meta', async () => {
    mockFindBar.findMany.mockResolvedValue([makeBar()]);
    mockFindBar.count.mockResolvedValue(1);

    const result = await service.execute({ page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].tags).toEqual(['sport', 'drink']);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
  });

  it('無結果時回傳空陣列', async () => {
    mockFindBar.findMany.mockResolvedValue([]);
    mockFindBar.count.mockResolvedValue(0);

    const result = await service.execute({ keyword: '不存在' });

    expect(result.items).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('帶 keyword 與 tags 時正確傳遞給 findBar', async () => {
    mockFindBar.findMany.mockResolvedValue([]);
    mockFindBar.count.mockResolvedValue(0);

    await service.execute({ keyword: '台北', tags: ['sport', 'music'] });

    expect(mockFindBar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: '台北', tags: ['sport', 'music'] }),
    );
  });

  it('無 barTag 時 tags 為空陣列', async () => {
    mockFindBar.findMany.mockResolvedValue([makeBar({ barTag: null })]);
    mockFindBar.count.mockResolvedValue(1);

    const result = await service.execute({});

    expect(result.items[0].tags).toEqual([]);
  });
});
