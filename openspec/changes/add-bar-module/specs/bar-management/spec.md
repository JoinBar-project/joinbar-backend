## ADDED Requirements

### Requirement: 建立酒吧

系統 SHALL 提供受 JWT 保護的端點 `POST /api/bars`，建立酒吧記錄並可選附帶 BarTag。

Request body（JSON）：

- `name`（string，必填，1–100 字）
- `address`（string，可選）
- `phone`（string，可選）
- `website`（string，可選）
- `imageUrl`（string，可選）
- `latitude`（number，可選）
- `longitude`（number，可選）
- `googlePlaceId`（string，可選）
- `tags`（object，可選）：`{ sport?, music?, student?, bistro?, drink?, joy?, romantic?, oldschool?, highlevel?, easy? }`，各欄位為 boolean，未提供預設 `false`

建立成功回傳 HTTP 201 + 新建的酒吧完整資料（同 bar-detail 格式）。

若帶 `tags` 則同時建立 `BarTag` 記錄。

#### Scenario: 成功建立（含 tags）

- **WHEN** POST /api/bars，帶有效 JWT 與包含 `name` 及 `tags.sport=true` 的 body
- **THEN** 回傳 HTTP 201，`data.name` 與 `data.tags` 包含 `sport`

#### Scenario: 缺少必填欄位

- **WHEN** POST /api/bars，body 缺少 `name`
- **THEN** 回傳 HTTP 400

#### Scenario: 未帶 JWT

- **WHEN** POST /api/bars，無 Authorization header
- **THEN** 回傳 HTTP 401

---

### Requirement: 更新酒吧

系統 SHALL 提供受 JWT 保護的端點 `PATCH /api/bars/:id`，部分更新酒吧資料。

Request body 欄位均為可選（至少需提供一個欄位，否則回傳 400）：
`name, address, phone, website, imageUrl, latitude, longitude, googlePlaceId, tags`

若帶 `tags` 則對 `BarTag` 執行 upsert（覆寫整個 tags 物件）。
已軟刪除的酒吧 SHALL 回傳 404。

更新成功回傳 HTTP 200 + 更新後的完整酒吧資料。

#### Scenario: 成功更新 name

- **WHEN** PATCH /api/bars/:id，帶有效 JWT 與 `{ "name": "新名稱" }`
- **THEN** 回傳 HTTP 200，`data.name` 為「新名稱」

#### Scenario: 空 body

- **WHEN** PATCH /api/bars/:id，body 為 `{}`
- **THEN** 回傳 HTTP 400

#### Scenario: 不存在的 id

- **WHEN** PATCH /api/bars/:id，id 不存在
- **THEN** 回傳 HTTP 404

---

### Requirement: 軟刪除酒吧

系統 SHALL 提供受 JWT 保護的端點 `DELETE /api/bars/:id`，設定 `deletedAt` 時間戳進行軟刪除。

刪除成功回傳 HTTP 204（無 body）。
已軟刪除的酒吧再次刪除 SHALL 回傳 404。

#### Scenario: 成功軟刪除

- **WHEN** DELETE /api/bars/:id，帶有效 JWT，id 存在且未刪除
- **THEN** 回傳 HTTP 204，後續 GET /api/bars/:id 回傳 404

#### Scenario: 不存在的 id

- **WHEN** DELETE /api/bars/:id，id 不存在
- **THEN** 回傳 HTTP 404
