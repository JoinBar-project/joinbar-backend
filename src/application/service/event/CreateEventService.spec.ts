import { CreateEventService } from './CreateEventService';
import { InvalidTagException } from '../../../domain/exception/InvalidTagException';
import { EventData } from '../../port/out/event/FindEventPort';

const EVENT_ID = '00000000-0000-0000-0000-000000000001';
const TAG_ID = 'tag-1';

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
  hostUser: 'user-1',
  tags: ['music'],
  participantCount: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const mockSaveEvent = {
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};
const mockFindTag = { findAll: jest.fn(), findByNames: jest.fn() };

describe('CreateEventService', () => {
  let service: CreateEventService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CreateEventService(mockSaveEvent, mockFindTag);
  });

  it('無 tags 時直接建立並回傳活動', async () => {
    mockSaveEvent.create.mockResolvedValue(makeEvent({ tags: [] }));

    const result = await service.execute({
      name: '測試活動',
      barName: '測試酒吧',
      location: '台北市',
      startAt: new Date('2024-06-01T18:00:00Z'),
      endAt: new Date('2024-06-01T21:00:00Z'),
      hostUser: 'user-1',
    });

    expect(result.id).toBe(EVENT_ID);
    expect(mockFindTag.findByNames).not.toHaveBeenCalled();
  });

  it('tags 存在時解析 tagId 並傳給 saveEvent.create', async () => {
    mockFindTag.findByNames.mockResolvedValue([{ id: TAG_ID, name: 'music' }]);
    mockSaveEvent.create.mockResolvedValue(makeEvent());

    await service.execute({
      name: '測試活動',
      barName: '測試酒吧',
      location: '台北市',
      startAt: new Date(),
      endAt: new Date(),
      hostUser: 'user-1',
      tags: ['music'],
    });

    expect(mockSaveEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ tagIds: [TAG_ID] }),
    );
  });

  it('包含無效標籤名稱時拋出 InvalidTagException', async () => {
    mockFindTag.findByNames.mockResolvedValue([]);

    await expect(
      service.execute({
        name: '測試活動',
        barName: '測試酒吧',
        location: '台北市',
        startAt: new Date(),
        endAt: new Date(),
        hostUser: 'user-1',
        tags: ['invalid-tag'],
      }),
    ).rejects.toThrow(InvalidTagException);
  });
});
