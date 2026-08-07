import seedData from "@/db/seeds/process-explorer.json";
import {
  buildProcessExplorerData,
  type ProcessExplorerSeed,
} from "@/lib/process-explorer-data";

import { ProcessExplorer } from "./process-explorer";

export default function Home() {
  const data = buildProcessExplorerData(seedData as ProcessExplorerSeed);

  return <ProcessExplorer data={data} />;
}
