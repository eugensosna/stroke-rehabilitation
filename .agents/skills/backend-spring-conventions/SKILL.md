---
name: backend-spring-conventions
description: Use when writing or modifying Java Spring Boot backend code — how to add entities, repositories, services, REST resources, DTOs, validation, security, and error handling following this repo's Bootify.io conventions.
---

# Backend Spring Boot Conventions (Bootify.io style)

Base package: `ua.edu.zsea.sosna.stroke` (in `backend/src/main/java/...`).
Java 25 toolchain, Spring Boot 4.1, Lombok, PostgreSQL (prod) / H2 (tests).

## Adding a new feature end-to-end (e.g. entity `Exercise`)

1. **Entity** — `domain/Exercise.java`: JPA entity with Lombok (`@Getter`/`@Setter`),
   `Long id` primary key, relations as `@ManyToOne` to other entities. Use
   `new_generator_mappings`-friendly `@GeneratedValue`.
2. **Repository** — `repos/ExerciseRepository.java`: `public interface ExerciseRepository extends JpaRepository<Exercise, Long>`.
   Add finder methods as needed (e.g. `findFirstByStatisticId`).
3. **DTO** — `model/ExerciseDTO.java`: mirrors entity fields, but relations are
   represented by **their ids** (e.g. `Long user`, `Long statistic`). Add validation
   annotations (`@NotNull`, `@Size`, ...). Register DTO in `model/` — no MapStruct,
   mapping is hand-written in the service.
4. **Service** — `service/ExerciseService.java`:
   - Constructor injection (no `@Autowired` on fields).
   - `findAll()` uses `repository.findAll(Sort.by(Entity::getId))` then maps via `mapToDTO`.
   - `get(id)` throws `NotFoundException` (from `util/`) when absent.
   - `create`/`update` call hand-written `mapToEntity(dto, entity)`; resolving relation ids
     via repository lookup and throwing `NotFoundException("... not found")` if missing.
   - `delete` loads first so `@EventListener` guards can fire.
5. **Referenced-data guard** — if other entities reference yours, create an event class
   in `events/` (e.g. `BeforeDeleteExercise`), publish it before delete (see
   `GameStatsService`/`GameService.on(BeforeDeleteGameStats)` pattern), and throw
   `ReferencedException` with a message key registered under `error.handling.codes`
   in `application.yml`.
6. **REST controller** — `rest/ExerciseResource.java`:
   - `@RestController @RequestMapping(value = "/api/exercises", produces = MediaType.APPLICATION_JSON_VALUE)`
   - Constructor-inject the service (+ any services needed for extra endpoints).
   - Standard verbs: GET list, GET `/{id}`, POST (`@ApiResponse(responseCode = "201")`,
     returns `HttpStatus.CREATED`), PUT `/{id}`, DELETE `/{id}` (`204 noContent`).
   - Validate bodies with `@RequestBody @Valid`.
7. **Unique constraints** — model classes like `UserEmailUnique` show the pattern:
   a validator annotation + registered error code (e.g. `GAME_STATISTIC_UNIQUE`
   under `error.handling.codes`).
8. **Tests** — `backend/src/test/java/.../rest/ExerciseResourceTest.java`, following
   the existing `*ResourceTest` classes; H2 is the test datasource.

## Security & auth

- Config in `config/CustomSecurityConfig.java`; JWT filters
  `JwtAuthenticationFilter` / `JwtAuthenticationFilterCookie`; tokens via
  `service/auth/JwtTokenServiceImpl` and `jwtService` (com.auth0 java-jwt).
- Refresh tokens are stored in the `AccessToken` entity.
- Do not open new endpoints without checking `CustomSecurityConfig` permit rules.
- API docs: SpringDoc OpenAPI at `/swagger-ui` (`config/SwaggerConfig`,
  `springdoc.pathsToMatch: /api/**`).

## Error handling

- `error-handling-spring-boot-starter` converts exceptions to JSON
  (`http-status-in-json-response: true`). Throw `NotFoundException` for 404s,
  `ReferencedException` for FK guards. Register new error codes in
  `application.yml` → `error.handling.codes`.

## Code style

- Tabs in backend Java sources (follow existing files).
- DTO naming: `<Entity>DTO`; controllers: `<Entity>Resource`; services: `<Entity>Service`.
- Keep mapping inside services; no mapper libraries.
