import { executeAgentPipeline } from "../lib/pipeline";

async function main() {
  const agentId = process.argv[2];
  if (!agentId) {
    console.error("Usage: npx ts-node scripts/run-pipeline.ts <agentId>");
    process.exit(1);
  }

  const result = await executeAgentPipeline(agentId);
  console.log(`Pipeline run complete for agent ${agentId}:`, result.outcome);

  if (result.outcome === "success") return;

  if (result.outcome === "skipped") {
    console.error(result.reason);
  } else {
    console.error(result.message);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
