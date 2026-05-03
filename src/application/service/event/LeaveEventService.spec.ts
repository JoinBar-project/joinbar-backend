import { LeaveEventService } from './LeaveEventService';
import { ParticipationNotFoundException } from '../../../domain/exception/ParticipationNotFoundException';

const EVENT_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = 'user-1';

const mockFindParticipation = { findByUserAndEvent: jest.fn() };
const mockSaveParticipation = {
  create: jest.fn(),
  createWithCapacityCheck: jest.fn(),
  delete: jest.fn(),
};

describe('LeaveEventService', () => {
  let service: LeaveEventService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeaveEventService(
      mockFindParticipation,
      mockSaveParticipation,
    );
  });

  it('成功退出活動', async () => {
    mockFindParticipation.findByUserAndEvent.mockResolvedValue({ id: 'p-1' });

    await service.execute({ eventId: EVENT_ID, userId: USER_ID });

    expect(mockSaveParticipation.delete).toHaveBeenCalledWith(
      USER_ID,
      EVENT_ID,
    );
  });

  it('未報名時拋出 ParticipationNotFoundException', async () => {
    mockFindParticipation.findByUserAndEvent.mockResolvedValue(null);

    await expect(
      service.execute({ eventId: EVENT_ID, userId: USER_ID }),
    ).rejects.toThrow(ParticipationNotFoundException);
  });
});
