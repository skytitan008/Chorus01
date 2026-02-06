/*
  Warnings:

  - You are about to drop the column `actorId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `documentId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `ideaId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `proposalId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `taskId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `agentId` on the `ApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `ApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `proposalId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `assignedBy` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `assigneeId` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `inputIds` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedBy` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `assignedBy` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `assigneeId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `proposalId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `User` table. All the data in the column will be lost.
  - Added the required column `actorUuid` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyUuid` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectUuid` to the `Activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyUuid` to the `Agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agentUuid` to the `ApiKey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyUuid` to the `ApiKey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authorUuid` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyUuid` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetUuid` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyUuid` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdByUuid` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectUuid` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyUuid` to the `Idea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdByUuid` to the `Idea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectUuid` to the `Idea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyUuid` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyUuid` to the `Proposal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdByUuid` to the `Proposal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inputUuids` to the `Proposal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectUuid` to the `Proposal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyUuid` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdByUuid` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectUuid` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyUuid` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Activity_companyId_idx";

-- DropIndex
DROP INDEX "Activity_projectId_idx";

-- DropIndex
DROP INDEX "Activity_taskId_idx";

-- DropIndex
DROP INDEX "Agent_companyId_idx";

-- DropIndex
DROP INDEX "Agent_ownerId_idx";

-- DropIndex
DROP INDEX "ApiKey_agentId_idx";

-- DropIndex
DROP INDEX "ApiKey_companyId_idx";

-- DropIndex
DROP INDEX "Comment_companyId_idx";

-- DropIndex
DROP INDEX "Comment_targetType_targetId_idx";

-- DropIndex
DROP INDEX "Document_companyId_idx";

-- DropIndex
DROP INDEX "Document_projectId_idx";

-- DropIndex
DROP INDEX "Document_proposalId_idx";

-- DropIndex
DROP INDEX "Idea_assigneeId_idx";

-- DropIndex
DROP INDEX "Idea_companyId_idx";

-- DropIndex
DROP INDEX "Idea_projectId_idx";

-- DropIndex
DROP INDEX "Project_companyId_idx";

-- DropIndex
DROP INDEX "Proposal_companyId_idx";

-- DropIndex
DROP INDEX "Proposal_projectId_idx";

-- DropIndex
DROP INDEX "Task_assigneeId_idx";

-- DropIndex
DROP INDEX "Task_companyId_idx";

-- DropIndex
DROP INDEX "Task_projectId_idx";

-- DropIndex
DROP INDEX "Task_proposalId_idx";

-- DropIndex
DROP INDEX "User_companyId_idx";

-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "actorId",
DROP COLUMN "companyId",
DROP COLUMN "documentId",
DROP COLUMN "ideaId",
DROP COLUMN "projectId",
DROP COLUMN "proposalId",
DROP COLUMN "taskId",
ADD COLUMN     "actorUuid" TEXT NOT NULL,
ADD COLUMN     "companyUuid" TEXT NOT NULL,
ADD COLUMN     "documentUuid" TEXT,
ADD COLUMN     "ideaUuid" TEXT,
ADD COLUMN     "projectUuid" TEXT NOT NULL,
ADD COLUMN     "proposalUuid" TEXT,
ADD COLUMN     "taskUuid" TEXT;

-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "companyId",
DROP COLUMN "ownerId",
ADD COLUMN     "companyUuid" TEXT NOT NULL,
ADD COLUMN     "ownerUuid" TEXT,
ADD COLUMN     "persona" TEXT,
ADD COLUMN     "systemPrompt" TEXT;

-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "agentId",
DROP COLUMN "companyId",
ADD COLUMN     "agentUuid" TEXT NOT NULL,
ADD COLUMN     "companyUuid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "authorId",
DROP COLUMN "companyId",
DROP COLUMN "targetId",
ADD COLUMN     "authorUuid" TEXT NOT NULL,
ADD COLUMN     "companyUuid" TEXT NOT NULL,
ADD COLUMN     "targetUuid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "emailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "oidcClientId" TEXT,
ADD COLUMN     "oidcEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "oidcIssuer" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "companyId",
DROP COLUMN "createdBy",
DROP COLUMN "projectId",
DROP COLUMN "proposalId",
ADD COLUMN     "companyUuid" TEXT NOT NULL,
ADD COLUMN     "createdByUuid" TEXT NOT NULL,
ADD COLUMN     "projectUuid" TEXT NOT NULL,
ADD COLUMN     "proposalUuid" TEXT;

-- AlterTable
ALTER TABLE "Idea" DROP COLUMN "assignedBy",
DROP COLUMN "assigneeId",
DROP COLUMN "companyId",
DROP COLUMN "createdBy",
DROP COLUMN "projectId",
ADD COLUMN     "assignedByUuid" TEXT,
ADD COLUMN     "assigneeUuid" TEXT,
ADD COLUMN     "companyUuid" TEXT NOT NULL,
ADD COLUMN     "createdByUuid" TEXT NOT NULL,
ADD COLUMN     "projectUuid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "companyId",
ADD COLUMN     "companyUuid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Proposal" DROP COLUMN "companyId",
DROP COLUMN "createdBy",
DROP COLUMN "inputIds",
DROP COLUMN "projectId",
DROP COLUMN "reviewedBy",
ADD COLUMN     "companyUuid" TEXT NOT NULL,
ADD COLUMN     "createdByUuid" TEXT NOT NULL,
ADD COLUMN     "inputUuids" JSONB NOT NULL,
ADD COLUMN     "projectUuid" TEXT NOT NULL,
ADD COLUMN     "reviewedByUuid" TEXT;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "assignedBy",
DROP COLUMN "assigneeId",
DROP COLUMN "companyId",
DROP COLUMN "createdBy",
DROP COLUMN "projectId",
DROP COLUMN "proposalId",
ADD COLUMN     "assignedByUuid" TEXT,
ADD COLUMN     "assigneeUuid" TEXT,
ADD COLUMN     "companyUuid" TEXT NOT NULL,
ADD COLUMN     "createdByUuid" TEXT NOT NULL,
ADD COLUMN     "projectUuid" TEXT NOT NULL,
ADD COLUMN     "proposalUuid" TEXT,
ADD COLUMN     "storyPoints" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "companyId",
ADD COLUMN     "companyUuid" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Activity_companyUuid_idx" ON "Activity"("companyUuid");

-- CreateIndex
CREATE INDEX "Activity_projectUuid_idx" ON "Activity"("projectUuid");

-- CreateIndex
CREATE INDEX "Activity_taskUuid_idx" ON "Activity"("taskUuid");

-- CreateIndex
CREATE INDEX "Agent_companyUuid_idx" ON "Agent"("companyUuid");

-- CreateIndex
CREATE INDEX "Agent_ownerUuid_idx" ON "Agent"("ownerUuid");

-- CreateIndex
CREATE INDEX "ApiKey_companyUuid_idx" ON "ApiKey"("companyUuid");

-- CreateIndex
CREATE INDEX "ApiKey_agentUuid_idx" ON "ApiKey"("agentUuid");

-- CreateIndex
CREATE INDEX "Comment_companyUuid_idx" ON "Comment"("companyUuid");

-- CreateIndex
CREATE INDEX "Comment_targetType_targetUuid_idx" ON "Comment"("targetType", "targetUuid");

-- CreateIndex
CREATE INDEX "Document_companyUuid_idx" ON "Document"("companyUuid");

-- CreateIndex
CREATE INDEX "Document_projectUuid_idx" ON "Document"("projectUuid");

-- CreateIndex
CREATE INDEX "Document_proposalUuid_idx" ON "Document"("proposalUuid");

-- CreateIndex
CREATE INDEX "Idea_companyUuid_idx" ON "Idea"("companyUuid");

-- CreateIndex
CREATE INDEX "Idea_projectUuid_idx" ON "Idea"("projectUuid");

-- CreateIndex
CREATE INDEX "Idea_assigneeUuid_idx" ON "Idea"("assigneeUuid");

-- CreateIndex
CREATE INDEX "Project_companyUuid_idx" ON "Project"("companyUuid");

-- CreateIndex
CREATE INDEX "Proposal_companyUuid_idx" ON "Proposal"("companyUuid");

-- CreateIndex
CREATE INDEX "Proposal_projectUuid_idx" ON "Proposal"("projectUuid");

-- CreateIndex
CREATE INDEX "Task_companyUuid_idx" ON "Task"("companyUuid");

-- CreateIndex
CREATE INDEX "Task_projectUuid_idx" ON "Task"("projectUuid");

-- CreateIndex
CREATE INDEX "Task_proposalUuid_idx" ON "Task"("proposalUuid");

-- CreateIndex
CREATE INDEX "Task_assigneeUuid_idx" ON "Task"("assigneeUuid");

-- CreateIndex
CREATE INDEX "User_companyUuid_idx" ON "User"("companyUuid");
