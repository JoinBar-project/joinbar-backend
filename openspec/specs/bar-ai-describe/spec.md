## ADDED Requirements

### Requirement: Gemini AI 生成酒吧描述

系統 SHALL 提供受 JWT 保護的端點 `POST /api/bars/:id/describe`，呼叫 Gemini API 依酒吧資料生成自然語言描述文字。

回傳結構：

```json
{
  "success": true,
  "data": {
    "description": "..."
  },
  "timestamp": "..."
}
```

Gemini prompt 應包含：酒吧 `name`、`address`、以及 `BarTag` 中值為 `true` 的標籤列表。

功能受 `geminiEnabled` feature flag 控制：

- `geminiEnabled=false` → 回傳 HTTP 503
- Gemini API 呼叫失敗（timeout / API error）→ 回傳 HTTP 503

已軟刪除的酒吧 SHALL 回傳 404。

#### Scenario: 成功生成描述

- **WHEN** POST /api/bars/:id/describe，帶有效 JWT，id 存在，`geminiEnabled=true`
- **THEN** 回傳 HTTP 200，`data.description` 為非空字串

#### Scenario: geminiEnabled=false

- **WHEN** POST /api/bars/:id/describe，`geminiEnabled=false`
- **THEN** 回傳 HTTP 503

#### Scenario: Gemini API 呼叫失敗

- **WHEN** POST /api/bars/:id/describe，Gemini API 拋出錯誤
- **THEN** 回傳 HTTP 503

#### Scenario: 不存在的 id

- **WHEN** POST /api/bars/:id/describe，id 不存在
- **THEN** 回傳 HTTP 404

#### Scenario: 未帶 JWT

- **WHEN** POST /api/bars/:id/describe，無 Authorization header
- **THEN** 回傳 HTTP 401
