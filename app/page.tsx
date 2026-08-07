import seedData from "@/db/seeds/process-explorer.json";
import { buildFlowAnalysis } from "@/lib/flow-analysis.mjs";
import {
  buildProcessExplorerData,
  type ProcessExplorerSeed,
} from "@/lib/process-explorer-data";

import { ProcessExplorer } from "./process-explorer";

export default function Home() {
  const asOf = new Date().toISOString();
  const seed = seedData as ProcessExplorerSeed;
  const data = buildProcessExplorerData(seed, asOf);
  const analysis = buildFlowAnalysis(seed, asOf);

  return <ProcessExplorer analysis={analysis} data={data} />;
}
