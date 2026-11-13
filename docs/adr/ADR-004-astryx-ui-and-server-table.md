# ADR-004: Astryx UI & Server-Driven Table

**Status:** Accepted  
**Date:** 2026-11-13  
**Deciders:** Engineering Team

## Context

The frontend must render a 10,000-employee compensation grid with server-side pagination, multi-column sorting, faceted filtering, dual-currency display, a CRUD edit drawer, and an AI chat panel. We need a UI component library that:

1. Provides production-quality table, drawer, form, and chat components.
2. Supports React 19 and modern patterns (Server Components, streaming).
3. Is accessible (WCAG compliant) out of the box.
4. Has AI/chat-specific components for the "Ask ACME Pay" feature.

## Decision

### Primary UI Library: Meta Astryx (`@astryxdesign/core`)

Meta's Astryx Design System provides 150+ components covering 100% of our UI requirements:

| PRD Requirement | Astryx Component | Import Path |
|----------------|------------------|-------------|
| App layout shell | `AppShell` | `@astryxdesign/core/AppShell` |
| Navigation | `TopNav`, `SideNav` | `@astryxdesign/core/TopNav` |
| 10k-row data grid | `Table` | `@astryxdesign/core/Table` |
| Pagination | `Pagination` | `@astryxdesign/core/Pagination` |
| Filter bar | `PowerSearch`, `Selector` | `@astryxdesign/core/PowerSearch` |
| Edit drawer | `Drawer` | `@astryxdesign/core/Drawer` |
| Form inputs | `TextInput`, `NumberInput`, `Selector`, `DateInput` | Various |
| KPI display | `Badge`, custom with `HStack` | `@astryxdesign/core/Badge` |
| AI chat | `Chat`, `ChatComposer`, `ChatMessage` | `@astryxdesign/core/Chat` |
| SQL audit view | `CodeBlock`, `Collapsible` | `@astryxdesign/core/CodeBlock` |
| Loading states | `Skeleton`, `Spinner` | `@astryxdesign/core/Skeleton` |
| Notifications | `Toast`, `Banner` | `@astryxdesign/core/Toast` |
| Layout | `VStack`, `HStack`, `Layout` | `@astryxdesign/core/Layout` |

### Setup

```bash
# Install
npm install @astryxdesign/core @astryxdesign/theme-neutral @stylexjs/stylex
npm install -D @astryxdesign/cli

# Initialize (generates AGENTS.md, component docs)
npx @astryxdesign/cli init

# Explore components
npx @astryxdesign/cli component --list
npx @astryxdesign/cli component Table --compact
```

### CSS Configuration

```css
/* globals.css */
@import '@astryxdesign/core/reset.css';
@import '@astryxdesign/core/astryx.css';
@import '@astryxdesign/theme-neutral/theme.css';
```

### Server-Driven Table Pattern

The Astryx `Table` component handles column definitions and cell rendering. All data operations (pagination, sorting, filtering) are server-driven:

1. **URL State**: Filter/sort/page params serialized in URL search params.
2. **Server Fetch**: TanStack Query calls `GET /api/employees?...` with URL params.
3. **Astryx Table**: Receives data array + column definitions, renders with `renderCell` for custom formatting (dual-currency, badges).
4. **Pagination**: Astryx `Pagination` component wired to URL state.

```
URL params ──→ TanStack Query ──→ API ──→ PostgreSQL
                                            │
                                            ▼
                                     Astryx Table ──→ User
```

### AI Chat Panel

The "Ask ACME Pay" feature uses Astryx's built-in chat components:

- `ChatComposer` + `ChatComposerInput` + `ChatSendButton` for the input area.
- `ChatMessage` for conversational message history.
- `ChatToolCalls` for rendering query execution status.
- Custom result cards (Astryx `Table` + metric display) embedded in chat messages.
- `CodeBlock` + `Collapsible` for the "View Generated SQL" audit trail.

### Theming

Using `@astryxdesign/theme-neutral` for a clean, professional HR tool aesthetic. Themes are pure CSS custom properties — no React context providers needed. The theme can be swapped without code changes.

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Shadcn UI + Radix + TanStack Table | Would require building AI chat components from scratch; three separate dependencies to coordinate vs. one unified system |
| Ant Design | Heavy bundle, opinionated styling, enterprise-focused but not React 19 native |
| Material UI (MUI) | Large bundle size, Joy UI subset doesn't cover all needs, no AI chat components |
| Chakra UI | Doesn't have table, chat, or power-search components at the level Astryx provides |
| Building from scratch | Unjustifiable time investment for a demo project when Astryx covers all needs |

## Consequences

- Team must learn Astryx component APIs — mitigated by CLI documentation tools (`npx @astryxdesign/cli component Table --compact`).
- Astryx uses StyleX internally — consumers don't need to configure StyleX Babel plugin (styles are pre-compiled).
- `className` prop is supported, so Tailwind CSS can be used alongside for custom spacing/layout if needed.
- Astryx is relatively new — community resources are limited compared to Shadcn/Radix, but Meta's backing ensures maintenance.
- The `@astryxdesign/core` package is 31 MB unpacked — tree-shaking via sub-path imports (`@astryxdesign/core/Table`) keeps actual bundle size manageable.
