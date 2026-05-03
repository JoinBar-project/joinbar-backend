## 1. Domain 層

- [x] 1.1 新增 `src/domain/model/event.ts`（Event domain model）
- [x] 1.2 新增 `src/domain/exception/EventNotFoundException.ts`
- [x] 1.3 新增 `src/domain/exception/EventFullException.ts`
- [x] 1.4 新增 `src/domain/exception/AlreadyJoinedException.ts`
- [x] 1.5 新增 `src/domain/exception/ParticipationNotFoundException.ts`
- [x] 1.6 新增 `src/domain/exception/MessageNotFoundException.ts`
- [x] 1.7 新增 `src/domain/exception/ForbiddenOperationException.ts`（替代 service 層直接拋 NestJS ForbiddenException）
- [x] 1.8 新增 `src/domain/exception/InvalidTagException.ts`（替代 service 層直接拋 NestJS BadRequestException）
- [x] 1.9 在 `GlobalExceptionFilter` 新增上述所有 exception → HTTP 狀態碼對應

## 2. Port/in（Use Case 介面）

- [x] 2.1 新增 `ListEventsUseCase`（含 ListEventsCommand、EventListItem、ListEventsResult）
- [x] 2.2 新增 `GetEventUseCase`（含 GetEventCommand、EventDetail）
- [x] 2.3 新增 `CreateEventUseCase`（含 CreateEventCommand、CreateEventResult）
- [x] 2.4 新增 `UpdateEventUseCase`（含 UpdateEventCommand、UpdateEventResult）
- [x] 2.5 新增 `DeleteEventUseCase`（含 DeleteEventCommand）
- [x] 2.6 新增 `JoinEventUseCase`（含 JoinEventCommand）
- [x] 2.7 新增 `LeaveEventUseCase`（含 LeaveEventCommand）
- [x] 2.8 新增 `ListMessagesUseCase`（含 ListMessagesCommand、MessageItem、ListMessagesResult）
- [x] 2.9 新增 `CreateMessageUseCase`（含 CreateMessageCommand、MessageResult）
- [x] 2.10 新增 `DeleteMessageUseCase`（含 DeleteMessageCommand）
- [x] 2.11 新增 `ListTagsUseCase`（含 TagItem、ListTagsResult）

## 3. Port/out（Repository 介面）

- [x] 3.1 新增 `FindEventPort`（findById、findMany、count、countParticipants）
- [x] 3.2 新增 `SaveEventPort`（create、update、softDelete）
- [x] 3.3 新增 `FindTagPort`（findAll、findByNames）
- [x] 3.4 新增 `FindParticipationPort`（findByUserAndEvent）
- [x] 3.5 新增 `SaveParticipationPort`（create、createWithCapacityCheck、delete）
- [x] 3.6 新增 `FindMessagePort`（findByEventId、findById）
- [x] 3.7 新增 `SaveMessagePort`（create、softDelete）

## 4. Persistence Adapter

- [x] 4.1 新增 `PrismaEventRepository`（實作 FindEventPort + SaveEventPort）：findById（含 tags + participantCount）、findMany（篩選 + 分頁）、count、create（含 EventTag）、update（含 EventTag 覆寫）、softDelete
- [x] 4.2 新增 `PrismaTagRepository`（實作 FindTagPort）：findAll、findByNames
- [x] 4.3 新增 `PrismaParticipationRepository`（實作 FindParticipationPort + SaveParticipationPort）
- [x] 4.4 新增 `PrismaMessageRepository`（實作 FindMessagePort + SaveMessagePort）

## 5. Application Services

- [x] 5.1 新增 `ListEventsService` + spec（getPagination → findMany + count → buildPaginationMeta）
- [x] 5.2 新增 `GetEventService` + spec（findById → EventNotFoundException if null）
- [x] 5.3 新增 `CreateEventService` + spec（驗證 tags 存在 → create 直接回傳完整 EventData）
- [x] 5.4 新增 `UpdateEventService` + spec（findById → 檢查 ADMIN/hostUser → 驗證 tags → update）
- [x] 5.5 新增 `DeleteEventService` + spec（findById → 檢查 ADMIN/hostUser → softDelete）
- [x] 5.6 新增 `JoinEventService` + spec（findById → 若 maxPeople 為 null 直接 create；有上限則呼叫 createWithCapacityCheck，在 Serializable transaction 內做 count + create）
- [x] 5.7 新增 `LeaveEventService` + spec（findByUserAndEvent → ParticipationNotFoundException → delete）
- [x] 5.8 新增 `ListMessagesService` + spec（findById event → findByEventId messages）
- [x] 5.9 新增 `CreateMessageService` + spec（findById event → create message）
- [x] 5.10 新增 `DeleteMessageService` + spec（findById message → 檢查本人/ADMIN → softDelete）
- [x] 5.11 新增 `ListTagsService` + spec（findAll tags）

## 6. Facade

- [x] 6.1 新增 `EventFacade`（代理 11 個 use case）

## 7. Controller & DTOs

- [x] 7.1 新增 `ListEventsRequest` DTO（keyword、tags、startFrom、startTo、barId、page、limit）
- [x] 7.2 新增 `CreateEventRequest` DTO（name、location、startAt、endAt、barId、barName、description、maxPeople、imageUrl、price、tags）
- [x] 7.3 新增 `UpdateEventRequest` DTO（同 Create 但全選填 + refine 至少一欄位）
- [x] 7.4 新增 `CreateMessageRequest` DTO（content 非空字串）
- [x] 7.5 新增 `EventResponse` DTO（完整活動欄位含 tags、participantCount）
- [x] 7.6 新增 `EventListResponse` DTO（items: EventListItem[]、meta: PaginationMeta）
- [x] 7.7 新增 `MessageResponse` DTO
- [x] 7.8 新增 `EventController`（11 個端點：GET /events、GET /events/tags、GET /events/:id、POST /events、PATCH /events/:id、DELETE /events/:id、POST /events/:id/join、DELETE /events/:id/join、GET /events/:id/messages、POST /events/:id/messages、DELETE /events/:id/messages/:messageId）

## 8. Module 配線

- [x] 8.1 新增 `src/modules/event.module.ts`（注入所有 repository、services、facade、RolesGuard）
- [x] 8.2 在 `src/app.module.ts` 引入 EventModule

## 9. Swagger 文件

- [x] 9.1 新增 `docs/swagger/event/list-events.yaml`
- [x] 9.2 新增 `docs/swagger/event/get-event.yaml`
- [x] 9.3 新增 `docs/swagger/event/create-event.yaml`
- [x] 9.4 新增 `docs/swagger/event/update-event.yaml`
- [x] 9.5 新增 `docs/swagger/event/delete-event.yaml`
- [x] 9.6 新增 `docs/swagger/event/join-event.yaml`
- [x] 9.7 新增 `docs/swagger/event/leave-event.yaml`
- [x] 9.8 新增 `docs/swagger/event/list-messages.yaml`
- [x] 9.9 新增 `docs/swagger/event/create-message.yaml`
- [x] 9.10 新增 `docs/swagger/event/delete-message.yaml`
- [x] 9.11 新增 `docs/swagger/tag/list-tags.yaml`
- [x] 9.12 在 `docs/swagger/openapi.yaml` 新增 /events、/events/{id}、/events/{id}/join、/events/{id}/messages、/events/{id}/messages/{messageId}、/events/tags 路徑
- [x] 9.13 執行 `npm run swagger:bundle` 驗證通過

## 10. E2E 測試

- [x] 10.1 新增 `test/event.e2e-spec.ts`（覆蓋：list、detail、create、update、delete、join、leave、messages CRUD）
- [x] 10.2 執行 `npm run test:e2e` 全部通過

## 11. 品質驗證

- [x] 11.1 `npx tsc --noEmit` 無錯誤
- [x] 11.2 `npm run lint` 無警告/錯誤
- [x] 11.3 `npm run test` 全部通過
