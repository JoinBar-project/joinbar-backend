## ADDED Requirements

### Requirement: 上傳頭像

系統 SHALL 接受 `POST /api/users/me/avatar`，將圖片上傳至 Firebase Storage，更新 `avatarUrl`、`avatarKey`、`avatarLastUpdated`。

#### Scenario: 成功上傳

- **WHEN** 已登入使用者提交合法的圖片檔案（`multipart/form-data`，欄位名 `file`）
- **THEN** 檔案上傳至 Firebase Storage，取得 signed URL，更新使用者的 `avatarUrl`、`avatarKey`、`avatarLastUpdated`，回傳新的 `avatarUrl` 且 HTTP 200

#### Scenario: 未提供檔案

- **WHEN** 請求未包含 `file` 欄位
- **THEN** 回傳 HTTP 400

#### Scenario: 檔案類型不合法

- **WHEN** 上傳的檔案 magic number（Buffer 前幾個 bytes）不符合 JPEG / PNG / GIF / WebP 格式
- **THEN** 回傳 HTTP 422

#### Scenario: 檔案超過大小限制

- **WHEN** 上傳的檔案超過 5 MB
- **THEN** 回傳 HTTP 413

### Requirement: 覆蓋舊頭像

系統 SHALL 在上傳新頭像時，先上傳新檔案並更新 DB，再刪除 Firebase Storage 上的舊檔案。

#### Scenario: 已有舊頭像

- **WHEN** 使用者已有 `avatarKey` 且上傳新頭像
- **THEN** 先上傳新檔案，更新三個欄位，再刪除舊 Firebase 檔案（刪除失敗不影響主流程）
