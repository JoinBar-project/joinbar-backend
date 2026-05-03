import { ListMessagesService } from './ListMessagesService';
import { EventNotFoundException } from '../../../domain/exception/EventNotFoundException';
import { EventData } from '../../port/out/event/FindEventPort';
import { MessageData } from '../../port/out/event/FindMessagePort';

const EVENT_ID = '00000000-0000-0000-0000-000000000001';

const makeEvent = (overrides: Partial<EventData> = {}): EventData => ({
  id: EVENT_ID,
  name: '測試活動',
  description: null,
  barId: null,
  barName: '測試酒吧',
  location: '台北市',
  startAt: new Date('2024-06-01T18:00:00Z'),
  endAt: new Date('2024-06-01T21:00:00Z'),
  maxPeople: null,
  imageUrl: null,
  price: null,
  hostUser: 'host-1',
  tags: [],
  participantCount: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const makeMessage = (overrides: Partial<MessageData> = {}): MessageData => ({
  id: 'msg-1',
  content: '測試留言',
  userId: 'user-1',
  eventId: EVENT_ID,
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

const mockFindEvent = {
  findById: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  countParticipants: jest.fn(),
};
const mockFindMessage = { findByEventId: jest.fn(), findById: jest.fn() };

describe('ListMessagesService', () => {
  let service: ListMessagesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ListMessagesService(mockFindEvent, mockFindMessage);
  });

  it('成功回傳留言列表', async () => {
    mockFindEvent.findById.mockResolvedValue(makeEvent());
    mockFindMessage.findByEventId.mockResolvedValue([makeMessage()]);

    const result = await service.execute({ eventId: EVENT_ID });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('測試留言');
  });

  it('活動不存在時拋出 EventNotFoundException', async () => {
    mockFindEvent.findById.mockResolvedValue(null);

    await expect(service.execute({ eventId: EVENT_ID })).rejects.toThrow(
      EventNotFoundException,
    );
  });
});
