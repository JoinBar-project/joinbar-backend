import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * App 啟動階段（NestJS 尚未建立）使用的 Pino logger。
 * App 建立後由 nestjs-pino 接管。
 */
export const log = pino({
  name: process.env.SERVICE_NAME || 'joinbar-backend',
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  }),
});
