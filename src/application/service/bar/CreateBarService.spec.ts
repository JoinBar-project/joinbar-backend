import { CreateBarService } from './CreateBarService';
import { BarNotFoundException } from '../../../domain/exception/BarNotFoundException';
import { BarData } from '../../port/out/bar/FindBarPort';

const BAR_ID = '00000000-0000-0000-0000-000000000001';

const makeBar = (overrides: Partial<BarData> = {}): BarData => ({
  id: BAR_ID,
  name: '新酒吧',
  address: '台北市',
  phone: null,
  website: null,
  imageUrl: null,
  latitude: null,
  longitude: null,
  googlePlaceId: null,
  barTag: {
    sport: true,
    music: false,
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
const mockSaveBar = {
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

describe('CreateBarService', () => {
  let service: CreateBarService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CreateBarService(mockFindBar, mockSaveBar);
  });

  it('建立酒吧後回傳完整資料（含 tags）', async () => {
    mockSaveBar.create.mockResolvedValue(BAR_ID);
    mockFindBar.findById.mockResolvedValue(makeBar());

    const result = await service.execute({
      name: '新酒吧',
      tags: { sport: true },
    });

    expect(result.id).toBe(BAR_ID);
    expect(result.tags).toContain('sport');
    expect(mockSaveBar.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: '新酒吧' }),
    );
  });

  it('建立後查不到記錄時拋出 BarNotFoundException', async () => {
    mockSaveBar.create.mockResolvedValue(BAR_ID);
    mockFindBar.findById.mockResolvedValue(null);

    await expect(service.execute({ name: '新酒吧' })).rejects.toThrow(
      BarNotFoundException,
    );
  });
});
