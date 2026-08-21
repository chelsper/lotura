function compactUnique(values) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))];
}

function numbered(values) {
  return values.map((value, index) => `${index + 1}. ${value}`);
}

export function buildDocumentedQuestionContext(process, promptKey) {
  if (!process) return null;

  const activeSteps = [...(process.steps || [])]
    .sort((left, right) => left.position - right.position);

  switch (promptKey) {
    case "purpose":
      return process.purpose
        ? {
            heading: "Current documented purpose",
            lines: [process.purpose],
          }
        : null;
    case "boundary_start":
      return activeSteps[0]
        ? {
            heading: "First documented step",
            lines: [
              `${activeSteps[0].title}. This is the first recorded step, not a separately approved start boundary.`,
            ],
          }
        : null;
    case "boundary_end":
      return activeSteps.at(-1)
        ? {
            heading: "Last documented step",
            lines: [
              `${activeSteps.at(-1).title}. This is the last recorded step, not a separately approved end boundary.`,
            ],
          }
        : null;
    case "participants_responsibility": {
      const responsibilityNames = compactUnique([
        process.ownerRole?.name
          ? `Process owner: ${process.ownerRole.name}`
          : null,
        ...activeSteps.map((step) => step.responsibleRole?.name
          ? `Step responsibility: ${step.responsibleRole.name}`
          : null),
      ]);
      return responsibilityNames.length > 0
        ? { heading: "Documented responsibility", lines: responsibilityNames }
        : null;
    }
    case "sequence":
      return activeSteps.length > 0
        ? {
            heading: "Current documented steps",
            lines: numbered(activeSteps.map((step) => step.title)),
          }
        : null;
    case "systems": {
      const systems = (process.systems || []).map((system) =>
        system.usage
          ? `${system.name}: ${system.usage}`
          : system.name
      );
      return systems.length > 0
        ? { heading: "Documented technology", lines: systems }
        : null;
    }
    case "exceptions": {
      const exceptions = (process.exceptions || []).map((exception) =>
        `${exception.name}: ${exception.condition}`
      );
      return exceptions.length > 0
        ? { heading: "Documented alternate paths", lines: exceptions }
        : null;
    }
    case "dependencies_handoffs": {
      const dependencies = [
        ...(process.upstream || []).map((item) =>
          `Before this Process: ${item.processName}`
        ),
        ...(process.downstream || []).map((item) =>
          `After this Process: ${item.processName}`
        ),
      ];
      return dependencies.length > 0
        ? { heading: "Documented connections", lines: dependencies }
        : null;
    }
    default:
      return null;
  }
}

export function buildInquiryKnownContext({
  currentPromptKey,
  observations,
  questionText,
  scopeStatement,
}) {
  const superseded = new Set(
    observations
      .map((observation) => observation.supersedesObservationId)
      .filter(Boolean),
  );
  const activeSavedAnswers = observations
    .filter((observation) => !superseded.has(observation.id))
    .filter((observation) => observation.promptKey !== currentPromptKey)
    .slice(-3)
    .map((observation) => ({
      id: observation.id,
      label: observation.promptText,
      state: observation.epistemicState,
      text: observation.responseText || "This remains explicitly unknown.",
    }));

  return {
    questionText,
    savedAnswers: activeSavedAnswers,
    scopeStatement,
  };
}
