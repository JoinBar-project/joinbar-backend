import { ListEventsService } from './ListEventsService';
import { EventData } from '../../port/out/event/FindEventPort';

const EVENT_ID = '00000000-0000-0000-0000-000000000001';

const makeEvent = (overrides: Partial<EventData> = {}): EventData => ({
  id: EVENT_ID,
  name: '測試活動',
  description: null,
  barId: null,
  barName: '測試酒吧',
  location: '台北市信義區',
  startAt: new Date('2024-06-01T18:00:00Z'),
  endAt: new Date('2024-06-01T21:00:00Z'),
  maxPeople: 20,
  imageUrl: null,
  price: null,
  hostUser: 'user-1',
  tags: ['music', 'sport'],
  participantCount: 5,
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

describe('ListEventsService', () => {
  let service: ListEventsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ListEventsService(mockFindEvent);
  });

  it('無篩選條件，回傳分頁列表與 meta', async () => {
    mockFindEvent.findMany.mockResolvedValue([makeEvent()]);
    mockFindEvent.count.mockResolvedValue(1);

    const result = await service.execute({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0].tags).toEqual(['music', 'sport']);
    expect(result.meta.total).toBe(1);
  });

  it('無結果時回傳空陣列', async () => {
    mockFindEvent.findMany.mockResolvedValue([]);
    mockFindEvent.count.mockResolvedValue(0);

    const result = await service.execute({ keyword: '不存在' });

    expect(result.items).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('帶篩選條件時正確傳遞給 findEvent', async () => {
    mockFindEvent.findMany.mockResolvedValue([]);
    mockFindEvent.count.mockResolvedValue(0);
    const startFrom = new Date('2024-01-01');

    await service.execute({ keyword: '台北', tags: ['music'], startFrom });

    expect(mockFindEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: '台北', tags: ['music'], startFrom }),
    );
  });
});
