# Reliva Visibility — Design System v0.1

Status: active foundation contract for the standalone Reliva application.

## Product character

Reliva is a desktop-first operational SEO workspace. The interface should feel calm, precise and trustworthy rather than promotional. Data density is welcome when hierarchy is clear. Findings are evidence, actions are explicit, and unknown/partial states must never look healthy by default.

## Visual direction

- Light-first main workspace with a dark navy navigation rail.
- Brand accents: green for positive/connected/action, blue for navigation/data, amber for caution, red for critical findings.
- Neutral surfaces are cool white/slate, never warm beige or cream.
- Small radii and restrained shadows. Avoid giant rounded cards, pill-heavy UI and decorative gradients.
- Tables/lists are preferred for operational collections. Cards are reserved for KPIs, summaries and small status groups.
- Typography: Inter for UI/content, IBM Plex Mono for tabular metrics and technical values.

## Core tokens

| Token | Light | Dark | Purpose |
|---|---|---|---|
| background | `#f6f8fb` | `#101923` | app canvas |
| foreground | `#172033` | `#edf3f8` | primary text |
| card | `#ffffff` | `#18232f` | surfaces |
| border | `#e3e9f0` | translucent white | separators |
| brand/signal | `#24a56f` | `#5fd0a4` | success/primary action |
| info | `#388ee8` | `#69b9ef` | navigation/data |
| warning | `#e8a223` | `#f1b94f` | warning |
| danger | `#e64949` | `#ff7676` | critical |
| sidebar | `#172331` | `#101923` | global navigation |

## Typography hierarchy

- Page title: 30–34 px, semibold, tight tracking.
- Section heading: 14–18 px, semibold.
- Body: 14 px / 22–24 px line height.
- Table/control text: 12–14 px.
- Caption/metadata: 10–12 px.
- KPI numbers: tabular, tight tracking, 24–34 px depending on hierarchy.

## Layout

- Sidebar: 238 px expanded / 72 px collapsed.
- Global topbar: 64 px.
- Main canvas max width: 1480 px.
- Desktop gutters: 28 px; tablet 24 px; mobile 16 px.
- Primary vertical rhythm: 20 px between major sections.
- Dense data rows: 44–52 px where possible.

## Component rules

### Navigation
- Current route uses a dark-blue selected surface plus a slim blue left indicator.
- Group labels are small uppercase utility text; they must not dominate navigation.
- Mobile uses the same hierarchy in a drawer, not a separate information architecture.

### Panels
- `reliva-panel` is the standard summary container.
- Use one border and minimal shadow; avoid nested bordered cards unless information hierarchy requires it.
- Hover elevation is reserved for clickable objects.

### Status
- Green = connected/verified/success only.
- Red = critical/error.
- Amber = warning/attention.
- Blue = informational/running.
- Gray = unknown/not configured/neutral.
- Partial or missing coverage must use explicit neutral/warning language; never green.

### Tables and findings
- Table/list is the default for scans, findings, tasks, history and integration records.
- Severity is conveyed with a compact dot/badge plus text, not color alone.
- URL/technical metadata is secondary but always available.
- Finding detail must separate: evidence, why it matters, suggested action, source level, affected URLs and verification state.

### Forms
- Compact controls with visible labels.
- No placeholder-only forms.
- Destructive or external-write actions require explicit confirmation and permission checks.

### Empty/loading/error states
- Empty = what is missing + the next safe action.
- Loading = preserve layout where possible.
- Error = explain failure and recovery path.
- Unknown/partial data is never rendered as zero without evidence.

## Responsive contract

Desktop is the primary productivity environment. Mobile must support status, findings, tasks and simple actions without horizontal page overflow. Dense tables may transform into stacked operational rows, but the data and status semantics must remain identical.

## Accessibility

- Keyboard-visible focus states.
- Semantic headings and landmarks.
- Icon buttons have accessible labels.
- Do not rely on color alone for severity/status.
- Interactive targets should normally be at least 36 px in app chrome and 44 px where touch use is expected.

## Design review gate

A new feature is not visually done because it compiles. Before approval it must be checked for: hierarchy, density, typography, alignment, empty/loading/error states, desktop/mobile behavior, keyboard focus and consistency with this contract. Material deviations require an explicit design decision.
