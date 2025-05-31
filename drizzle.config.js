const dotenv = require("dotenv");
const { defineConfig } = require('drizzle-kit');

dotenv.config();

module.exports = defineConfig({
  schema: "./src/models/schema.js",
  out: "./src/drizzle/migrations",
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});