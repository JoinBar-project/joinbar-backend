import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';

dotenv.config();

const { DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE } =
  process.env;

const url =
  process.env.DATABASE_URL ??
  `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;

export default defineConfig({
  datasource: {
    url,
  },
});
