import { connection } from "next/server";

import { buildFlowAnalysis } from "@/lib/flow-analysis.mjs";
import { buildProcessExplorerData } from "@/lib/process-explorer-data";
import { loadOperatingModel } from "@/lib/process-explorer-source";

import { ProcessExplorer } from "./process-explorer";

export default async function Home() {
  await connection();

  const { asOf, seed, source } = await loadOperatingModel();
  const data = buildProcessExplorerData(seed, asOf);
  const analysis = buildFlowAnalysis(seed, asOf);

  return <ProcessExplorer analysis={analysis} data={data} source={source} />;
}
