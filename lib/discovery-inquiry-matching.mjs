const COMMON_WORDS = new Set([
  "about",
  "actually",
  "after",
  "before",
  "does",
  "from",
  "happen",
  "happens",
  "have",
  "into",
  "process",
  "should",
  "that",
  "their",
  "there",
  "these",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "work",
  "would",
]);

function normalized(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function canonicalToken(token) {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

function meaningfulTokens(value) {
  return new Set(
    normalized(value)
      .split(" ")
      .filter((token) => token.length >= 2 && !COMMON_WORDS.has(token))
      .map(canonicalToken),
  );
}

function firstOverlap(left, right) {
  return [...left].filter((token) => right.has(token)).sort()[0] ?? null;
}

function explainMatch(question, candidate) {
  const normalizedQuestion = normalized(question);
  const normalizedName = normalized(candidate.name);
  if (!normalizedQuestion || !normalizedName) return null;

  if (
    normalizedName.length >= 3 &&
    ` ${normalizedQuestion} `.includes(` ${normalizedName} `)
  ) {
    return `Your question includes “${candidate.name}”.`;
  }

  if (
    normalizedQuestion.length >= 3 &&
    ` ${normalizedName} `.includes(` ${normalizedQuestion} `)
  ) {
    return `The name includes “${question.trim()}”.`;
  }

  const questionTokens = meaningfulTokens(question);
  const nameOverlap = firstOverlap(questionTokens, meaningfulTokens(candidate.name));
  if (nameOverlap) return `The name shares “${nameOverlap}” with your question.`;

  const descriptionOverlap = firstOverlap(
    questionTokens,
    meaningfulTokens(candidate.description ?? ""),
  );
  if (descriptionOverlap) {
    return `The description shares “${descriptionOverlap}” with your question.`;
  }

  return null;
}

export function findPossibleDiscoveryPlaces(question, candidates) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      explanation: explainMatch(question, candidate),
    }))
    .filter((candidate) => candidate.explanation !== null)
    .sort((left, right) =>
      left.kind.localeCompare(right.kind, "en-US") ||
      left.name.localeCompare(right.name, "en-US"),
    );
}
