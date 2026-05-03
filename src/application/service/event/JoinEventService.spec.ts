import { JoinEventService } from './JoinEventService';
import { EventNotFoundException } from '../../../domain/exception/EventNotFoundException';
import { EventFullException } from '../../../domain/exception/EventFullException';
import { AlreadyJoinedException } from '../../../domain/exception/AlreadyJoinedException';
import { EventData } from '../../port/out/event/FindEventPort';

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
  maxPeople: 10,
  imageUrl: null,
  price: null,
  hostUser: 'host-1',
  tags: [],
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
const mockFindParticipation = { findByUserAndEvent: jest.fn() };
const mockSaveParticipation = {
  create: jest.fn(),
  createWithCapacityCheck: jest.fn(),
  delete: jest.fn(),
};

describe('JoinEventService', () => {
  let service: JoinEventService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new JoinEventService(
      mockFindEvent,
      mockFindParticipation,
      mockSaveParticipation,
    );
  });

  it('有人數上限時透過 createWithCapacityCheck 報名', async () => {
    mockFindEvent.findById.mockResolvedValue(makeEvent({ maxPeople: 10 }));
    mockFindParticipation.findByUserAndEvent.mockResolvedValue(null);
    mockSaveParticipation.createWithCapacityCheck.mockResolvedValue(undefined);

    await service.execute({ eventId: EVENT_ID, userId: USER_ID });

    expect(mockSaveParticipation.createWithCapacityCheck).toHaveBeenCalledWith(
      USER_ID,
      EVENT_ID,
      10,
    );
    expect(mockFindEvent.countParticipants).not.toHaveBeenCalled();
  });

  it('活動不存在時拋出 EventNotFoundException', async () => {
    mockFindEvent.findById.mockResolvedValue(null);

    await expect(
      service.execute({ eventId: EVENT_ID, userId: USER_ID }),
    ).rejects.toThrow(EventNotFoundException);
  });

  it('已報名時拋出 AlreadyJoinedException', async () => {
    mockFindEvent.findById.mockResolvedValue(makeEvent());
    mockFindParticipation.findByUserAndEvent.mockResolvedValue({ id: 'p-1' });

    await expect(
      service.execute({ eventId: EVENT_ID, userId: USER_ID }),
    ).rejects.toThrow(AlreadyJoinedException);
  });

  it('達人數上限時拋出 EventFullException', async () => {
    mockFindEvent.findById.mockResolvedValue(makeEvent({ maxPeople: 5 }));
    mockFindParticipation.findByUserAndEvent.mockResolvedValue(null);
    mockSaveParticipation.createWithCapacityCheck.mockRejectedValue(
      new EventFullException(),
    );

    await expect(
      service.execute({ eventId: EVENT_ID, userId: USER_ID }),
    ).rejects.toThrow(EventFullException);
  });

  it('maxPeople 為 null 時不限制人數，直接呼叫 create', async () => {
    mockFindEvent.findById.mockResolvedValue(makeEvent({ maxPeople: null }));
    mockFindParticipation.findByUserAndEvent.mockResolvedValue(null);
    mockSaveParticipation.create.mockResolvedValue(undefined);

    await service.execute({ eventId: EVENT_ID, userId: USER_ID });

    expect(mockFindEvent.countParticipants).not.toHaveBeenCalled();
    expect(
      mockSaveParticipation.createWithCapacityCheck,
    ).not.toHaveBeenCalled();
    expect(mockSaveParticipation.create).toHaveBeenCalledWith(
      USER_ID,
      EVENT_ID,
    );
  });
});
