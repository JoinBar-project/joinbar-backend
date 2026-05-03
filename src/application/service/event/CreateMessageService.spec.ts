import { CreateMessageService } from './CreateMessageService';
import { EventNotFoundException } from '../../../domain/exception/EventNotFoundException';
import { EventData } from '../../port/out/event/FindEventPort';
import { MessageData } from '../../port/out/event/FindMessagePort';

const EVENT_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = 'user-1';

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
  userId: USER_ID,
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
const mockSaveMessage = { create: jest.fn(), softDelete: jest.fn() };

describe('CreateMessageService', () => {
  let service: CreateMessageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CreateMessageService(mockFindEvent, mockSaveMessage);
  });

  it('成功建立留言並回傳', async () => {
    mockFindEvent.findById.mockResolvedValue(makeEvent());
    mockSaveMessage.create.mockResolvedValue(makeMessage());

    const result = await service.execute({
      eventId: EVENT_ID,
      userId: USER_ID,
      content: '測試留言',
    });

    expect(result.id).toBe('msg-1');
    expect(result.content).toBe('測試留言');
    expect(mockSaveMessage.create).toHaveBeenCalledWith(
      USER_ID,
      EVENT_ID,
      '測試留言',
    );
  });

  it('活動不存在時拋出 EventNotFoundException', async () => {
    mockFindEvent.findById.mockResolvedValue(null);

    await expect(
      service.execute({ eventId: EVENT_ID, userId: USER_ID, content: '留言' }),
    ).rejects.toThrow(EventNotFoundException);
  });
});
