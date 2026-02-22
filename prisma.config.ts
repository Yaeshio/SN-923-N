import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    // DATABASE_URL が空の場合に備えて、明示的にチェックする
    url: process.env.DATABASE_URL,
  },
});