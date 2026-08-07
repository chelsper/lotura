# Lotura Design System v1

## Purpose

Lotura is professional software for understanding an organization’s operating model. People may use it throughout the day, so the interface should feel calm, precise, lightweight, and trustworthy rather than promotional or theatrical.

The visual metaphor is an organization’s blueprint: structured, connected, inspectable, and spacious enough to think in.

## Design principles

1. **White space is a feature.** Space separates ideas and creates hierarchy before borders or color are introduced.
2. **Typography does most of the work.** Size, weight, line height, and placement establish meaning. Decoration remains secondary.
3. **Color communicates state.** Neutral colors build the workspace; accent and semantic colors identify state, evidence, warnings, and actions.
4. **Quiet interfaces support sustained attention.** Avoid visual competition between navigation, content, and controls.
5. **Empty states should still feel complete.** A sparse workspace should appear intentional, useful, and ready—not unfinished.
6. **Evidence is more important than spectacle.** FLOW findings favor concise language, ranked lists, tables, and expandable support over dashboard theatrics.
7. **Reusable components preserve product meaning.** A badge, alert, panel, or input should behave and communicate consistently wherever it appears.
8. **Configurable, not bespoke.** Organization identity may customize presentation, but Lotura retains control of interaction design, semantic colors, accessibility, evidence language, and product behavior.

## Visual character

Lotura should feel:

- clean;
- modern;
- calm;
- lightweight;
- intelligent;
- trustworthy; and
- minimal.

Relevant product references include Linear, Notion, Vercel, Stripe Dashboard, GitHub, Raycast, and Figma. Lotura should learn from their restraint, hierarchy, density control, and interaction quality without imitating a specific brand.

Avoid:

- enterprise-software clutter;
- oversized KPI cards;
- large colorful dashboards;
- decorative gradients;
- heavy borders;
- unnecessary shadows;
- skeuomorphic effects;
- busy navigation;
- oversized cards; and
- color used without semantic meaning.

## Foundations

### Color

The core palette is neutral with one restrained evergreen accent.

| Token | Purpose | Reference value |
| --- | --- | --- |
| `canvas` | Application background | `#f7f7f5` |
| `surface` | Primary content surface | `#ffffff` |
| `surface-subtle` | Secondary grouped surface | `#f4f5f3` |
| `surface-hover` | Quiet hover and selection context | `#f0f1ef` |
| `border` | Default separation | `#e5e7e3` |
| `border-strong` | Emphasized separation and focus context | `#d3d7d1` |
| `text` | Primary text | `#1c1f1d` |
| `text-secondary` | Supporting text | `#5f665f` |
| `text-tertiary` | Metadata and placeholders | `#858c86` |
| `accent` | Primary action and active state | `#286653` |
| `accent-hover` | Accent hover state | `#205746` |
| `accent-subtle` | Selected and contextual accent surface | `#edf4f1` |

Semantic colors are limited to:

- success: positive or confirmed state;
- warning: caution or incomplete attention;
- error: failure, destructive risk, or unavailable state; and
- informational: neutral explanatory state.

Semantic colors should use muted foregrounds and pale surfaces. Bright saturation is reserved for rare, high-importance signals.

#### Workspace identity and protected tokens

Organization customization is configuration layered on top of the Lotura Design System, not unrestricted theming.

- `workspace-accent`, `workspace-accent-hover`, `workspace-accent-subtle`, `workspace-accent-border`, `workspace-accent-foreground`, and `workspace-focus-ring` control workspace identity and active presentation.
- success, warning, error, and informational tokens remain Lotura-controlled semantic colors.
- `evidence-direct`, `evidence-indirect`, and `evidence-review` remain Lotura-controlled evidence tokens. Organization branding must never redefine them.
- contrast utilities must validate any future persisted accent before it enters the resolved appearance.

The Version 0.2 resolver is intentionally non-persistent. It accepts only `Organization.name`, derives a monogram or Lotura-mark fallback, and supplies the Lotura evergreen accent. It has no environment-driven branding, hidden settings source, or customer-specific conditional.

### Typography

Geist remains the primary typeface, with Geist Mono available for identifiers, timestamps, and technical values.

- Page title: confident, 30–36px, medium-to-semibold weight, tight tracking.
- Section title: 18–22px, medium-to-semibold weight.
- Body: 14px with comfortable 1.5–1.65 line height.
- Secondary label: 11–12px, medium weight, usually sentence case.
- Metadata: 11–12px, regular-to-medium weight, lower contrast.

Bold text is used sparingly. Uppercase is reserved for very short status or structural labels and should not become the default hierarchy mechanism.

### Spacing

The primary spacing rhythm uses 4, 8, 12, 16, 24, 32, 48, and 64px. Components should prefer internal consistency over filling available space. Page regions need more space than related controls inside a region.

### Shape and depth

- Small control radius: 8px.
- Standard component radius: 10–12px.
- Major surface radius: 14–16px.
- Pills are reserved for status, filters, and compact segmented controls.
- Default surfaces use a one-pixel border without a shadow.
- Shadows are reserved for dialogs, menus, or genuinely layered floating surfaces.

## Application shell

Desktop uses a quiet left sidebar containing the Lotura identity, Organization context, and only available destinations. Navigation should not advertise inactive features as clickable.

The long-term information architecture may include:

- Home;
- Explorer;
- FLOW Analysis;
- Processes;
- Roles;
- Systems;
- Improvements; and
- Settings.

Until those destinations exist, the interface should show only functioning navigation. Tablet may use a compact sidebar or top navigation. Mobile uses a compact header and horizontal destination switcher while preserving the same hierarchy.

## Component language

### Buttons

- Primary: restrained accent fill for the clearest available action.
- Secondary: white or subtle surface with a quiet border.
- Ghost: no container until hover; used for low-priority actions.
- Destructive: semantic error treatment, only for confirmed destructive actions.

Controls use 36–40px heights in dense workspaces and at least 44px touch targets where practical on small screens. Every variant needs visible hover, active, disabled, and keyboard-focus states.

### Inputs and search

Inputs use a white surface, quiet border, and clear focus ring. Search remains visible on list and table views. Placeholder text describes the searchable subject. Filters should be adjacent to search and show when they are active.

### Tables

Tables resemble Linear or GitHub: strong column alignment, comfortable rows, minimal horizontal rules, visible hover, and persistent search/filter context. Containers should not add a second heavy border around every cell.

### Badges and chips

Badges communicate status or evidence using compact text and semantic tone. Chips communicate selected filters, compact metadata, or removable choices. Neither should become decorative confetti.

### Alerts

Alerts communicate a specific state, consequence, and next step. They use a quiet semantic surface, one icon, and concise language. Runtime source fallback must remain unambiguous.

### Cards and panels

Cards group one coherent idea. Side panels hold persistent contextual information such as ownership and dependencies. Avoid nesting multiple decorated cards when spacing and a divider can express the relationship.

### Dialogs

Dialogs are reserved for focused decisions or short tasks that should temporarily interrupt the page. They require a clear title, dismiss path, keyboard behavior, and action hierarchy. Complex process capture belongs on a dedicated wizard surface rather than inside a large dialog.

### Expandable sections

Expandable sections reduce walls of text while keeping the information architecture visible. Their summary should state the subject and record count. Core context may begin open; secondary evidence may begin collapsed.

## Process Explorer

- Keep search visible and role/system filters adjacent.
- Present the process index as a calm, scannable list rather than a field of promotional cards.
- Use selected state, typography, and alignment instead of a large block of saturated color.
- Keep purpose near the process title.
- Show owner Role and current assignee distinctly.
- Render ordered Steps like a checklist or sequence.
- Use expandable sections for Steps, Exceptions, and Systems.
- Show dependencies as directional relationships with direct navigation.
- Preserve empty and retired states without hiding them.

## FLOW Analysis

FLOW must not resemble a BI dashboard.

Do not use speedometers, gauges, giant KPI tiles, visual risk theater, or arbitrary composite scores. Prefer:

- concise findings;
- ranked or ordered lists;
- visible evidence language;
- compact facts;
- expandable “How this was determined” explanations;
- clean tables; and
- explicit limitations.

**Direct impact**, **potential indirect impact**, and **review recommended** remain visually and semantically distinct. Color should support the wording, never replace it.

## Home

Home should feel like opening a well-organized workspace rather than an analytics dashboard. Its initial orientation experience includes:

- a plain-language explanation of Lotura;
- visible Organization, data-source, and operating-model-snapshot context;
- direct paths to Explorer, FLOW Analysis, and the core vocabulary; and
- an explicit explore-only trust statement.

Search, recent Processes, current gaps, continued documentation, and Process capture remain future Home capabilities rather than dashboard requirements.

## Future Process Capture

Process Capture should resemble a premium setup wizard:

- one clear question at a time;
- generous white space;
- a quiet progress indicator;
- large, accessible text inputs;
- preserved context and provenance; and
- minimal distraction.

The visual pattern does not authorize capture, editing, AI, or database writes. Those capabilities remain subject to their product and architecture decisions.

## Responsiveness

Desktop is the primary target, followed by tablet. Mobile must remain usable for browsing and reviewing, but it is not the primary authoring target today.

- Desktop: persistent sidebar, two-column Explorer, contextual side panel.
- Tablet: compact navigation, stacked or balanced content columns.
- Mobile: single column, visible search, horizontally scrollable compact controls where necessary, and no clipped evidence.

Responsive behavior must preserve content and functionality rather than removing important context.

## Accessibility

- Use semantic headings, landmarks, lists, tables, buttons, labels, and native disclosure controls.
- Maintain visible keyboard focus with sufficient contrast.
- Do not encode state by color alone.
- Respect reduced-motion preferences.
- Provide at least WCAG AA contrast for text and essential controls.
- Keep touch targets usable and reading order logical at every supported width.
- Use plain language for status, empty states, errors, and evidence.

## Version 1 implementation boundary

Design System v1 establishes tokens, reusable component primitives, the application shell, and a restyling of the existing read-only Explorer and FLOW Analysis.

It does not add or change routes, database access, operating-model data, schema, migrations, analysis rules, authentication, editing, process capture, AI, deployment, or infrastructure.

## Version 0.2 orientation amendment

The Orientation & Comprehension Pass adds Home, Explorer, and FLOW routes; shared Organization appearance; canonical product language; explicit source and snapshot context; and comprehension-focused presentation copy. It remains read-only and reuses the Version 0.1 operating-model projection and FLOW calculations unchanged.

The smallest planned persistence change for Organization appearance is a future, separately approved migration adding nullable `displayName`, `logoUrl`, and `accentColor` fields to Organization. That migration, an appearance Settings surface, writes, logo storage, and broader Organization settings are intentionally deferred. Future settings may include terminology preferences, Process naming conventions, default statuses, governance rules, workflow and approval settings, knowledge-state behavior, notification preferences, AI permissions, data-retention settings, integrations, and role and access configuration; none are implemented here.
