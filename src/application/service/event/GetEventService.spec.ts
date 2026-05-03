import { GetEventService } from './GetEventService';
import { EventNotFoundException } from '../../../domain/exception/EventNotFoundException';
import { EventData } from '../../port/out/event/FindEventPort';

const EVENT_ID = '00000000-0000-0000-0000-000000000001';

const makeEvent = (overrides: Partial<EventData> = {}): EventData => ({
  id: EVENT_ID,
  name: '測試活動',
  description: '活動描述',
  barId: 'bar-1',
  barName: '測試酒吧',
  location: '台北市信義區',
  startAt: new Date('2024-06-01T18:00:00Z'),
  endAt: new Date('2024-06-01T21:00:00Z'),
  maxPeople: 20,
  imageUrl: null,
  price: 100,
  hostUser: 'user-1',
  tags: ['music'],
  participantCount: 3,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const mockFindEvent = {
  findById: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  countParticipants: jest.fn(),
};

describe('GetEventService', () => {
  let service: GetEventService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GetEventService(mockFindEvent);
  });

  it('成功回傳活動詳情', async () => {
    mockFindEvent.findById.mockResolvedValue(makeEvent());

    const result = await service.execute({ eventId: EVENT_ID });

    expect(result.id).toBe(EVENT_ID);
    expect(result.tags).toEqual(['music']);
    expect(result.participantCount).toBe(3);
    expect(mockFindEvent.findById).toHaveBeenCalledWith(EVENT_ID);
  });

  it('活動不存在時拋出 EventNotFoundException', async () => {
    mockFindEvent.findById.mockResolvedValue(null);

    await expect(service.execute({ eventId: EVENT_ID })).rejects.toThrow(
      EventNotFoundException,
    );
  });
});
