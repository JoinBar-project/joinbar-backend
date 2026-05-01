-- AlterEnum
ALTER TYPE "auth_log_action" ADD VALUE 'REFRESH';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_password_change" TIMESTAMPTZ;
