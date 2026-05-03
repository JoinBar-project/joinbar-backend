import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventFacade } from '../../../../application/facade/EventFacade';
import { ZodValidationPipe } from '../../../../infrastructure/zod-validation.pipe';
import { JwtAuthGuard } from '../guard/JwtAuthGuard';
import { Public } from '../decorator/public.decorator';
import { CurrentUser, UserContext } from '../decorator/current-user.decorator';

import { ListEventsRequest, listEventsSchema } from './dto/ListEventsRequest';
import {
  CreateEventRequest,
  createEventSchema,
} from './dto/CreateEventRequest';
import {
  UpdateEventRequest,
  updateEventSchema,
} from './dto/UpdateEventRequest';
import {
  CreateMessageRequest,
  createMessageSchema,
} from './dto/CreateMessageRequest';
import { EventResponse } from './dto/EventResponse';
import { EventListResponse } from './dto/EventListResponse';
import { MessageResponse, ListMessagesResponse } from './dto/MessageResponse';
import { ListTagsResponse } from './dto/ListTagsResponse';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventController {
  constructor(private readonly eventFacade: EventFacade) {}

  // ─── Events ───────────────────────────────────────────────────────────

  @Get()
  @Public()
  listEvents(
    @Query(new ZodValidationPipe(listEventsSchema)) query: ListEventsRequest,
  ): Promise<EventListResponse> {
    return this.eventFacade.listEvents(query);
  }

  @Get('tags')
  @Public()
  listTags(): Promise<ListTagsResponse> {
    return this.eventFacade.listTags();
  }

  @Get(':id')
  @Public()
  getEvent(@Param('id') id: string): Promise<EventResponse> {
    return this.eventFacade.getEvent({ eventId: id });
  }

  @Post()
  createEvent(
    @Body(new ZodValidationPipe(createEventSchema)) dto: CreateEventRequest,
    @CurrentUser() user: UserContext,
  ): Promise<EventResponse> {
    return this.eventFacade.createEvent({ ...dto, hostUser: user.sub });
  }

  @Patch(':id')
  updateEvent(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateEventSchema)) dto: UpdateEventRequest,
    @CurrentUser() user: UserContext,
  ): Promise<EventResponse> {
    return this.eventFacade.updateEvent({
      eventId: id,
      actorId: user.sub,
      actorRole: user.roleName,
      ...dto,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEvent(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ): Promise<void> {
    return this.eventFacade.deleteEvent({
      eventId: id,
      actorId: user.sub,
      actorRole: user.roleName,
    });
  }

  // ─── Participation ────────────────────────────────────────────────────

  @Post(':id/join')
  @HttpCode(HttpStatus.CREATED)
  joinEvent(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ): Promise<void> {
    return this.eventFacade.joinEvent({ eventId: id, userId: user.sub });
  }

  @Delete(':id/join')
  @HttpCode(HttpStatus.NO_CONTENT)
  leaveEvent(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ): Promise<void> {
    return this.eventFacade.leaveEvent({ eventId: id, userId: user.sub });
  }

  // ─── Messages ─────────────────────────────────────────────────────────

  @Get(':id/messages')
  @Public()
  listMessages(@Param('id') id: string): Promise<ListMessagesResponse> {
    return this.eventFacade.listMessages({ eventId: id });
  }

  @Post(':id/messages')
  createMessage(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createMessageSchema))
    dto: CreateMessageRequest,
    @CurrentUser() user: UserContext,
  ): Promise<MessageResponse> {
    return this.eventFacade.createMessage({
      eventId: id,
      userId: user.sub,
      content: dto.content,
    });
  }

  @Delete(':id/messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: UserContext,
  ): Promise<void> {
    return this.eventFacade.deleteMessage({
      eventId: id,
      messageId,
      actorId: user.sub,
      actorRole: user.roleName,
    });
  }
}
