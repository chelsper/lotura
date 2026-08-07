# Lotura Product Language

Lotura uses one product vocabulary so people can understand the operating model without learning a different dialect on every screen. Prefer the terms below in navigation, headings, help text, findings, documentation, and future feature proposals.

Use plain language before implementation or database terminology. Capitalize named Lotura concepts when the distinction adds clarity; use normal sentence case in ordinary prose. Pluralize the concept normally: Processes, Roles, Systems, Exceptions, and Dependencies.

| Preferred term | Concise definition | Example | Discouraged or confusing alternatives |
| --- | --- | --- | --- |
| Lotura | An organizational intelligence platform for understanding and safely evolving how work gets done. | “Open Lotura to review how service intake connects to eligibility.” | workflow app, SOP wiki, task manager |
| Organization | The institution whose operating model is being viewed. | Northstar Service Collective | Workspace when it means the Organization; tenant in primary UI |
| Operating model | The connected Processes, Roles, people, Assignments, Systems, Exceptions, and Dependencies that describe how the Organization works. | The intake-to-delivery operating model | workflow library, process repository |
| Operating-model snapshot | The consistent set of records Lotura is showing at one visible time. | Data current as of Aug 7, 2026, 2:30 PM UTC | last updated when that is not what the timestamp means; independent timestamps per panel |
| Documented process | A Process definition present in the operating-model snapshot. The phrase does not imply approval unless approval data exists. | Client intake is a documented process. | approved process, read-only definition |
| Process | Repeatable work performed to achieve an outcome. | Receive a service request | workflow, SOP, procedure when Process is meant |
| Step | One ordered part of a Process definition. | Confirm the requester’s contact information. | task when no work execution exists |
| Owner role | The durable Role intended to hold responsibility for a Process. | Owner role: Client Services Lead | owner, process owner person, assignee |
| Responsible role | The Role responsible for a Step, explicitly recorded or inherited from the Process owner. | Responsible role: Intake Coordinator | step owner person, task assignee |
| Role | Durable organizational responsibility that exists independently of one person. | Client Services Lead | job title when that equivalence is not established; user |
| Assignment | The relationship recording who fills a Role, in what capacity, and for what effective period. | Amara Patel has an acting Assignment to Client Services Lead. | role holder field, assignee when the Assignment relationship matters |
| Current assignment | The person whose primary Assignment is effective at the operating-model snapshot time. | Current assignment: Amara Patel | owner, current assignee without Role context |
| System | Technology, an external service, or an operational record used by the work. | Relay CRM | app when the record may be a service or manual record |
| Exception | A legitimate alternate path used when the standard Process does not apply. | Required information is missing. | error, edge case, note |
| Process dependency | A recorded connection showing how one Process relies on, supplies, or triggers another. | Receiving a request triggers eligibility assessment. | connection when Process dependency is meant; integration |
| Upstream | Processes this work relies on. | Eligibility assessment relies on service intake. | before, previous process when sequence alone is not established |
| Downstream | Processes that receive or follow this work. | Service delivery follows eligibility assessment. | after, next process when sequence alone is not established |
| FLOW | An evidence-based review of the operating model for gaps, concentrations, and possible change impact. | FLOW surfaces acting Role coverage for review. | dashboard, health score, AI analysis, deterministic analysis in primary UI |
| Item to review | A documented question or gap that may need human attention or more evidence. | A Role has no current primary Assignment. | current finding, failure, issue when failure is not proved |
| Direct impact | The selected change explicitly touches a recorded operating-model relationship. | A Process directly linked to an unavailable System is in the direct-impact set. | affected without qualification; certain failure |
| Potential indirect impact | A connected part of the operating model may also be affected. | A downstream Process may need review after an upstream change. | direct impact, guaranteed consequence |
| Review recommended | The model identifies a question that needs human judgment or more evidence. | Review whether acting coverage remains current. | required change, failed control, automatic recommendation |
| What-if | A read-only exploration of what might need review if a Role, System, or Process changes. | What if Relay CRM becomes unavailable? | simulation when outcomes are not predicted; approved scenario |
| Fictional sample organization | Clearly labelled fictional operating-model data used for demonstration or tests. | Northstar appears as a Fictional sample organization in demo mode. | fictional demo, live sample, customer data |
| Live database | The configured Organization’s current read-only Neon snapshot. | Data source: Live database | production data when environment and approval state are unknown |
| Explore only | A trust statement that the current surface cannot change data. | Explore only — nothing you do here changes data. | read-only workspace when “workspace” could mean the Organization |

## Evidence and trust rules

- Keep **direct impact**, **potential indirect impact**, and **review recommended** separate in both wording and visual treatment.
- Describe concentration as documented reach. Do not imply workload, performance, importance, or risk from relationship counts.
- Do not call a Process approved unless the data actually contains an approval state.
- Do not say graph connectivity proves operational failure, causation, or mandatory change.
- Say **Fictional sample organization** whenever fictional records are visible. Say **Live database** only when the live source succeeds.
- Use **evidence-based review** in primary UI. Reserve implementation terms such as deterministic, table names, and field names for methodology disclosures and technical documentation.

## Grammar and capitalization

- Use sentence case for navigation and headings: “Items to review,” not “ITEMS TO REVIEW.”
- Use the exact plural **processes**, never “processs.”
- Prefer “1 process dependency” and “2 process dependencies.”
- Use Role, Process, System, Exception, Assignment, and FLOW as named domain concepts when explaining their meaning. Lowercase ordinary uses where capitalization would make the sentence feel technical or forced.
