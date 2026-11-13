# Prompt 002 — Astryx Design System Research

**Date:** 2026-11-13  
**Phase:** Planning (Pre-Build Investigation)  
**Purpose:** Verify whether Meta's Astryx Design System is real and publicly available before committing to it as the UI library.

## Research Question

> Is `@astryxdesign/core` a real, publicly available npm package from Meta? What components does it provide? What are the actual API patterns?

## Findings

### ✅ Astryx is REAL and publicly available

- **`@astryxdesign/core@0.7.15`** — MIT license, published by `astryxdesignteam <astryxdesign@meta.com>`, 31 MB unpacked.
- **`@astryxdesign/cli@0.7.15`** — CLI tooling for component discovery and documentation.
- **GitHub**: `https://github.com/meta/astryx`
- **Built on**: React 19 + StyleX (atomic CSS, zero runtime overhead).
- **150+ components** covering 100% of PRD requirements.

### Key Component Mapping

| PRD Requirement | Astryx Component | Import |
|----------------|------------------|--------|
| App layout | `AppShell` | `@astryxdesign/core/AppShell` |
| Data grid | `Table` | `@astryxdesign/core/Table` |
| Drawer | `Drawer` | `@astryxdesign/core/Drawer` |
| Form inputs | `TextInput`, `NumberInput`, `Selector`, `DateInput` | Various |
| AI chat | `Chat`, `ChatComposer`, `ChatMessage`, `ChatToolCalls` | `@astryxdesign/core/Chat` |
| Search | `PowerSearch` | `@astryxdesign/core/PowerSearch` |
| Layout | `VStack`, `HStack`, `Layout` | `@astryxdesign/core/Layout` |
| Code display | `CodeBlock`, `Collapsible` | Various |
| Notifications | `Toast`, `Banner` | Various |

### Setup Commands

```bash
npm install @astryxdesign/core @astryxdesign/theme-neutral @stylexjs/stylex
npm install -D @astryxdesign/cli
npx @astryxdesign/cli init
```

### CSS Setup

```css
@import '@astryxdesign/core/reset.css';
@import '@astryxdesign/core/astryx.css';
@import '@astryxdesign/theme-neutral/theme.css';
```

### CLI for Component Discovery

```bash
npx @astryxdesign/cli component --list          # List all components
npx @astryxdesign/cli component Table --compact  # Token-optimized docs
npx @astryxdesign/cli component Chat             # Full docs
```

## Decision

**Use Astryx as the primary UI library.** Updated ADR-004 to reflect this choice over Shadcn UI + Radix fallback. The Shadcn/TanStack Table stack is no longer needed.
