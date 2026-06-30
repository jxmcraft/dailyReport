import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("seed.ts wipes all agents — refused in production.");
    process.exit(1);
  }

  // Dev seed: reset so re-running doesn't pile up duplicate agents.
  await prisma.agent.deleteMany();

  // Built-in providers (News, Reddit, Hacker News, Google) run from topic keywords
  // and .env API keys — not from DataSource rows. See lib/pipeline.ts.
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
            // Optional user webpage URL (scraped as additional source).
            sourceType: "CUSTOM_SCRAPE",
            apiEndpoint: "https://en.wikipedia.org/wiki/Nvidia",
            authSecretKeyRef: "NONE",
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
