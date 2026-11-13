# ADR 005: Bento Grid Architecture, Always-Open AI Copilot, and Astryx Multi-Theme System

> **Status:** Accepted  
> **Date:** 2026-11-13  
> **Authors:** Frontend Engineering & AI Systems Team  
> **Deciders:** Engineering Lead, HR Tech Product Lead  

---

## 1. Context & Problem Statement

The initial release of the ACME Compensation Hub successfully implemented backend performance (<50ms for 10,000 employees), dual-currency conversion, and safe Natural Language to SQL generation. However, executive UX evaluation identified three primary limitations:
1. **Visual Monotony & Low Hierarchy:** A standard stacked layout (KPI cards directly above a massive 10,000-row table) felt rigid, uninspired, and difficult to scan for executive-level workforce intelligence.
2. **Hidden AI Assistant:** The "Ask ACME Pay" intelligence engine was tucked behind a modal button / slide-out drawer, requiring extra clicks and hiding real-time conversational insights.
3. **Lack of Interactive Exploration:** Users could not interactively simulate currency normalizations or click department/regional benchmarks to dynamically filter the live data grid.
4. **Single-Employee Query Display:** When querying an individual person's compensation (e.g., *"What is the salary of Magnus Davis?"*), displaying a generic table row failed to provide an executive summary profile.

---

## 2. Decision Drivers

* **Executive Scannability:** Executive stakeholders need high-density, multi-dimensional views (headcount, annualized spend, median pay, active entities, department allocation spectrum) visible simultaneously.
* **Persistent AI Assistant:** The AI copilot should feel like a native, constant companion on the desktop viewport without occluding the grid.
* **Interactive Data Discovery:** Bento elements (e.g., department spend cards, country benchmark cards) should double as interactive filter triggers.
* **Design System Polish:** Adhere strictly to the Meta Astryx design system tokens, typography scales, and official themes (`Stone`, `Neutral`, `Chocolate`, `Matcha`).
* **First-Time User Guidance:** Provide an interactive product walkthrough tour for new users.

---

## 3. Considered Options

* **Option A: Traditional Full-Width Table with Modal Drawers**
  * *Pros:* Simple layout, full horizontal width for table columns.
  * *Cons:* Looks utilitarian and cheap; AI assistant is hidden; no executive pulse.
* **Option B: Tabbed Navigation (Table Tab vs Analytics Tab)**
  * *Pros:* Clear separation of concerns.
  * *Cons:* Requires constant tab switching to correlate data with metrics.
* **Option C: Bento Grid Dashboard with Split-Screen Persistent AI Copilot (Chosen)**
  * *Pros:* Modern executive dashboard layout; interactive click-to-filter bento tiles; live currency converter; always-open AI assistant; single-employee compensation spotlight card; full responsiveness.
  * *Cons:* Requires responsive breakpoint management on small viewports (<1200px).

---

## 4. Decision Outcome

We decided on **Option C: Bento Grid Dashboard with Split-Screen Persistent AI Copilot**.

### 4.1 Bento Grid Layout System
Organized using a 12-column responsive CSS grid (`bento-grid`):
* **Bento Card 1 (8 cols) — Global Workforce Pulse (`BentoExecutivePulse.tsx`):**
  * Headcount ($10,000$ personnel, $99.4\%$ active rate).
  * Annualized spend ($\$980,978,182.55$ normalized USD).
  * Median base pay ($\$85,225.50$ P50 benchmark) and operating entities ($6/6$).
  * Proportional multi-department spend distribution spectrum bar.
* **Bento Card 2 (4 cols) — Real-Time FX Normalization Engine (`BentoFxConverter.tsx`):**
  * Interactive calculator computing normalized USD compensation from local currency in real time using corporate planning rates.
  * Live exchange rate ticker with national flags (`🇪🇺 EUR $1.086`, `🇬🇧 GBP $1.263`, `🇮🇳 INR $0.0119`, etc.).
* **Bento Card 3 (6 cols) — Functional Department Matrix (`BentoDepartmentMatrix.tsx`):**
  * 6 functional department allocation cards with total spend, headcount, and spend share.
  * **Click-to-Filter:** Clicking any card instantly filters the live 10,000-record grid to that department.
* **Bento Card 4 (6 cols) — Regional Entity Benchmarks (`BentoRegionalBenchmarks.tsx`):**
  * 6 comparative cards (`🇺🇸 US`, `🇩🇪 DE`, `🇬🇧 GB`, `🇸🇬 SG`, `🇯🇵 JP`, `🇮🇳 IN`).
  * **Click-to-Filter:** Clicking any country card immediately filters the grid to that country.

### 4.2 Persistent AI Compensation Copilot (`AskAcmePaySidePanel.tsx`)
* Docked permanently on the right side of the screen ($440\text{px}$ width on desktop).
* **Dedicated Single-Employee Spotlight Card:** Queries targeting a single employee (e.g., *"Magnus Davis salary"*) render an executive profile card with avatar, name, code (`ACME-01964`), department, level, country flag, USD base salary, local currency amount, and employment status.
* **Compact Table Mode:** Multi-row queries render compact Astryx tables with tabular USD currency formatting.
* **AST SQL Audit Drawer:** Collapsible drawer revealing the verified AST SQL query and execution latency ($11\text{ms}$).
* **Prompt Chips:** Quick triggers for common executive queries.

### 4.3 Official Astryx Multi-Theme Ecosystem
* Integrated 4 official Meta Astryx themes via `@astryxdesign/theme-*`:
  * **Stone (Default):** Montserrat headings, Figtree body, JetBrains Mono numbers, slate accents.
  * **Neutral:** High-contrast monochrome enterprise grays.
  * **Chocolate:** Fraunces editorial serif headings, Albert Sans body, rich caramel tones.
  * **Matcha:** Organic earthy forest green palette with DM Sans body.
* Dynamic switching via TopNav dropdown with token recalculation and `localStorage` persistence.
* Full Light/Dark mode toggle.

### 4.4 Guided Onboarding Tour (`OnboardingTour.tsx`)
* Interactive 5-step modal walkthrough with backdrop blur, step indicators, and keyboard navigation.
* Automatically triggers for first-time visitors (checked via `localStorage`) and can be relaunched anytime via the "Guided Tour" button in the TopNav.

---

## 5. Consequences & Verification

* **Positive:**
  * Clean, executive-grade workforce intelligence platform.
  * Reduced time-to-insight for HR leadership through always-open AI copilot and click-to-filter bento tiles.
  * Verified sub-20ms database queries across 10,000 records.
  * Complete accessibility adherence (WCAG 2.1 AA keyboard support).
* **Verification:**
  * 126 backend Vitest tests passing.
  * Next.js 15 production build passing with 0 errors.
  * DevTools visual testing verifying Stone, Chocolate, Matcha, Neutral, and Dark/Light modes.
