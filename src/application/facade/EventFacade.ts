import { Inject, Injectable } from '@nestjs/common';
import {
  LIST_EVENTS_USE_CASE,
  ListEventsCommand,
  ListEventsResult,
  ListEventsUseCase,
} from '../port/in/event/ListEventsUseCase';
import {
  GET_EVENT_USE_CASE,
  GetEventCommand,
  EventDetail,
  GetEventUseCase,
} from '../port/in/event/GetEventUseCase';
import {
  CREATE_EVENT_USE_CASE,
  CreateEventCommand,
  CreateEventResult,
  CreateEventUseCase,
} from '../port/in/event/CreateEventUseCase';
import {
  UPDATE_EVENT_USE_CASE,
  UpdateEventCommand,
  UpdateEventResult,
  UpdateEventUseCase,
} from '../port/in/event/UpdateEventUseCase';
import {
  DELETE_EVENT_USE_CASE,
  DeleteEventCommand,
  DeleteEventUseCase,
} from '../port/in/event/DeleteEventUseCase';
import {
  JOIN_EVENT_USE_CASE,
  JoinEventCommand,
  JoinEventUseCase,
} from '../port/in/event/JoinEventUseCase';
import {
  LEAVE_EVENT_USE_CASE,
  LeaveEventCommand,
  LeaveEventUseCase,
} from '../port/in/event/LeaveEventUseCase';
import {
  LIST_MESSAGES_USE_CASE,
  ListMessagesCommand,
  ListMessagesResult,
  ListMessagesUseCase,
} from '../port/in/event/ListMessagesUseCase';
import {
  CREATE_MESSAGE_USE_CASE,
  CreateMessageCommand,
  MessageResult,
  CreateMessageUseCase,
} from '../port/in/event/CreateMessageUseCase';
import {
  DELETE_MESSAGE_USE_CASE,
  DeleteMessageCommand,
  DeleteMessageUseCase,
} from '../port/in/event/DeleteMessageUseCase';
import {
  LIST_TAGS_USE_CASE,
  ListTagsResult,
  ListTagsUseCase,
} from '../port/in/event/ListTagsUseCase';

/**
 * Event 領域の公開 API。
 * Controller はこの Facade 経由で全 use case を呼び出す。
 * Event 領域的公開 API，Controller 透過此 Facade 呼叫所有 use case。
 */
@Injectable()
export class EventFacade {
  constructor(
    @Inject(LIST_EVENTS_USE_CASE)
    private readonly listEventsUseCase: ListEventsUseCase,
    @Inject(GET_EVENT_USE_CASE)
    private readonly getEventUseCase: GetEventUseCase,
    @Inject(CREATE_EVENT_USE_CASE)
    private readonly createEventUseCase: CreateEventUseCase,
    @Inject(UPDATE_EVENT_USE_CASE)
    private readonly updateEventUseCase: UpdateEventUseCase,
    @Inject(DELETE_EVENT_USE_CASE)
    private readonly deleteEventUseCase: DeleteEventUseCase,
    @Inject(JOIN_EVENT_USE_CASE)
    private readonly joinEventUseCase: JoinEventUseCase,
    @Inject(LEAVE_EVENT_USE_CASE)
    private readonly leaveEventUseCase: LeaveEventUseCase,
    @Inject(LIST_MESSAGES_USE_CASE)
    private readonly listMessagesUseCase: ListMessagesUseCase,
    @Inject(CREATE_MESSAGE_USE_CASE)
    private readonly createMessageUseCase: CreateMessageUseCase,
    @Inject(DELETE_MESSAGE_USE_CASE)
    private readonly deleteMessageUseCase: DeleteMessageUseCase,
    @Inject(LIST_TAGS_USE_CASE)
    private readonly listTagsUseCase: ListTagsUseCase,
  ) {}

  listEvents(command: ListEventsCommand): Promise<ListEventsResult> {
    return this.listEventsUseCase.execute(command);
  }

  getEvent(command: GetEventCommand): Promise<EventDetail> {
    return this.getEventUseCase.execute(command);
  }

  createEvent(command: CreateEventCommand): Promise<CreateEventResult> {
    return this.createEventUseCase.execute(command);
  }

  updateEvent(command: UpdateEventCommand): Promise<UpdateEventResult> {
    return this.updateEventUseCase.execute(command);
  }

  deleteEvent(command: DeleteEventCommand): Promise<void> {
    return this.deleteEventUseCase.execute(command);
  }

  joinEvent(command: JoinEventCommand): Promise<void> {
    return this.joinEventUseCase.execute(command);
  }

  leaveEvent(command: LeaveEventCommand): Promise<void> {
    return this.leaveEventUseCase.execute(command);
  }

  listMessages(command: ListMessagesCommand): Promise<ListMessagesResult> {
    return this.listMessagesUseCase.execute(command);
  }

  createMessage(command: CreateMessageCommand): Promise<MessageResult> {
    return this.createMessageUseCase.execute(command);
  }

  deleteMessage(command: DeleteMessageCommand): Promise<void> {
    return this.deleteMessageUseCase.execute(command);
  }

  listTags(): Promise<ListTagsResult> {
    return this.listTagsUseCase.execute();
  }
}
