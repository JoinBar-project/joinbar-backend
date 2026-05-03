import { DeleteBarService } from './DeleteBarService';
import { BarNotFoundException } from '../../../domain/exception/BarNotFoundException';
import { BarData } from '../../port/out/bar/FindBarPort';

const BAR_ID = '00000000-0000-0000-0000-000000000001';

const makeBar = (overrides: Partial<BarData> = {}): BarData => ({
  id: BAR_ID,
  name: '測試酒吧',
  address: null,
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

describe('DeleteBarService', () => {
  let service: DeleteBarService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeleteBarService(mockFindBar, mockSaveBar);
  });

  it('酒吧存在時執行軟刪除', async () => {
    mockFindBar.findById.mockResolvedValue(makeBar());

    await service.execute({ barId: BAR_ID });

    expect(mockSaveBar.softDelete).toHaveBeenCalledWith(BAR_ID);
  });

  it('酒吧不存在時拋出 BarNotFoundException', async () => {
    mockFindBar.findById.mockResolvedValue(null);

    await expect(service.execute({ barId: BAR_ID })).rejects.toThrow(
      BarNotFoundException,
    );
    expect(mockSaveBar.softDelete).not.toHaveBeenCalled();
  });
});
