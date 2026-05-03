## Why

平台使用者需要瀏覽、搜尋酒吧並依偏好標籤篩選，以探索適合的酒吧並進一步參加活動或加入收藏。現有 Prisma schema 已定義 `Bar`、`BarTag` 資料模型，但尚未有對應的 API 端點與應用層實作。

## What Changes

- 新增公開讀取端點：列出酒吧（支援標籤篩選 + 關鍵字搜尋）、取得單一酒吧詳情
- 新增管理端點（需 JWT）：建立、更新（含 BarTag）、軟刪除酒吧
- 新增 Gemini AI 描述端點：依酒吧基本資訊與標籤呼叫 Gemini API 生成描述，受 `geminiEnabled` feature flag 控制
- 新增 `GeminiPort`（port/out）與 `GeminiAdapter`（adapter/out）
- 新增 `BarFacade`、6 個 Service、對應 Port/in 介面
- 新增 `PrismaBarRepository`（FindBarPort + SaveBarPort）
- 新增靜態 YAML Swagger 文件

## Capabilities

### New Capabilities

- `bar-list`: 列出酒吧，支援標籤多選篩選（sport / music / student / bistro / drink / joy / romantic / oldschool / highlevel / easy）與 name 關鍵字搜尋，回傳分頁結果
- `bar-detail`: 依 ID 取得酒吧完整資訊（含 BarTag）
- `bar-management`: 需 JWT 的 CRUD 操作（建立含 BarTag、更新、軟刪除）
- `bar-ai-describe`: 呼叫 Gemini API 依酒吧 name / address / tags 生成自然語言描述，`geminiEnabled=false` 時回傳 503

### Modified Capabilities

（無既有 spec 異動）

## Impact

- **新增檔案**：port/in/bar/\*、port/out/bar/\*、port/out/shared/GeminiPort.ts、service/bar/\*（含 spec）、facade/BarFacade.ts、adapter/in/web/bar/\*、adapter/out/persistence/bar/\*、adapter/out/gemini/\*、modules/bar.module.ts、docs/swagger/bar/\*
- **修改檔案**：app.module.ts（引入 BarModule）、docs/swagger/openapi.yaml（新增 /bars 路徑）
- **依賴**：`APPLICATION_GEMINI_ENABLED`（現有 feature flag）、`GEMINI_API_KEY`（現有 env）
- **不影響**：auth / user 模組、現有 Guard 機制
