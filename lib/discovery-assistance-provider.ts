import "server-only";

import {
  createMockClarityDraft,
  createMockQuestionSuggestions,
  validateMockSuggestions,
  type DiscoveryAssistancePacket,
  type DiscoveryAssistanceSuggestion,
} from "./discovery-assistance-model.mjs";

export type DiscoveryAssistanceProvider = {
  draftClarity(
    packet: DiscoveryAssistancePacket,
    originalText: string,
  ): Promise<DiscoveryAssistanceSuggestion>;
  key: string;
  modelIdentifier: string;
  promptPolicyVersion: string;
  suggestQuestions(
    packet: DiscoveryAssistancePacket,
  ): Promise<DiscoveryAssistanceSuggestion[]>;
};

function strictlyValidated(
  suggestions: DiscoveryAssistanceSuggestion[],
): DiscoveryAssistanceSuggestion[] {
  if (!validateMockSuggestions(suggestions)) {
    throw new Error("The assistance provider returned an invalid response.");
  }
  return suggestions;
}

export const discoveryAssistanceProvider: DiscoveryAssistanceProvider = {
  async draftClarity(packet, originalText) {
    return strictlyValidated([
      createMockClarityDraft(packet, originalText),
    ])[0];
  },
  key: "mocked_provider",
  modelIdentifier: "lotura-contextual-mock-v1",
  promptPolicyVersion: "lad-063-v1",
  async suggestQuestions(packet) {
    return strictlyValidated(createMockQuestionSuggestions(packet));
  },
};
