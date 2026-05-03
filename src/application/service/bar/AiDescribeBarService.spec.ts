import { ServiceUnavailableException } from '@nestjs/common';
import { AiDescribeBarService } from './AiDescribeBarService';
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
const mockGemini = { generate: jest.fn() };
const mockFeatureFlag = { isEnabled: jest.fn() };

describe('AiDescribeBarService', () => {
  let service: AiDescribeBarService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AiDescribeBarService(
      mockFindBar,
      mockGemini,
      mockFeatureFlag as never,
    );
  });

  it('geminiEnabled=true，成功呼叫 Gemini 並回傳描述', async () => {
    mockFeatureFlag.isEnabled.mockReturnValue(true);
    mockFindBar.findById.mockResolvedValue(makeBar());
    mockGemini.generate.mockResolvedValue('這是一間充滿活力的運動酒吧');

    const result = await service.execute({ barId: BAR_ID });

    expect(result.description).toBe('這是一間充滿活力的運動酒吧');
    expect(mockGemini.generate).toHaveBeenCalledWith(
      expect.stringContaining('測試酒吧'),
    );
  });

  it('geminiEnabled=false 時拋出 ServiceUnavailableException', async () => {
    mockFeatureFlag.isEnabled.mockReturnValue(false);

    await expect(service.execute({ barId: BAR_ID })).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(mockGemini.generate).not.toHaveBeenCalled();
  });

  it('酒吧不存在時拋出 BarNotFoundException', async () => {
    mockFeatureFlag.isEnabled.mockReturnValue(true);
    mockFindBar.findById.mockResolvedValue(null);

    await expect(service.execute({ barId: BAR_ID })).rejects.toThrow(
      BarNotFoundException,
    );
  });

  it('Gemini API 失敗時拋出 ServiceUnavailableException', async () => {
    mockFeatureFlag.isEnabled.mockReturnValue(true);
    mockFindBar.findById.mockResolvedValue(makeBar());
    mockGemini.generate.mockRejectedValue(new Error('API timeout'));

    await expect(service.execute({ barId: BAR_ID })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
