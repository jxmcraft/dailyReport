1. SYSTEM ARCHITECTURE & DATA FLOW
The system operates as an event-driven background worker paired with a Next.js web application management portal.
Code snippet
graph TD
    A[Cron Trigger / EventBridge] -->|Wakes Up| B[Ingestion Worker]
    B -->|Fetch Target Data| C[External APIs: NewsAPI, Google Search, Crypto]
    C -->|Raw Payloads| B
    B -->|Sanitize & Truncate| D[Context Assembler]
    D -->|Structured Prompt Context| E[LLM Inference Engine: Gemini / GPT]
    E -->|Markdown Report Text| F[Delivery Router]
    F -->|Webhook Post / API Send| G[Slack / Discord / Email]
    F -->|Write Audit Log| H[Database: PostgreSQL via Prisma]

2. DATABASE COMPLIANCE SCHEMA (PRISMA ORM)
Copy and paste this schema directly into schema.prisma.
Code snippet
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}


generator client {
  provider = "prisma-client-js"
}


enum AgentStatus {
  ACTIVE
  PAUSED
  RUNNING
}


enum SourceType {
  NEWS_API
  GOOGLE_SEARCH
  CUSTOM_SCRAPE
  FINANCIAL_STREAM
}


enum DeliveryTarget {
  SLACK
  EMAIL
  DISCORD
}


enum ExecutionStatus {
  SUCCESS
  PARTIAL_FAILURE
  CRITICAL_ERROR
}


model Agent {
  id               String            @id @default(uuid())
  name             String
  topicKeywords    String[]
  cronSchedule     String            // Standard cron expression e.g., "0 7 * * *"
  systemPrompt     String            @db.Text
  status           AgentStatus       @default(ACTIVE)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  dataSources      DataSource[]
  deliveryChannels DeliveryChannel[]
  reports          IntelligenceReport[]
}


model DataSource {
  id               String     @id @default(uuid())
  agentId          String
  agent            Agent      @relation(fields: [agentId], references: [id], onDelete: Cascade)
  sourceType       SourceType
  apiEndpoint      String
  authSecretKeyRef String     // String name pointing to process.env mapping
}


model DeliveryChannel {
  id           String         @id @default(uuid())
  agentId      String
  agent        Agent          @relation(fields: [agentId], references: [id], onDelete: Cascade)
  target       DeliveryTarget
  webhookUrl   String
  recipientList String[]      // Array of emails, optional based on type
}


model IntelligenceReport {
  id                   String          @id @default(uuid())
  agentId              String
  agent                Agent           @relation(fields: [agentId], references: [id], onDelete: Cascade)
  timestamp            DateTime        @default(now())
  rawIngestedDataCount Int
  generatedMarkdown    String          @db.Text
  status               ExecutionStatus
  sourcesUsed          Json            // Array format matching SourceMetadata interface
}

3. UI STATE MACHINE & COMPONENT HIERARCHY
This section defines state expectations for frontend UI view layers using Tailwind and React states.
3.1 Pipeline Status Indicator State Machine
JSON
{
  "component": "PipelineStatusIndicator",
  "states": {
    "IDLE": {
      "badgeColor": "bg-slate-100 text-slate-700",
      "pulseAnimation": false,
      "description": "Agent awaiting scheduled cron trigger."
    },
    "FETCHING": {
      "badgeColor": "bg-amber-100 text-amber-700",
      "pulseAnimation": true,
      "description": "Connecting to external HTTP endpoints, parsing upstream payloads."
    },
    "SYNTHESIZING": {
      "badgeColor": "bg-blue-100 text-blue-700",
      "pulseAnimation": true,
      "description": "Injecting context matrix into target model API context window."
    },
    "DELIVERING": {
      "badgeColor": "bg-indigo-100 text-indigo-700",
      "pulseAnimation": true,
      "description": "Dispatching payload buffers via target protocol webhooks."
    },
    "COMPLETED": {
      "badgeColor": "bg-emerald-100 text-emerald-700",
      "pulseAnimation": false,
      "description": "Report successfully parsed and distributed."
    }
  }
}

4. STRICT TYPESCRIPT INTERFACES (APPLICATION CORE)
Save this inside @/types/agent.ts for end-to-end interface safety.
TypeScript
export interface SourceMetadata {
  title: string;
  url: string;
  snippet: string;
  timestampFetched: string;
}


export interface IngestionPayload {
  agentId: string;
  timestamp: string;
  rawPayloads: Array<{
    source: string;
    statusCode: number;
    data: any;
  }>;
}


export interface LLMProcessingContext {
  systemPrompt: string;
  dynamicContextChunk: string;
  maxTokensOutput: number;
  temperature: number;
}

5. CORE PIPELINE LOGIC (PSEUDO-CODE CONTRACT)
This acts as the implementation constraint blueprint for writing the backend pipeline handler execution block.
TypeScript
async function executeAgentPipeline(agentId: string): Promise<void> {
  // 1. Fetch Agent Config from Database
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    include: { dataSources: true, deliveryChannels: true }
  });
  if (!agent || agent.status === 'PAUSED') return;


  // 2. State Mutation -> FETCHING
  await updateAgentStatus(agentId, 'RUNNING');


  try {
    // 3. Loop and Ingest external APIs
    let compiledContextStrings = "";
    let extractedSourceMeta: SourceMetadata[] = [];


    for (const source of agent.dataSources) {
      const response = await fetch(source.apiEndpoint, {
        headers: { "Authorization": `Bearer ${process.env[source.authSecretKeyRef]}` }
      });
      const data = await response.json();
      
      // Truncation processing guardrails
      const stringified = JSON.stringify(data).substring(0, 24000); 
      compiledContextStrings += `\\nSource type [${source.sourceType}]: ${stringified}`;
    }


    // 4. State Mutation -> SYNTHESIZING
    // Call LLM API (Gemini/OpenAI) using systemic prompting engineering bounds
    const synthesizedMarkdownReport = await callLLM({
      systemPrompt: agent.systemPrompt,
      context: compiledContextStrings
    });


    // 5. State Mutation -> DELIVERING
    for (const channel of agent.deliveryChannels) {
      await dispatchToChannel(channel, synthesizedMarkdownReport);
    }


    // 6. Log success transaction record
    await db.intelligenceReport.create({
      data: {
        agentId,
        rawIngestedDataCount: agent.dataSources.length,
        generatedMarkdown: synthesizedMarkdownReport,
        status: 'SUCCESS',
        sourcesUsed: JSON.stringify(extractedSourceMeta)
      }
    });


  } catch (error) {
    // Handle processing anomalies cleanly
    await db.intelligenceReport.create({
      data: {
        agentId,
        rawIngestedDataCount: 0,
        generatedMarkdown: `Pipeline compilation error: ${error.message}`,
        status: 'CRITICAL_ERROR',
        sourcesUsed: '[]'
      }
    });
  } finally {
    await updateAgentStatus(agentId, 'ACTIVE');
  }
}

6. PROMPT CONTEXT WINDOW CONSTRAINTS
When constructing the core generation functions for Cursor to implement LLM calls:
Fallback Mitigation: If any payload is null, do not panic out of the code loop; log partial exception states cleanly.
Context Compression: Instruct Cursor to build a map-reduce style tokenizer wrapper if cumulative tokens exceed 128,000 tokens across multiple scrapers.
Execution Guard: Set maximum timeout explicitly inside API fetch clients to exactly 180000ms. """
with open("newsagent_prd_machine_readable.md", "w") as f: f.write(markdown_content)
print("Markdown generated successfully.")
Your machine-readable, copy-and-pastable PRD Markdown file is ready for direct use in Cursor IDE.


[file-tag: code-generated-file-0-1780369703410548173]


You can copy and paste the raw text block below directly into a file named `PRD.md` or `instructions.md` within your workspace, or copy sections straight into the Cursor chat window.


```markdown
# MACHINE-READABLE PRD: NEWSAGENT
================================================================================
Target Consumption Engine: Cursor IDE / LLM Context
File Context: System Architecture, Database Schema, API Contracts, UI State Machine
================================================================================


```json
{
  "project": "NewsAgent",
  "version": "1.0.0",
  "environment": "Next.js 14 (App Router), TypeScript, Prisma ORM, TailwindCSS, Shadcn/ui",
  "purpose": "Autonomous 24/7 background data ingestion, LLM compilation, and multi-channel notification engine."
}

1. SYSTEM ARCHITECTURE & DATA FLOW
The system operates as an event-driven background worker paired with a Next.js web application management portal.
Code snippet
graph TD
    A[Cron Trigger / EventBridge] -->|Wakes Up| B[Ingestion Worker]
    B -->|Fetch Target Data| C[External APIs: NewsAPI, Google Search, Crypto]
    C -->|Raw Payloads| B
    B -->|Sanitize & Truncate| D[Context Assembler]
    D -->|Structured Prompt Context| E[LLM Inference Engine: Gemini / GPT]
    E -->|Markdown Report Text| F[Delivery Router]
    F -->|Webhook Post / API Send| G[Slack / Discord / Email]
    F -->|Write Audit Log| H[Database: PostgreSQL via Prisma]

2. DATABASE COMPLIANCE SCHEMA (PRISMA ORM)
Copy and paste this schema directly into your schema.prisma file.
Code snippet
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}


generator client {
  provider = "prisma-client-js"
}


enum AgentStatus {
  ACTIVE
  PAUSED
  RUNNING
}


enum SourceType {
  NEWS_API
  GOOGLE_SEARCH
  CUSTOM_SCRAPE
  FINANCIAL_STREAM
}


enum DeliveryTarget {
  SLACK
  EMAIL
  DISCORD
}


enum ExecutionStatus {
  SUCCESS
  PARTIAL_FAILURE
  CRITICAL_ERROR
}


model Agent {
  id               String            @id @default(uuid())
  name             String
  topicKeywords    String[]
  cronSchedule     String            // Standard cron expression e.g., "0 7 * * *"
  systemPrompt     String            @db.Text
  status           AgentStatus       @default(ACTIVE)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  dataSources      DataSource[]
  deliveryChannels DeliveryChannel[]
  reports          IntelligenceReport[]
}


model DataSource {
  id               String     @id @default(uuid())
  agentId          String
  agent            Agent      @relation(fields: [agentId], references: [id], onDelete: Cascade)
  sourceType       SourceType
  apiEndpoint      String
  authSecretKeyRef String     // String name pointing to process.env mapping
}


model DeliveryChannel {
  id           String         @id @default(uuid())
  agentId      String
  agent        Agent          @relation(fields: [agentId], references: [id], onDelete: Cascade)
  target       DeliveryTarget
  webhookUrl   String
  recipientList String[]      // Array of emails, optional based on type
}


model IntelligenceReport {
  id                   String          @id @default(uuid())
  agentId              String
  agent                Agent           @relation(fields: [agentId], references: [id], onDelete: Cascade)
  timestamp            DateTime        @default(now())
  rawIngestedDataCount Int
  generatedMarkdown    String          @db.Text
  status               ExecutionStatus
  sourcesUsed          Json            // Array format matching SourceMetadata interface
}

3. UI STATE MACHINE & COMPONENT HIERARCHY
This section defines state expectations for frontend UI view layers using Tailwind and React states.
3.1 Pipeline Status Indicator State Machine
JSON
{
  "component": "PipelineStatusIndicator",
  "states": {
    "IDLE": {
      "badgeColor": "bg-slate-100 text-slate-700",
      "pulseAnimation": false,
      "description": "Agent awaiting scheduled cron trigger."
    },
    "FETCHING": {
      "badgeColor": "bg-amber-100 text-amber-700",
      "pulseAnimation": true,
      "description": "Connecting to external HTTP endpoints, parsing upstream payloads."
    },
    "SYNTHESIZING": {
      "badgeColor": "bg-blue-100 text-blue-700",
      "pulseAnimation": true,
      "description": "Injecting context matrix into target model API context window."
    },
    "DELIVERING": {
      "badgeColor": "bg-indigo-100 text-indigo-700",
      "pulseAnimation": true,
      "description": "Dispatching payload buffers via target protocol webhooks."
    },
    "COMPLETED": {
      "badgeColor": "bg-emerald-100 text-emerald-700",
      "pulseAnimation": false,
      "description": "Report successfully parsed and distributed."
    }
  }
}

4. STRICT TYPESCRIPT INTERFACES (APPLICATION CORE)
Save this inside @/types/agent.ts for end-to-end interface safety.
TypeScript
export interface SourceMetadata {
  title: string;
  url: string;
  snippet: string;
  timestampFetched: string;
}


export interface IngestionPayload {
  agentId: string;
  timestamp: string;
  rawPayloads: Array<{
    source: string;
    statusCode: number;
    data: any;
  }>;
}


export interface LLMProcessingContext {
  systemPrompt: string;
  dynamicContextChunk: string;
  maxTokensOutput: number;
  temperature: number;
}

5. CORE PIPELINE LOGIC (PSEUDO-CODE CONTRACT)
This acts as the implementation constraint blueprint for writing the backend pipeline handler execution block.
TypeScript
async function executeAgentPipeline(agentId: string): Promise<void> {
  // 1. Fetch Agent Config from Database
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    include: { dataSources: true, deliveryChannels: true }
  });
  if (!agent || agent.status === 'PAUSED') return;


  // 2. State Mutation -> FETCHING
  await updateAgentStatus(agentId, 'RUNNING');


  try {
    // 3. Loop and Ingest external APIs
    let compiledContextStrings = "";
    let extractedSourceMeta: SourceMetadata[] = [];


    for (const source of agent.dataSources) {
      const response = await fetch(source.apiEndpoint, {
        headers: { "Authorization": `Bearer ${process.env[source.authSecretKeyRef]}` }
      });
      const data = await response.json();
      
      // Truncation processing guardrails
      const stringified = JSON.stringify(data).substring(0, 24000); 
      compiledContextStrings += `\nSource type [${source.sourceType}]: ${stringified}`;
    }


    // 4. State Mutation -> SYNTHESIZING
    // Call LLM API (Gemini/OpenAI) using systemic prompting engineering bounds
    const synthesizedMarkdownReport = await callLLM({
      systemPrompt: agent.systemPrompt,
      context: compiledContextStrings
    });


    // 5. State Mutation -> DELIVERING
    for (const channel of agent.deliveryChannels) {
      await dispatchToChannel(channel, synthesizedMarkdownReport);
    }


    // 6. Log success transaction record
    await db.intelligenceReport.create({
      data: {
        agentId,
        rawIngestedDataCount: agent.dataSources.length,
        generatedMarkdown: synthesizedMarkdownReport,
        status: 'SUCCESS',
        sourcesUsed: JSON.stringify(extractedSourceMeta)
      }
    });


  } catch (error) {
    // Handle processing anomalies cleanly
    await db.intelligenceReport.create({
      data: {
        agentId,
        rawIngestedDataCount: 0,
        generatedMarkdown: `Pipeline compilation error: ${error.message}`,
        status: 'CRITICAL_ERROR',
        sourcesUsed: '[]'
      }
    });
  } finally {
    await updateAgentStatus(agentId, 'ACTIVE');
  }
}

6. PROMPT CONTEXT WINDOW CONSTRAINTS
When constructing the core generation functions for Cursor to implement LLM calls:
Fallback Mitigation: If any payload is null, do not panic out of the code loop; log partial exception states cleanly.
Context Compression: Instruct Cursor to build a map-reduce style tokenizer wrapper if cumulative tokens exceed 128,000 tokens across multiple scrapers.
Execution Guard: Set maximum timeout explicitly inside API fetch clients to exactly 180000ms.




