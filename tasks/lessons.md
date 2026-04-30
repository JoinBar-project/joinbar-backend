# 踩坑記錄

過去修正過的問題與注意事項，永不刪除條目。

## Prisma v7：datasource url 移至 prisma.config.ts

Prisma v7 breaking change：`schema.prisma` 的 `datasource` 不再支援 `url` 欄位。
需建立 `prisma.config.ts`，以 `defineConfig` 傳入連線字串。
`prisma validate` 需先執行 `npm install` 才能載入 `prisma/config` 模組。
