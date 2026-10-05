# AI Skills & Agents for stroke-rehabilitation

Custom AI configuration for Codebuff-compatible agents. Skills are loaded by name
during a session; agents are specialist profiles that can be spawned for focused work.

## Skills (`.agents/skills/<name>/SKILL.md`)

| Skill | Use for |
|---|---|
| `project-architecture` | Repo map, domain model, frontend↔backend contract, env vars |
| `backend-spring-conventions` | Adding/changing Java code per Bootify.io layering |
| `frontend-vue-conventions` | Adding/changing Vue 3 components, stores, services |
| `build-and-test` | Gradle/npm/Docker commands + pre-completion verification |
| `motion-games` | Pose detection, WristTracker, canvas games, game stats |

## Agents (`.agents/<name>.md`)

| Agent | Role |
|---|---|
| `backend-dev` | Implements Spring Boot features; runs backend tests |
| `frontend-dev` | Implements Vue 3 features; runs type-check/lint |
| `code-reviewer` | Read-only reviewer for both stacks |
| `test-writer` | Writes/runs backend web-layer tests; frontend test setup |

## Usage tips

- Spawn the matching specialist for a task (`backend-dev`, `frontend-dev`),
  then `code-reviewer` on the diff before finishing.
- Any agent can load any skill by name — the mappings above are just defaults.
- Keep skills updated as conventions evolve; skills are read fresh each session.
