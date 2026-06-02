import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Dev seed: reset so re-running doesn't pile up duplicate agents.
  await prisma.agent.deleteMany();

  const agent = await prisma.agent.create({
    data: {
      name: "Daily Competitor Intelligence",
      topicKeywords: ["LLM hardware", "NVIDIA H200"],
      cronSchedule: "0 7 * * *",
      systemPrompt:
        "Summarize the latest competitor and hardware news into a concise Markdown brief with section headers and bullet points. Cite the most relevant sources.",
      status: "ACTIVE",
      dataSources: {
        create: [
          {
            sourceType: "NEWS_API",
            apiEndpoint: "https://newsapi.org/v2/everything?q=NVIDIA",
            authSecretKeyRef: "NEWS_API_KEY",
          },
          {
            // Reddit public JSON (no auth; modeled as CUSTOM_SCRAPE).
            sourceType: "CUSTOM_SCRAPE",
            apiEndpoint: "https://www.reddit.com/r/hardware/new.json?limit=10",
            authSecretKeyRef: "NONE",
          },
        ],
      },
      deliveryChannels: {
        create: [
          {
            target: "SLACK",
            webhookUrl: "https://hooks.slack.com/services/REPLACE/ME",
            recipientList: [],
          },
        ],
      },
    },
  });

  console.log(`Seeded agent ${agent.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
