# Lotura Product Language

Lotura uses one product vocabulary so people can understand the operating model without learning a different dialect on every screen. Prefer the terms below in navigation, headings, help text, findings, documentation, and future feature proposals.

Use plain language before implementation or database terminology. Capitalize named Lotura concepts when the distinction adds clarity; use normal sentence case in ordinary prose. Pluralize the concept normally: Processes, Roles, Systems, Exceptions, and Dependencies.

| Preferred term | Concise definition | Example | Discouraged or confusing alternatives |
| --- | --- | --- | --- |
| Lotura | An organizational intelligence platform for understanding and safely evolving how work gets done. | “Open Lotura to review how service intake connects to eligibility.” | workflow app, SOP wiki, task manager |
| Organization | The institution whose operating model is being viewed. | Northstar Service Collective | Workspace when it means the Organization; tenant in primary UI |
| Organizational digital twin | A living, evidence-based representation of the Organization's structure, responsibility, work, technology, knowledge, relationships, and change. It is not automatically complete, approved, or real-time. | “Workspace Studio builds the Organization's digital twin.” | virtual organization, real-time twin when real-time evidence is absent, perfect copy |
| Workspace Studio | The governed authoring environment where authorized people build and maintain the organizational digital twin. | “Open Workspace Studio to add a Position.” | Administration as the product metaphor, settings console, database editor |
| Current documented model | The organization-scoped records represented in the visible snapshot, with their known limitations. | “The current documented model contains 27 Processes.” | complete organization, approved truth, live reality |
| Workspace Health | An explainable set of deterministic facts and review questions about the current documented model, never a composite score. | “Workspace Health shows that one Process has no documented Owner Role.” | health score, risk grade, performance dashboard |
| Activity | The chronological view of recorded structural and operating-model changes, retaining domain, actor, reason, effective time, and transaction time without implying causality. | “Activity shows when the Position was reassigned and when the Process owner changed.” | global history table, causal timeline, audit deletion log |
| Technology | The Studio area for Systems and their explicit operating-model relationships. The label preserves room for later approved technology concepts without creating them prematurely. | “Open Technology to link the case-management System to Service request intake.” | Systems when naming the broader Studio area, integrations hub before integrations exist |
| Discovery | The Studio direction for preserving and reviewing source evidence, resolving conflicts, acquiring Processes, and eventually conducting guided interviews. | “Discovery begins with reviewing the uploaded organizational source.” | import wizard when review and reconciliation are meant, AI-generated truth |
| Discovery session | A resumable, scoped interview about one existing Process. Its status describes capture progress, not approval. | “Pause the Service request intake Discovery session and resume at the Systems question.” | approved interview, Process version, chat |
| Discovery observation | An attributable, append-only answer or explicit unknown preserved as source evidence within a Discovery session. | “This observation needs validation before reconciliation.” | canonical Process fact, approved truth, AI output |
| Ready for review | A Discovery-session state meaning the bounded interview questions have been answered or classified. It does not mean reconciled, approved, imported, or current truth. | “The session is Ready for review; the Process remains unchanged.” | approved, complete Process, ready to publish |
| Known | An evidence classification stating that the participant represents an observation as current fact. It is not an institutional approval state. | “Known: checks are scanned when received.” | approved, verified by Lotura |
| Assumed | An evidence classification stating that the participant believes an observation is true but lacks confirming evidence. | “Assumed: Finance stores the check images.” | known, approved |
| Unknown | An explicit evidence classification preserving that an answer is not currently known. | “Unknown: the official Process endpoint.” | missing data error, incomplete failure |
| Needs validation | An evidence classification stating that an authoritative check is still required. | “Needs validation: the durable Owner Role.” | approved, confirmed |
| Conflicting observation | An evidence classification preserving credible disagreement without forcing immediate resolution. | “Conflicting observation: teams use different definitions of processed.” | error, resolved consensus |
| Organization overview | The orientation surface that explains the Organization as a connected operating model and recommends where to begin. | “Start with the Organization overview.” | dashboard, organization dashboard, operating-model page |
| Organization Structure | The documented Units, Positions, Position Assignments, and reporting relationships that describe structural context at a visible time. | “Open Organization to follow the Client Services reporting branch.” | org chart when the broader structural context is meant; approved truth |
| Organization Unit | A durable organizational grouping. Its hierarchy is shown only when a parent relationship is documented. | Client Services | department when the source does not establish that terminology; team inferred from reporting lines |
| Provisional Unit | An Organization Unit preserved from reviewed source evidence whose hierarchy or durable status has not been fully established. | “Community Partnerships is a Provisional Unit.” | confirmed department, inferred division |
| Position | A durable structural seat in the Organization, independent of its current occupant and Operational Roles. | Service Coordinator | Person, User, Operational Role, job title used as a durable identifier |
| Position Assignment | The effective-dated relationship recording a Person occupying or temporarily covering a Position. | Taylor Brooks has an acting Position Assignment to Community Liaison. | Operational Role coverage; job title |
| Reporting relationship | An effective-dated structural relationship between Positions. It does not assign Process ownership. | The Service Coordinator Position reports to the Client Services Lead Position. | Person reports to Person when the relationship is structural; Process ownership |
| Person | A human being represented in the organizational model. A Person does not need to be a Lotura User. | Amara Patel | User, account, employee record when that data is not present |
| Governance | The independently scoped rules and accountability that determine who may view, contribute to, approve, analyze, administer, or steward organizational knowledge. | “Governance assigns Process review authority without inferring it from reporting hierarchy.” | permissions hierarchy, org chart authority, administration when the broader concept is meant |
| Stewardship | Accountable care for keeping a defined body of organizational knowledge accurate and appropriately reviewed. | “Process Stewardship remains assigned when the current performer changes.” | ownership, management, administration, current assignment |
| Steward | A party explicitly designated to exercise Stewardship for defined organizational knowledge. A Steward is not automatically the manager, owner, administrator, or performer. | Process Steward | manager, Process Owner, system administrator, assignee |
| Workspace Administrator | A governance profile for configuring Lotura and maintaining canonical structures within explicit scope and audit boundaries. | “The Workspace Administrator may correct a Position title without becoming its Process Owner.” | executive, superuser who may bypass history, Operational Role |
| Contributor | A governance profile for supplying attributable evidence and proposing changes within permitted scope. | “A Contributor selects Suggest an update.” | editor who overwrites approved knowledge, Operational Role |
| Manager / Approver | A governance profile for reviewing, reconciling, or approving organizational knowledge within explicitly assigned scope. Reporting hierarchy does not create this profile automatically. | “The assigned Manager / Approver reviews a cross-functional Process proposal.” | reporting manager, universal approver, Operational Role |
| Leadership / Organizational Analyst | A governance profile for appropriately broad organizational visibility and analysis without implied Workspace Administration. | “A Leadership / Organizational Analyst explores a restructuring What-if.” | administrator, executive superuser, Operational Role |
| Suggest an update | The normal future contribution action for proposing attributable changes without overwriting approved organizational knowledge. | “Suggest an update to the documented Process.” | edit directly, overwrite, publish change |
| Role Mandate | The effective-dated allocation of an Operational Role to a Position. | The Client Services Lead Position holds the Client Services Lead Role mandate. | reporting relationship, title-derived responsibility |
| Role Coverage | The effective-dated Person-level coverage of a Role Mandate. | Taylor Brooks provides acting coverage for a Role Mandate. | Position Assignment, inferred responsibility |
| Imported structure snapshot | The canonical structural records Lotura evaluates at one visible time, together with their import-basis context. It is not automatically institutional truth. | “This is a Partial reviewed structure imported from reviewed evidence.” | current org chart when completeness is not established; approved truth |
| Partial reviewed structure | An imported structural basis that intentionally excludes unresolved or out-of-scope evidence. | “This workspace shows a Partial reviewed structure.” | incomplete failure, full organizational truth |
| Full reviewed import basis | An import basis whose approved scope was not marked partial. The phrase does not imply institutional approval or perfect completeness. | “The current snapshot uses a Full reviewed import basis.” | institutionally approved structure, absolute truth |
| Operating model | The connected Processes, Roles, people, Assignments, Systems, Exceptions, and Dependencies that describe how the Organization works. | The intake-to-delivery operating model | workflow library, process repository |
| Operating-model snapshot | The consistent set of records Lotura is showing at one visible time. | Data current as of Aug 7, 2026, 2:30 PM UTC | last updated when that is not what the timestamp means; independent timestamps per panel |
| Documented process | A Process definition present in the operating-model snapshot. The phrase does not imply approval unless approval data exists. | Client intake is a documented process. | approved process, read-only definition |
| Process | Repeatable work performed to achieve an outcome. | Receive a service request | workflow, SOP, procedure when Process is meant |
| Explorer | The place to browse, search, filter, and follow connections among documented Processes. | Filter Explorer to Processes using Relay CRM. | process detail, process library when connected context is meant |
| Process detail | The complete understanding surface for one Process, including purpose, accountability, context, dependencies, and Steps. | Open Receive a service request to understand its connected context. | Explorer when one Process is meant; SOP page |
| Step | One ordered part of a Process definition. | Confirm the requester’s contact information. | task when no work execution exists |
| Owner role | The durable Role intended to hold responsibility for a Process. | Owner role: Client Services Lead | owner, process owner person, assignee |
| Responsible role | The Role responsible for a Step, explicitly recorded or inherited from the Process owner. | Responsible role: Intake Coordinator | step owner person, task assignee |
| Role | Durable organizational responsibility that exists independently of one person. | Client Services Lead | job title when that equivalence is not established; user |
| Assignment | The relationship recording who fills a Role, in what capacity, and for what effective period. | Amara Patel has an acting Assignment to Client Services Lead. | role holder field, assignee when the Assignment relationship matters |
| Current Role coverage | The Person or People whose explicit Role Coverage is effective for an Operational Role at the operating-model snapshot time. Version 0.1 Assignment data may provide a compatibility view where canonical Role Coverage is unavailable. | Current Role coverage: Amara Patel — permanent coverage | owner, current assignment without Role context, inferred coverage |
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
| Documented reach | A neutral description of how many recorded operating-model relationships touch a Role, System, or Process. | This Role owns four Processes and is responsible for eleven Steps. | workload, performance, importance, risk score |
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

## Product-story rules

- Introduce the Organization before asking a first-time user to interpret individual Processes.
- Define an operating model in plain language before using the term as shorthand.
- Use **Explorer** for browsing and following local connections. Use **Process detail** for complete understanding of one Process.
- Use **Workspace Studio** for authorized maintenance. Keep Organization,
  Explorer, Process Detail, and FLOW as understanding surfaces rather than
  mixed browse/edit screens.
- Describe Studio inventory as the **current documented model**. Do not imply
  that record counts measure completeness, quality, performance, or approval.
- Use **Activity** for the combined chronological view while preserving each
  event's underlying domain ledger and avoiding invented causal links.
- Put Owner Role and current assignment together, while keeping their meanings distinct. Responsibilities remain; people change.
- Show Systems, Exceptions, and Process dependencies before the Step sequence when explaining why Lotura is more than a Process library.
- Keep What-if inside FLOW and always state that exploring a scenario changes and approves nothing.

## Grammar and capitalization

- Use sentence case for navigation and headings: “Items to review,” not “ITEMS TO REVIEW.”
- Use the exact plural **processes**, never “processs.”
- Prefer “1 process dependency” and “2 process dependencies.”
- Use Role, Process, System, Exception, Assignment, and FLOW as named domain concepts when explaining their meaning. Lowercase ordinary uses where capitalization would make the sentence feel technical or forced.
