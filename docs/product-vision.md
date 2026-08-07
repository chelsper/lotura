# Product vision and continuous improvement

Lotura is intended to model how an organization actually operates: its processes, roles, ownership, systems, dependencies, exceptions, and institutional knowledge. It should not become only an SOP repository or internal wiki.

## Continuous improvement is part of the operating model

An operating model is incomplete if it records only the current definition of work. Lotura must also help an organization identify friction, decide what to change, and determine whether that change produced a durable improvement.

> An improvement is not complete when the new process is documented. It is complete when the result is measured and sustained.

This principle means that publishing revised instructions is evidence of implementation, not evidence of success. A completed improvement must connect the operational change to an expected benefit, an observed result, and a sustainment assessment over an appropriate period.

## Process history and improvement history are different

Process version history and improvement initiatives answer different questions and must remain separate concepts.

| Capability | Primary question | What it records | Completion meaning |
| --- | --- | --- | --- |
| Process version history | What was the approved operational definition at this point in time? | An immutable or historically recoverable process definition, its steps and related operating context, approval, effective period, and supersession | A definition was approved and made effective |
| Improvement initiative | Why should operations change, what changed, and did it work? | Identified friction, supporting evidence, the proposed change, affected processes and systems, approval, implementation, expected benefit, measurements, result, and sustainment | The result was measured and shown to persist, or the initiative was explicitly closed without a sustained result |

An improvement may affect several processes, systems, and process versions. Conversely, a process version may be created for reasons other than a formal improvement initiative. Approving or publishing a new process version must therefore never automatically mark an improvement complete.

## Relationship to FLOW

FLOW is the future Lotura product capability that carries continuous improvement through a closed learning loop. It is not a synonym for process documentation, a process version, or generic task execution.

FLOW should help an organization:

1. Surface and describe friction in the current operating model.
2. Attach observations, data, and other supporting evidence.
3. Connect the issue to affected processes, roles, dependencies, exceptions, and systems.
4. State a proposed change and its expected benefit.
5. Record the decision and implementation outcome without conflating approval with success.
6. Define how the result will be measured, including a baseline, target, observation period, and evidence source.
7. Compare expected and measured results.
8. Recheck the result over time and determine whether it was sustained.
9. Feed what was learned back into the operating model and future improvement work.

The future `Improvement` capability supplies FLOW with the durable initiative record. `ImprovementProcess` anchors the initiative to the operating model. `ImprovementMeasure` supplies the evidence needed to evaluate outcomes and sustainment. Process version history records any approved operational definitions produced along the way, but remains a separate audit trail.

FLOW does not change the Version 0.1 scope. Workflow execution, approvals, tasks, comments, notifications, AI, and process version history remain deferred until their behavior and boundaries are designed explicitly.
