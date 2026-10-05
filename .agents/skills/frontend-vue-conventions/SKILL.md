---
name: frontend-vue-conventions
description: Use when writing or modifying Vue 3 frontend code — component organization, Pinia stores, axios services, composables, TypeScript types, Tailwind styling, and the build/lint/type-check workflow.
---

# Frontend Vue 3 Conventions

Stack: Vue 3 (`<script setup>` + Composition API), TypeScript, Vite 6,
Tailwind CSS 4, Pinia 4, vue-router 4, axios. Template base: TailAdmin Vue Pro.

## File naming & layout

- Components: `PascalCase.vue` in `src/components/<domain>/` (`ui/`, `layout/`, `forms/`, `charts/`, `icons/`, `profile/`).
- Views (routed pages): `src/views/<Section>/<Name>.vue` (e.g. `views/games/GameArcade1.vue`, `views/Auth/SignIn.vue`).
- Composables/classes: `camelCase.ts` in `src/composables/`.
- API services: `src/services/<name>_service.ts` (snake_case suffix `_service`).
- Stores: `src/store/<name>_store.ts` with Pinia.
- Shared types: `src/types/*.ts` (e.g. `game.ts` has `Point2D`, `MotionResult`, `Brick`, `Paddle`, `Ball`).
- Icons: one component per icon in `src/icons/`, exported via `icons/index.ts`.

## API access rules

- ALWAYS use the shared axios instance from `src/services/api.ts` — never a bare
  `axios.get`. It handles:
  - base URL: `VITE_API_BASE_URL` + `/api`
  - `Authorization: Bearer` header from `sessionStorage.getItem('token')`
  - unwrapping the backend `{ success, message, data }` envelope
  - 401 → token refresh via `AuthStore` → redirect to `/login` on failure
- Add domain calls in `src/services/<domain>_service.ts` importing `api` from `./api`.
- Router: `src/router/index.ts`; guard auth-protected routes (see existing routes).

## State

- Pinia stores in `src/store/` (`auth_store` holds tokens/user in sessionStorage).
- Game state lives in reactive classes (`composables/useGame.ts` `GameArcade`)
  rather than global stores — keep physics out of Pinia.

## Motion games pattern (see also `motion-games` skill)

- Camera/pose input: `@mediapipe/hands`, `@mediapipe/pose`, `@tensorflow-models/pose-detection`.
- Motion metrics: `WristTracker` class records `MotionResult`s (duration, distance,
  speed) with analytics getters (`getAverageSpeed`, `getLongestMotion`, ...).
- Canvas game loop: class in `composables/useGame.ts` with `updatePhysics()` and
  `draw(ctx)`; view in `views/games/`.

## Styling

- Tailwind 4 utility classes in templates; shared primitives in `src/components/ui/`
  (Button, Badge, Alert, Modal, Avatar). Reuse them instead of raw markup.
- Charts: ApexCharts via `vue3-apexcharts`; maps: jsvectormap.

## Code style & verification

- Comments and some UI strings may be Ukrainian — match the file's existing language.
- Run from `frontend/`:
  - `npm run type-check` (vue-tsc) — MUST pass before finishing
  - `npm run lint` (eslint --fix) and `npm run format` (prettier)
  - `npm run dev` for the dev server (proxy target via `VITE_API_PROXY_TARGET`)
  - `npm run build` (type-check + vite build)
- Path alias `@/` → `src/`.
- Avoid `console.log` in new production code; existing files contain debug logs —
  do not add more.
