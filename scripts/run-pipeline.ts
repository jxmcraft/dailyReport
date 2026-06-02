import { executeAgentPipeline } from "../lib/pipeline";

async function main() {
  const agentId = process.argv[2];
  if (!agentId) {
    console.error("Usage: npx ts-node scripts/run-pipeline.ts <agentId>");
    process.exit(1);
  }

  await executeAgentPipeline(agentId);
  console.log(`Pipeline run complete for agent ${agentId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
