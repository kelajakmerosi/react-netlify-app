# Copilot Instructions for `react-netlify-app`

This document provides context, patterns, and guidelines for AI agents working in this codebase.

## 🏗 Project Architecture & Overview
- **Stack**: React (v18), Vite, TypeScript.
- **Styling**: CSS Modules (`*.module.css`) + Global Variables (`src/styles/tokens.css`).
- **State Management**: React Context API (`src/app/providers`) + Custom Hooks (`src/hooks`).
- **Routing**: `react-router-dom` with a centralized router configuration in `src/app/router.tsx`.
- **Data Layer**: 
  - **Mock Data**: `src/constants/index.ts` contains static data (subjects, topics).
  - **API**: `src/services/api.ts` is a centralized `fetch` wrapper. Authentication is currently mock-based/JWT-ready.
- **Entry Point**: `src/main.tsx` mounts `App` wrapped in multiple providers.

## 📂 Key Directories & Files
- `src/components/ui`: Base reusable components (e.g., `Button.tsx`, `GlassCard.tsx`, `Input.tsx`). **Prefer using these over raw HTML elements.**
- `src/components/features`: Complex, domain-specific components (e.g., `QuizPanel`, `SubjectCard`).
- `src/components/layout`: Layout components (`AppShell`, `Sidebar`, `Topbar`).
- `src/hooks`: Custom hooks logic (`useAuth`, `useQuiz`, `useLang`).
- `src/styles`: Global styles (`globals.css`, `tokens.css`) and shared component styles (`components.module.css`).
- `src/utils`: Helper functions (`cn` for class merging, formatting).

## 🎨 UI & Styling Patterns
- **Glassmorphism**: The app uses a "glass" aesthetic. Use `<GlassCard>` as the default container for content blocks.
- **CSS Modules**: Use `*.module.css` for component-specific styles. Avoid inline styles for layout/spacing where possible; prefer CSS classes or utility components.
- **Class Merging**: Use the `cn()` utility from `src/utils` to conditionallly join class names.
  ```tsx
  import { cn } from '../../utils'
  import styles from './MyComponent.module.css'
  
  <div className={cn(styles.root, isActive && styles.active)} />
  ```
- **Theming**: Colors and spacing are defined in `src/styles/tokens.css`. Use CSS variables (e.g., `var(--accent)`, `var(--radius-md)`) instead of hardcoded hex values.

## 🧭 Brand UI Direction
- Public-facing and first-impression surfaces such as landing, auth, onboarding, and checkout-adjacent pages should follow the **Soft Academic SaaS** visual language.
- **Soft Academic SaaS** means calm, structured, trustworthy, and education-first. Prefer light gray-blue backgrounds, white or near-white surfaces, purple accent hierarchy, dark navy text, rounded geometry, and restrained motion.
- Auth must feel like a quieter extension of the landing page, not a separate futuristic, neon, or overly glassy product.
- Shared primitives like `<GlassCard>` may still be used, but composition should remain soft, grounded, and highly legible.
- Preserve strong hierarchy, obvious next actions, and minimal visual noise.
- Reference [docs/design-language.md](../docs/design-language.md) when designing new public-facing components.

## 🛠 Developer Workflows (CLI)
- **Dev Server**: `npm run dev` (Vite, runs on port 5173).
- **Build**: `npm run build` serves a production build.
- **Type Check**: `npm run typecheck` runs `tsc --noEmit`. **Always ensure types pass.**
- **Lint**: `npm run lint` uses ESLint.
- **Note**: Do *not* restart the dev server manually for every change; Vite handles HMR.

## 🧩 Common Patterns & Conventions
- **Component Naming**: PascalCase (e.g., `SubjectCard.tsx`).
- **Hook Naming**: `use` prefix (e.g., `useAuth.ts`).
- **I18n**: Use `useLang()` hook for translations.
  ```tsx
  const { t } = useLang()
  <h1>{t('welcome')}</h1>
  ```
- **Context Access**: Wrappers like `useAuth()` and `useApp()` expose context values. Avoid importing Context objects directly; use the hooks.
- **Icons**: Simple text/emoji icons are often used (e.g., `'📚'`), but check `src/components/ui/index.tsx` for SVG/icon implementations if available.

## ⚠️ Integrity Constraints
- **Do not modify** `src/services/api.ts` unless implementing real backend integration (currently supports mock).
- **Preserve** the "Glassmorphism" look and feel; avoiding flat, opaque cards unless specified.
- **Respect** the `src/types` definitions. Update interfaces in `src/types/index.ts` if data models change.
