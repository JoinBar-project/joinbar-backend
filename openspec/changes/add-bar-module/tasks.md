## 1. Port/in — Use Case 介面

- [x] 1.1 建立 `src/application/port/in/bar/ListBarsUseCase.ts`（ListBarsCommand、ListBarsResult 含分頁 meta）
- [x] 1.2 建立 `src/application/port/in/bar/GetBarUseCase.ts`（GetBarCommand、GetBarResult）
- [x] 1.3 建立 `src/application/port/in/bar/CreateBarUseCase.ts`（CreateBarCommand、CreateBarResult）
- [x] 1.4 建立 `src/application/port/in/bar/UpdateBarUseCase.ts`（UpdateBarCommand、UpdateBarResult）
- [x] 1.5 建立 `src/application/port/in/bar/DeleteBarUseCase.ts`（DeleteBarCommand）
- [x] 1.6 建立 `src/application/port/in/bar/AiDescribeBarUseCase.ts`（AiDescribeBarCommand、AiDescribeBarResult）

## 2. Port/out — Repository 與外部服務介面

- [x] 2.1 建立 `src/application/port/out/bar/FindBarPort.ts`（findById、findMany 含篩選與分頁參數、count）
- [x] 2.2 建立 `src/application/port/out/bar/SaveBarPort.ts`（create、update、softDelete）
- [x] 2.3 建立 `src/application/port/out/shared/GeminiPort.ts`（generate(prompt: string): Promise<string>）

## 3. Persistence Adapter

- [x] 3.1 建立 `src/adapter/out/persistence/bar/PrismaBarRepository.ts`，實作 FindBarPort + SaveBarPort（findById 含 BarTag、findMany 支援 keyword/tags/offset 分頁、count、create + BarTag upsert、update + BarTag upsert、softDelete）

## 4. Gemini Adapter

- [x] 4.1 建立 `src/adapter/out/gemini/GeminiAdapter.ts`，實作 GeminiPort（使用 `@google/generative-ai` SDK，初始化時若 GEMINI_API_KEY 為空拋 ConfigurationException）

## 5. Application Services

- [x] 5.1 建立 `src/application/service/bar/ListBarsService.ts`（呼叫 findMany + count，用 getPagination / buildPaginationMeta 組裝回傳）
- [x] 5.2 建立 `src/application/service/bar/ListBarsService.spec.ts`
- [x] 5.3 建立 `src/application/service/bar/GetBarService.ts`（findById，不存在或已刪除拋 NotFoundException）
- [x] 5.4 建立 `src/application/service/bar/GetBarService.spec.ts`
- [x] 5.5 建立 `src/application/service/bar/CreateBarService.ts`（create，回傳完整 BarResult）
- [x] 5.6 建立 `src/application/service/bar/CreateBarService.spec.ts`
- [x] 5.7 建立 `src/application/service/bar/UpdateBarService.ts`（findById 確認存在 → update，回傳更新後資料）
- [x] 5.8 建立 `src/application/service/bar/UpdateBarService.spec.ts`
- [x] 5.9 建立 `src/application/service/bar/DeleteBarService.ts`（findById 確認存在 → softDelete）
- [x] 5.10 建立 `src/application/service/bar/DeleteBarService.spec.ts`
- [x] 5.11 建立 `src/application/service/bar/AiDescribeBarService.ts`（geminiEnabled 檢查 → findById → 組 prompt → geminiPort.generate，失敗拋 ServiceUnavailableException）
- [x] 5.12 建立 `src/application/service/bar/AiDescribeBarService.spec.ts`

## 6. Facade

- [ ] 6.1 建立 `src/application/facade/BarFacade.ts`，彙整六個 use case

## 7. Controller & DTO

- [ ] 7.1 建立 `src/adapter/in/web/bar/dto/BarTagsDto.ts`（10 個 boolean 欄位，Zod schema）
- [ ] 7.2 建立 `src/adapter/in/web/bar/dto/BarResponse.ts`（完整酒吧資料，tags 為字串陣列）
- [ ] 7.3 建立 `src/adapter/in/web/bar/dto/BarListResponse.ts`（items: BarResponse[]、meta: PaginationMeta）
- [ ] 7.4 建立 `src/adapter/in/web/bar/dto/ListBarsRequest.ts`（Zod schema：page、limit、keyword、tags 逗號分隔字串）
- [ ] 7.5 建立 `src/adapter/in/web/bar/dto/CreateBarRequest.ts`（Zod schema，name 必填）
- [ ] 7.6 建立 `src/adapter/in/web/bar/dto/UpdateBarRequest.ts`（Zod schema，全選填，.refine 至少一欄位）
- [ ] 7.7 建立 `src/adapter/in/web/bar/dto/AiDescribeResponse.ts`（description: string）
- [ ] 7.8 建立 `src/adapter/in/web/bar/BarController.ts`（@Controller('bars')，class-level @UseGuards(JwtAuthGuard)；GET / 與 GET /:id 加 @Public()；POST /、PATCH /:id、DELETE /:id、POST /:id/describe）

## 8. Module 配線

- [ ] 8.1 建立 `src/modules/bar.module.ts`（imports: AuthModule、GeminiModule 或直接 provide GeminiAdapter；providers: PrismaBarRepository with FIND_BAR_PORT/SAVE_BAR_PORT、所有 Service、GeminiAdapter with GEMINI_PORT、BarFacade；controllers: BarController）
- [ ] 8.2 在 `src/app.module.ts` 引入 `BarModule`

## 9. Swagger 文件

- [ ] 9.1 建立 `docs/swagger/bar/list-bars.yaml`
- [ ] 9.2 建立 `docs/swagger/bar/get-bar.yaml`
- [ ] 9.3 建立 `docs/swagger/bar/create-bar.yaml`
- [ ] 9.4 建立 `docs/swagger/bar/update-bar.yaml`
- [ ] 9.5 建立 `docs/swagger/bar/delete-bar.yaml`
- [ ] 9.6 建立 `docs/swagger/bar/ai-describe-bar.yaml`
- [ ] 9.7 在 `docs/swagger/openapi.yaml` 新增 `/bars`、`/bars/{id}`、`/bars/{id}/describe` 路徑
- [ ] 9.8 執行 `npm run swagger:bundle` 確認輸出正確

## 10. 測試

- [ ] 10.1 建立 `test/bar.e2e-spec.ts`，涵蓋：列表（無篩選、標籤篩選、關鍵字）、取得詳情（200/404）、建立、更新、刪除後 404、AI 描述（成功 / geminiEnabled=false）

## 11. 品質驗證

- [ ] 11.1 執行 `npx tsc --noEmit`，修正所有型別錯誤
- [ ] 11.2 執行 `npm run lint`，修正所有 lint 警告
- [ ] 11.3 執行 `npm run test`，確認所有單元測試通過
- [ ] 11.4 執行 `npm run test:e2e`，確認 E2E 測試通過
