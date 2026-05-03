import { DeleteEventService } from './DeleteEventService';
import { EventNotFoundException } from '../../../domain/exception/EventNotFoundException';
import { ForbiddenOperationException } from '../../../domain/exception/ForbiddenOperationException';
import { EventData } from '../../port/out/event/FindEventPort';

const EVENT_ID = '00000000-0000-0000-0000-000000000001';
const HOST_ID = 'host-user-1';
const OTHER_ID = 'other-user-2';

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
  hostUser: HOST_ID,
  tags: [],
  participantCount: 0,
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
const mockSaveEvent = {
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

describe('DeleteEventService', () => {
  let service: DeleteEventService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeleteEventService(mockFindEvent, mockSaveEvent);
  });

  it('主辦人可成功刪除活動', async () => {
    mockFindEvent.findById.mockResolvedValue(makeEvent());

    await service.execute({
      eventId: EVENT_ID,
      actorId: HOST_ID,
      actorRole: 'USER',
    });

    expect(mockSaveEvent.softDelete).toHaveBeenCalledWith(EVENT_ID);
  });

  it('ADMIN 可刪除非自己主辦的活動', async () => {
    mockFindEvent.findById.mockResolvedValue(makeEvent());

    await expect(
      service.execute({
        eventId: EVENT_ID,
        actorId: OTHER_ID,
        actorRole: 'ADMIN',
      }),
    ).resolves.toBeUndefined();
  });

  it('非主辦人、非 ADMIN 拋出 ForbiddenOperationException', async () => {
    mockFindEvent.findById.mockResolvedValue(makeEvent());

    await expect(
      service.execute({
        eventId: EVENT_ID,
        actorId: OTHER_ID,
        actorRole: 'USER',
      }),
    ).rejects.toThrow(ForbiddenOperationException);
  });

  it('活動不存在時拋出 EventNotFoundException', async () => {
    mockFindEvent.findById.mockResolvedValue(null);

    await expect(
      service.execute({
        eventId: EVENT_ID,
        actorId: HOST_ID,
        actorRole: 'USER',
      }),
    ).rejects.toThrow(EventNotFoundException);
  });
});
