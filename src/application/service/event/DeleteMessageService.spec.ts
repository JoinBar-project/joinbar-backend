import { DeleteMessageService } from './DeleteMessageService';
import { MessageNotFoundException } from '../../../domain/exception/MessageNotFoundException';
import { ForbiddenOperationException } from '../../../domain/exception/ForbiddenOperationException';
import { MessageData } from '../../port/out/event/FindMessagePort';

const EVENT_ID = '00000000-0000-0000-0000-000000000001';
const MESSAGE_ID = 'msg-1';
const AUTHOR_ID = 'user-1';
const OTHER_ID = 'user-2';

const makeMessage = (overrides: Partial<MessageData> = {}): MessageData => ({
  id: MESSAGE_ID,
  content: '測試留言',
  userId: AUTHOR_ID,
  eventId: EVENT_ID,
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

const mockFindMessage = { findByEventId: jest.fn(), findById: jest.fn() };
const mockSaveMessage = { create: jest.fn(), softDelete: jest.fn() };

describe('DeleteMessageService', () => {
  let service: DeleteMessageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeleteMessageService(mockFindMessage, mockSaveMessage);
  });

  it('留言本人可成功刪除', async () => {
    mockFindMessage.findById.mockResolvedValue(makeMessage());

    await service.execute({
      eventId: EVENT_ID,
      messageId: MESSAGE_ID,
      actorId: AUTHOR_ID,
      actorRole: 'USER',
    });

    expect(mockSaveMessage.softDelete).toHaveBeenCalledWith(MESSAGE_ID);
  });

  it('ADMIN 可刪除非本人的留言', async () => {
    mockFindMessage.findById.mockResolvedValue(makeMessage());

    await expect(
      service.execute({
        eventId: EVENT_ID,
        messageId: MESSAGE_ID,
        actorId: OTHER_ID,
        actorRole: 'ADMIN',
      }),
    ).resolves.toBeUndefined();
  });

  it('非本人、非 ADMIN 拋出 ForbiddenOperationException', async () => {
    mockFindMessage.findById.mockResolvedValue(makeMessage());

    await expect(
      service.execute({
        eventId: EVENT_ID,
        messageId: MESSAGE_ID,
        actorId: OTHER_ID,
        actorRole: 'USER',
      }),
    ).rejects.toThrow(ForbiddenOperationException);
  });

  it('留言不存在時拋出 MessageNotFoundException', async () => {
    mockFindMessage.findById.mockResolvedValue(null);

    await expect(
      service.execute({
        eventId: EVENT_ID,
        messageId: MESSAGE_ID,
        actorId: AUTHOR_ID,
        actorRole: 'USER',
      }),
    ).rejects.toThrow(MessageNotFoundException);
  });
});
