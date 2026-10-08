---
name: build-and-test
description: Use when building, running, testing, or verifying the project — all Gradle, npm, and Docker commands for backend, frontend, and full-stack builds, plus the pre-completion verification checklist.
---

# Build, Run & Test Commands

All Gradle commands run from the **repo root** (`./gradlew` / `gradlew.bat`).
npm commands run from **`frontend/`** unless noted.

## Daily development

```bash
./gradlew dev              # runs Spring Boot (profile 'local') + Vite dev server together
./gradlew bootRunDev       # backend only (port 8080)
cd frontend && npm run dev # frontend only (port 5173, proxies /api to backend)
docker compose up          # postgres + backend + frontend dev server
```

- Backend dev profile: `local` (`SPRING_PROFILES_ACTIVE`), DB via docker compose.
- Frontend requires Node 24 (Gradle auto-downloads it via node-gradle plugin into
  `frontend/.gradle/nodejs`).

## Full-stack production build

```bash
./gradlew buildFullStack   # builds Vue app, copies dist into backend static, packages bootJar
./gradlew clean build      # full clean build incl. backend tests
java -Dspring.profiles.active=production -jar backend/build/libs/stroke-0.0.1-SNAPSHOT.jar
```

⚠️ Note: root `build.gradle` wires `copyFrontendToBackend` into
`:backend:processResources`; in `backend/build.gradle` some of these tasks are
commented out — check current state before relying on static serving.

## Backend verification

```bash
./gradlew :backend:test                       # JUnit 5 tests (H2 in-memory DB)
./gradlew :backend:compileJava                # quick compile check
```

- Tests live in `backend/src/test/java/.../rest/*ResourceTest.java` (web-layer tests).
- New backend code MUST at least compile and existing tests MUST pass.

## Frontend verification

```bash
cd frontend
npm install            # first time / after dependency changes
npm run type-check     # vue-tsc --build  ← run this after EVERY .ts/.vue change
npm run lint           # eslint . --fix
npm run build          # type-check + vite build
```

- No frontend unit test runner is configured in `frontend/package.json` yet;
  `backend/package.json` (Bootify template) has jest but is legacy — don't rely on it.
- TypeScript errors are release blockers: `npm run build` fails on them.

## Database

- PostgreSQL 18.4 via docker compose (`db` service, volume `db_data`).
- Schema managed by **Liquibase** (`backend/src/main/resources/db/changelog/`); Hibernate runs with
  `ddl-auto: validate`. When you change an entity, add a new changeSet (new file under
  `db/changelog/vX.Y/`, included from `db.changelog-master.yaml`). Never edit an applied changeSet.
  Tests run the same changelog on H2 and fail on entity/schema mismatch.

## Pre-completion checklist

1. Backend touched? → `./gradlew :backend:test` passes.
2. Frontend touched? → `cd frontend && npm run type-check` passes (and `npm run build` for release).
3. New env vars → added to `.env.example` / `.env.example.prod` and documented.
4. New `/api/**` endpoints → visible in Swagger (`springdoc.pathsToMatch: /api/**`).
5. Don't commit `.env`, `node_modules`, `frontend/dist`, `frontend/.gradle/`.
