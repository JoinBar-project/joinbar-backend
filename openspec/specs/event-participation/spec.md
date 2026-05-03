## ADDED Requirements

### Requirement: 報名活動

系統 SHALL 提供 POST /events/:id/join 端點（需 JWT）。若活動 maxPeople 不為 null 且已達上限則回傳 409。同一使用者重複報名同一活動回傳 409。

#### Scenario: 成功報名

- **WHEN** 已登入使用者呼叫 POST /events/:id/join，活動存在且未達人數上限
- **THEN** 系統回傳 201，建立 EventParticipation 記錄

#### Scenario: 活動已滿

- **WHEN** 活動 maxPeople 已達上限
- **THEN** 系統回傳 409 EVENT_FULL

#### Scenario: 重複報名

- **WHEN** 使用者對已報名的活動再次呼叫 POST /events/:id/join
- **THEN** 系統回傳 409 ALREADY_JOINED

#### Scenario: 活動不存在

- **WHEN** 呼叫 POST /events/:id/join 且 ID 不存在
- **THEN** 系統回傳 404 EVENT_NOT_FOUND

#### Scenario: 未登入

- **WHEN** 未帶 JWT 呼叫 POST /events/:id/join
- **THEN** 系統回傳 401

### Requirement: 退出活動

系統 SHALL 提供 DELETE /events/:id/join 端點（需 JWT）。若使用者未報名該活動則回傳 404。

#### Scenario: 成功退出

- **WHEN** 已報名的使用者呼叫 DELETE /events/:id/join
- **THEN** 系統回傳 204，刪除對應 EventParticipation 記錄

#### Scenario: 未報名就退出

- **WHEN** 未報名的使用者呼叫 DELETE /events/:id/join
- **THEN** 系統回傳 404 PARTICIPATION_NOT_FOUND

#### Scenario: 未登入

- **WHEN** 未帶 JWT 呼叫 DELETE /events/:id/join
- **THEN** 系統回傳 401
