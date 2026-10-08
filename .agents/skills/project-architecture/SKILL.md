---
name: project-architecture
description: Use when you need an overview of the stroke-rehabilitation monorepo — where frontend and backend code lives, how they connect, key env vars, ports, and the domain model (Users, Games, GameStats, JWT auth).
---

# Stroke Rehabilitation Project Architecture

## What this app is

A web platform for **stroke rehabilitation**: patients play motion-controlled games
(e.g. an arcade Breakout game) controlled by hand/wrist tracking via webcam
(MediaPipe / TensorFlow.js pose detection). Motion metrics and game statistics are
sent to the backend and stored per user.

## Monorepo layout

```
backend/    Spring Boot 4.1 (Java 25) REST API  — serves /api/**, port 8080
frontend/   Vue 3 + TypeScript + Vite app       — dev server on port 5173
build.gradle           Gradle multi-project build, orchestrates both
docker-compose*.yaml   dev + prod orchestration (postgres 18.4, backend, frontend)
.env.example           root env template (DB creds, SPRING_* vars)
```

## Domain model (backend, package `ua.edu.zsea.sosna.stroke`)

- `User` — patients/accounts, unique email + username (validated by `UserEmailUnique`/`UserNameUnique`)
- `Game` — a game session owned by a `User`, optionally linked to `GameStats`
- `GameStats` — aggregated rehabilitation statistics for games
- `AccessToken` — JWT refresh token storage
- Auth: JWT access + refresh tokens via `com.auth0:java-jwt`, filters in `config/JwtAuthenticationFilter*.java`

## Backend layering (Bootify.io conventions)

```
rest/     *Resource classes = @RestController, e.g. GameResource → /api/games
service/  *Service classes = business logic + entity↔DTO mapping
repos/    Spring Data repositories (interface only)
domain/   JPA entities (Lombok)
model/    DTOs + validation annotations + unique-constraint validators
config/   Security, JWT, Swagger, SPA forwarding, Jackson
events/   Event classes like BeforeDeleteGameStats (referenced-data guard)
util/     NotFoundException, ReferencedException, WebUtils, InitData
```

Request flow: `rest/XResource → service/XService → repos/XRepository → domain/X`.
Services throw `NotFoundException` / `ReferencedException` (handled by
`error-handling-spring-boot-starter` into JSON error responses).

## Frontend structure

```
src/services/api.ts      axios instance; baseURL from VITE_API_BASE_URL + '/api';
                         attaches Bearer token from sessionStorage('token');
                         UNWRAPS the backend ApiResponse{success,message,data} envelope;
                         on 401 tries refresh then redirects to /login
src/services/*_service.ts  per-domain API calls (auth_service, user_service)
src/store/               Pinia stores (auth_store, userInfo_store)
src/composables/         WristTracker.ts (motion metrics), useGame.ts (GameArcade), useSidebar
src/types/               shared TS interfaces (game.ts, user.ts)
src/views/               routed pages (games/, Auth/, plus TailAdmin template pages)
src/components/          ui/ primitives, layout/, icons/, forms/, charts/
```

## How the halves connect

- Frontend calls `/api/**` with `Authorization: Bearer <token>`; responses may be
  wrapped in `{ success, message, data }` — the interceptor in `services/api.ts`
  unwraps it automatically.
- CORS origins come from `SPRING_ALLOWED_ORIGINS` env var.
- For production builds, `frontend/dist` is copied into
  `backend/src/main/resources/static` and served by Spring (see root `build.gradle`).

## Key configuration

| Var | Purpose |
|---|---|
| `SPRING_DATASOURCE_URL/USERNAME/PASSWORD` | PostgreSQL connection |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `validate` — schema is owned by Liquibase (`backend/src/main/resources/db/changelog/`) |
| `SPRING_LIQUIBASE_ENABLED` | `true` (default); runs migrations on startup |
| `SPRING_PROFILES_ACTIVE` | `local` (dev), `production` |
| `SPRING_ALLOWED_ORIGINS` | CORS allow-list |
| `jwt.secret`, `jwt.expiration`, `jwt.access-token-expiration-second` | token settings in `application.yml` |
| `VITE_API_BASE_URL` | frontend → backend base URL (e.g. `http://localhost:8080`) |

## Language note

Some source comments and UI strings are in **Ukrainian**. Preserve existing comment
languages; match the surrounding file's style when adding comments.
