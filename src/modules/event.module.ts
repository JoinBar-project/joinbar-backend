import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { JwtModule } from './jwt.module';
import { EventController } from '../adapter/in/web/event/EventController';
import { EventFacade } from '../application/facade/EventFacade';
import { ListEventsService } from '../application/service/event/ListEventsService';
import { GetEventService } from '../application/service/event/GetEventService';
import { CreateEventService } from '../application/service/event/CreateEventService';
import { UpdateEventService } from '../application/service/event/UpdateEventService';
import { DeleteEventService } from '../application/service/event/DeleteEventService';
import { JoinEventService } from '../application/service/event/JoinEventService';
import { LeaveEventService } from '../application/service/event/LeaveEventService';
import { ListMessagesService } from '../application/service/event/ListMessagesService';
import { CreateMessageService } from '../application/service/event/CreateMessageService';
import { DeleteMessageService } from '../application/service/event/DeleteMessageService';
import { ListTagsService } from '../application/service/event/ListTagsService';
import { PrismaEventRepository } from '../adapter/out/persistence/event/PrismaEventRepository';
import { PrismaTagRepository } from '../adapter/out/persistence/event/PrismaTagRepository';
import { PrismaParticipationRepository } from '../adapter/out/persistence/event/PrismaParticipationRepository';
import { PrismaMessageRepository } from '../adapter/out/persistence/event/PrismaMessageRepository';
import { LIST_EVENTS_USE_CASE } from '../application/port/in/event/ListEventsUseCase';
import { GET_EVENT_USE_CASE } from '../application/port/in/event/GetEventUseCase';
import { CREATE_EVENT_USE_CASE } from '../application/port/in/event/CreateEventUseCase';
import { UPDATE_EVENT_USE_CASE } from '../application/port/in/event/UpdateEventUseCase';
import { DELETE_EVENT_USE_CASE } from '../application/port/in/event/DeleteEventUseCase';
import { JOIN_EVENT_USE_CASE } from '../application/port/in/event/JoinEventUseCase';
import { LEAVE_EVENT_USE_CASE } from '../application/port/in/event/LeaveEventUseCase';
import { LIST_MESSAGES_USE_CASE } from '../application/port/in/event/ListMessagesUseCase';
import { CREATE_MESSAGE_USE_CASE } from '../application/port/in/event/CreateMessageUseCase';
import { DELETE_MESSAGE_USE_CASE } from '../application/port/in/event/DeleteMessageUseCase';
import { LIST_TAGS_USE_CASE } from '../application/port/in/event/ListTagsUseCase';
import { FIND_EVENT_PORT } from '../application/port/out/event/FindEventPort';
import { SAVE_EVENT_PORT } from '../application/port/out/event/SaveEventPort';
import { FIND_TAG_PORT } from '../application/port/out/event/FindTagPort';
import { FIND_PARTICIPATION_PORT } from '../application/port/out/event/FindParticipationPort';
import { SAVE_PARTICIPATION_PORT } from '../application/port/out/event/SaveParticipationPort';
import { FIND_MESSAGE_PORT } from '../application/port/out/event/FindMessagePort';
import { SAVE_MESSAGE_PORT } from '../application/port/out/event/SaveMessagePort';

@Module({
  imports: [AuthModule, JwtModule],
  controllers: [EventController],
  providers: [
    // ─── Persistence Adapters ─────────────────────────────────────────
    PrismaEventRepository,
    { provide: FIND_EVENT_PORT, useExisting: PrismaEventRepository },
    { provide: SAVE_EVENT_PORT, useExisting: PrismaEventRepository },
    PrismaTagRepository,
    { provide: FIND_TAG_PORT, useExisting: PrismaTagRepository },
    PrismaParticipationRepository,
    {
      provide: FIND_PARTICIPATION_PORT,
      useExisting: PrismaParticipationRepository,
    },
    {
      provide: SAVE_PARTICIPATION_PORT,
      useExisting: PrismaParticipationRepository,
    },
    PrismaMessageRepository,
    { provide: FIND_MESSAGE_PORT, useExisting: PrismaMessageRepository },
    { provide: SAVE_MESSAGE_PORT, useExisting: PrismaMessageRepository },
    // ─── Application Services ─────────────────────────────────────────
    ListEventsService,
    { provide: LIST_EVENTS_USE_CASE, useExisting: ListEventsService },
    GetEventService,
    { provide: GET_EVENT_USE_CASE, useExisting: GetEventService },
    CreateEventService,
    { provide: CREATE_EVENT_USE_CASE, useExisting: CreateEventService },
    UpdateEventService,
    { provide: UPDATE_EVENT_USE_CASE, useExisting: UpdateEventService },
    DeleteEventService,
    { provide: DELETE_EVENT_USE_CASE, useExisting: DeleteEventService },
    JoinEventService,
    { provide: JOIN_EVENT_USE_CASE, useExisting: JoinEventService },
    LeaveEventService,
    { provide: LEAVE_EVENT_USE_CASE, useExisting: LeaveEventService },
    ListMessagesService,
    { provide: LIST_MESSAGES_USE_CASE, useExisting: ListMessagesService },
    CreateMessageService,
    { provide: CREATE_MESSAGE_USE_CASE, useExisting: CreateMessageService },
    DeleteMessageService,
    { provide: DELETE_MESSAGE_USE_CASE, useExisting: DeleteMessageService },
    ListTagsService,
    { provide: LIST_TAGS_USE_CASE, useExisting: ListTagsService },
    // ─── Facade ───────────────────────────────────────────────────────
    EventFacade,
  ],
})
export class EventModule {}
