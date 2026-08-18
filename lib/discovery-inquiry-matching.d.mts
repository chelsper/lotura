export type DiscoveryPlaceCandidate = {
  description?: string | null;
  href: string;
  key: string;
  kind: "process" | "process_family";
  name: string;
};

export type PossibleDiscoveryPlace = DiscoveryPlaceCandidate & {
  explanation: string;
};

export function findPossibleDiscoveryPlaces(
  question: string,
  candidates: DiscoveryPlaceCandidate[],
): PossibleDiscoveryPlace[];
