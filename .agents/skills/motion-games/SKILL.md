---
name: motion-games
description: Use when building or modifying rehabilitation games, hand/wrist tracking, pose detection, or motion statistics — WristTracker, useGame/GameArcade, MediaPipe/TensorFlow pose pipeline, and saving game stats to the backend.
---

# Motion-Tracked Rehabilitation Games

The core product: patients play canvas games controlled by **hand motion tracked
from the webcam**. Motion quality metrics double as rehabilitation progress data.

## Pipeline

1. **Pose/hand input** — `@mediapipe/hands`, `@mediapipe/pose`,
   `@tensorflow-models/pose-detection` (see `frontend/package.json`). Camera via
   `@mediapipe/camera_utils`. Coordinates are normalized (0..1) relative to the frame.
2. **Motion analysis** — `src/composables/WristTracker.ts`:
   - `update(x, y)` per frame; detects motion start (`moveThreshold`, default 0.02)
     and stop (`stillnessThreshold`, default 0.005).
   - Emits `onMotionComplete(MotionResult)` and periodic `onStationary(point)`
     (every `stationaryIntervalMs`, 1000 ms default).
   - `MotionResult` = `{ startPoint, endPoint, durationMs, distance, speed }`
     (type in `src/types/game.ts`).
   - Analytics: `getHistory()`, `getLongestMotion()`, `getFastestMotion()`,
     `getAverageDistance()`, `getAverageSpeed()`, `clearHistory()`.
3. **Game logic** — `src/composables/useGame.ts` (`GameArcade` class):
   - `reactive()` state (`GameState`, paddle, ball, bricks), level defined as
     string rows (`'R'|'O'|'G'|'Y'`) + `colorMap`.
   - `movePaddle(point: Point2D)` maps tracked hand x to paddle position;
     `updatePhysics()` does collision/physics per tick; `draw(ctx)` renders canvas.
   - View example: `src/views/games/GameArcade1.vue`.

## Adding a new game

1. Create a game class in `src/composables/` (mirror `GameArcade`: reactive state,
   `updatePhysics()`, `draw(ctx)`, accepts tracked `Point2D` input).
2. Create the view in `src/views/games/` using the shared camera/pose setup.
3. Add types to `src/types/game.ts`.
4. Register the route in `src/router/index.ts`.
5. On game end, aggregate `WristTracker` metrics and POST them to the backend —
   add a service function in `src/services/` calling the shared `api` instance
   (see `GameStatsResource` endpoints on the backend).
6. Add backend persistence via the `game-stats`/`game` endpoints; extend
   `GameStats`/`GameDTO` only if new metric fields are needed (follow
   `backend-spring-conventions` skill).

## Constraints & pitfalls

- Coordinate space: keep tracker thresholds **normalized (0..1)** — they are
  resolution-independent; convert to canvas pixels only inside the game class.
- Performance: pose models run per video frame — do not allocate objects in the
  render loop; reuse points.
- Divide-by-zero guard for `speed` when `durationMs === 0` (already in WristTracker
  — preserve it in new analytics).
- Patients may have limited mobility: keep thresholds configurable, avoid hard
  timed failures, prefer per-stationary-position feedback.
- Existing files use Ukrainian comments (e.g. WristTracker) — match file style.
