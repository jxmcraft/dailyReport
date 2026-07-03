-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'RUNNING');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('NEWS_API', 'GOOGLE_SEARCH', 'CUSTOM_SCRAPE', 'FINANCIAL_STREAM');

-- CreateEnum
CREATE TYPE "DeliveryTarget" AS ENUM ('SLACK', 'EMAIL', 'DISCORD');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('SUCCESS', 'PARTIAL_FAILURE', 'CRITICAL_ERROR');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING_REVIEW', 'DISTRIBUTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "llmTimeoutMs" INTEGER NOT NULL DEFAULT 180000,
    "sourceFetchTimeoutMs" INTEGER NOT NULL DEFAULT 60000,
    "activeRunPollMs" INTEGER NOT NULL DEFAULT 4000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topicKeywords" TEXT[],
    "cronSchedule" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "relevanceMinScore" INTEGER NOT NULL DEFAULT 3,
    "minRankedSources" INTEGER NOT NULL DEFAULT 3,
    "keywordMatchMode" TEXT NOT NULL DEFAULT 'OR',
    "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "apiEndpoint" TEXT NOT NULL,
    "authSecretKeyRef" TEXT NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryChannel" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "target" "DeliveryTarget" NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "recipientList" TEXT[],
    "approverList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requireEmailApproval" BOOLEAN NOT NULL DEFAULT true,
    "autoSendEmail" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DeliveryChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceReport" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawIngestedDataCount" INTEGER NOT NULL,
    "generatedMarkdown" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "statusNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourcesUsed" JSONB NOT NULL,
    "sourceDiagnostics" JSONB,
    "emailDeliveryStatus" "EmailDeliveryStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "emailApprovalTokenHash" TEXT,
    "emailApprovedAt" TIMESTAMP(3),
    "emailApprovedBy" TEXT,

    CONSTRAINT "IntelligenceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulerFire" (
    "agentId" TEXT NOT NULL,
    "minuteKey" TEXT NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchedulerFire_pkey" PRIMARY KEY ("agentId","minuteKey")
);

-- CreateIndex
CREATE INDEX "SchedulerFire_firedAt_idx" ON "SchedulerFire"("firedAt");

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChannel" ADD CONSTRAINT "DeliveryChannel_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceReport" ADD CONSTRAINT "IntelligenceReport_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
