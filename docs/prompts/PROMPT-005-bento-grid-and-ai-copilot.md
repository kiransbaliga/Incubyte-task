# PROMPT-005: Bento Grid Architecture, Always-Open AI Copilot, and Astryx Multi-Theme Ecosystem

> **Context:** Phase 5-6 UI Evolution  
> **Date:** 2026-11-13  
> **Target:** Frontend Engineering & Executive Dashboard  

---

## 1. User Instruction / Motivation

> "much better but still looks cheap, use bento style grid approach, /frontend-ui-engineering /generative_ui to use interactive proper website, with onboarding tour, use bento style layout with chat always in the side panel open"

---

## 2. Technical Decisions & Implementation

1. **Bento Grid System:**
   - 12-column responsive layout replacing stacked KPI cards.
   - Hero Pulse (8 cols): 10,000 personnel, $980M annualized spend, median pay benchmark, active entities, and spend proportion bar.
   - Real-time FX Normalization Engine & Calculator (4 cols): interactive currency conversion from EUR, GBP, INR, SGD, JPY into normalized USD.
   - Functional Department Allocation Matrix (6 cols) with click-to-filter reactivity.
   - Regional Entity Benchmarks (6 cols) with click-to-filter reactivity.
2. **Persistent AI Copilot (Always Open):**
   - Docked on the right side ($440\text{px}$ width on desktop).
   - Dedicated single-employee spotlight card (e.g. for Magnus Davis).
   - Multi-row results table and collapsible AST SQL audit drawer.
3. **Official Astryx Multi-Theme Ecosystem:**
   - Integrated `Stone`, `Neutral`, `Chocolate`, and `Matcha` themes with live theme switcher and Dark/Light mode toggle.
4. **Interactive 5-Step Guided Tour (`OnboardingTour.tsx`):**
   - Step-by-step product walkthrough with spotlight blur and keyboard navigation.
