import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

// Tests use the separate luma_test database from .env.test, never luma_dev
const testEnv = dotenv.config({ path: ".env.test", quiet: true }).parsed ?? {};

if (!testEnv.DATABASE_URL?.includes("luma_test")) {
  throw new Error(".env.test must point DATABASE_URL at the luma_test database");
}

export default defineConfig({
  test: {
    env: testEnv,
  },
});
