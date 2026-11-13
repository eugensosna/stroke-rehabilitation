# API вправ і калібрування (пропозиція контракту)

Ресурси потрібні клієнту для ігрових вправ (задачі 3–4). Бекенд їх ще не реалізує.
Поки бекенду немає, фронтенд працює з mock-адаптером: `VITE_USE_MOCKS=true npm run dev`,
дані зберігаються в `localStorage` браузера (`frontend/src/services/mock_adapter.ts`).

Загальне:

- базовий шлях `/api`, автентифікація `Authorization: Bearer <JWT>`, як в інших ресурсах;
- відповідь загорнута в `ApiResponse<T>` (`{ success, message, data }`), клієнт її розгортає;
- час — ISO-8601 (UTC);
- **на сервер не передаються координати ключових точок і зображення**, лише числові показники (табл. 2.2 роботи).

Типи TypeScript: `frontend/src/types/exercise.ts`.

## Ідентифікатори і одиниці

| `exerciseId` | Вправа | Керуючий показник |
|---|---|---|
| `pinch` | щипковий захват | `d2` |
| `keypad` | вказування прямим пальцем («Кодовий замок»), натискання — наближення кисті до камери | `Z` |
| `opposition` | протиставлення великого пальця (зараз без гри; застарілий id у налаштуваннях замінюється на `keypad`) | `d2`…`d5` (задає гра) |
| `openClose` | розкриття і стискання кисті | `O` |
| `isolatedFinger` | ізольовані рухи пальців | `Phi1`…`Phi5` (задає гра) |

`ControlMetric`: `d2 d3 d4 d5 O Phi1 Phi2 Phi3 Phi4 Phi5 Z`. `Z = 1 − s₀/s` — наближення кисті до камери як частка базової відстані (натискання — `Z ≥ 0,1`); не калібрується.

- Відстані (`d_k`, `O`) задаються в частках масштабного множника кисті `s`.
- Кути (`Phi_k`) у **звітах серій** задаються в градусах. У **калібруванні** вони зберігаються в радіанах (одиниці моделі), щоб клієнт використовував їх без перерахунку.

---

## `POST /api/exercise-series`

Збереження звіту серії. Тіло — `SeriesReport`:

```json
{
  "exerciseId": "pinch",
  "startedAt": "2026-11-13T10:00:00.000Z",
  "attempts": 10,
  "successes": 8,
  "successRatePct": 80,
  "meanAmplitude": 0.71,
  "maxAmplitude": 0.84,
  "amplitudeUnit": "s",
  "frequencyHz": 0.25,
  "rhythmCvPct": 6.3,
  "meanHoldTimeS": 0.92,
  "meanIsolation": null,
  "ranges": [{ "metric": "d2", "xr": 0.95, "xg": 0.12 }],
  "startLevel": 2,
  "endLevel": 4,
  "activeDurationMin": 2.6,
  "detectionRatePct": 97.4,
  "trackingMode": "local",
  "meanFps": 29.7,
  "repetitions": [
    {
      "index": 1,
      "target": null,
      "metric": "d2",
      "startS": 1.04,
      "goalS": 1.83,
      "endS": 3.9,
      "success": true,
      "level": 2,
      "amplitude": 0.79,
      "holdTimeS": 1.12,
      "isolation": null,
      "pausedBefore": false,
      "jointAnglesDeg": [[12.1, 20.4], [8.3, 15.0, 9.9], [5.1, 7.4, 6.0], [6.0, 8.2, 7.7], [7.9, 9.1, 8.0]]
    }
  ]
}
```

| Поле | Табл. 2.2 | Примітка |
|---|---|---|
| `attempts`, `successes` | N, N_s | |
| `successRatePct` | N_s/N, % | `null`, якщо N = 0 |
| `meanAmplitude`, `maxAmplitude` | Ā, A_max | градуси (`amplitudeUnit: "deg"`), частки s (`"s"`) або частки відстані до камери (`"depth"`, вправа `keypad`) |
| `frequencyHz` | f, Гц | `null` при M < 3 |
| `rhythmCvPct` | V, % | `null` при M < 3 |
| `meanHoldTimeS` | t̄_h, с | за успішними спробами |
| `meanIsolation` | Ī_k | лише для `isolatedFinger`, інакше `null` |
| `ranges[]` | x_r, x_g | для кожного показника, що використовувався в серії |
| `startLevel`, `endLevel` | L | |
| `activeDurationMin` | тривалість активної роботи, хв | без пауз через втрату кисті |
| `detectionRatePct` | частка кадрів з кистю, % | |
| `trackingMode`, `meanFps` | режим і частота обробки | `local` / `remote`, кадр/с |
| `repetitions[]` | деталізація | моменти t_s, t_m, t_e від початку серії; кути суглобів у момент найбільшого u (для аналізу фахівцем) |

`jointAnglesDeg` — 5 масивів для пальців 1..5: для великого [МФС, МФ], для інших [МФС, ПМФС, ДМФС].

Відповідь `201` — `SeriesRecord` (те саме + `id`, `savedAt`).

## `GET /api/exercise-series/my`

Серії поточного пацієнта від нових до старих: `SeriesRecord[]`. Їх використовує клієнт:

- рівень першої спроби наступного сеансу — `endLevel − 1` останньої серії цієї вправи;
- скорочене калібрування — `amplitude` повторень останнього сеансу (`repetitions[]`).

Можна обмежити кількість параметрами `?limit=` і `?from=` (необов'язкові).

## `GET /api/calibrations/latest`

Останнє калібрування пацієнта — `CalibrationRecord`, або `data: null` (чи `404`), якщо його не було:

```json
{
  "id": 17,
  "createdAt": "2026-11-13T09:58:00.000Z",
  "kind": "full",
  "ranges": {
    "O":    { "xr": 1.21, "xg": 2.05, "unavailable": false },
    "d2":   { "xr": 0.98, "xg": 0.14, "unavailable": false },
    "Phi3": { "xr": 0.12, "xg": 3.95, "unavailable": false },
    "Phi5": { "xr": 0.10, "xg": 0.31, "unavailable": true }
  }
}
```

`unavailable: true` — діапазон менший за Δx_min. Вправа з цим показником недоступна, і про це треба повідомити фахівця.

## `POST /api/calibrations`

Збереження результату калібрування: тіло `CalibrationRecord` без `id`, відповідь `201` з `id`.

> У задачі був згаданий шлях `POST /api/calibrations/latest`. Пропонуємо `POST /api/calibrations`: створюється новий запис
> історії (динаміка діапазону — показник прогресу), а `GET …/latest` повертає останній.

## `GET /api/exercise-settings/my`

Налаштування, які задає фахівець з реабілітації (задача 5). Якщо їх немає, сервер повертає `404`,
і клієнт використовує типові значення (`DEFAULT_EXERCISE_SETTINGS`).

```json
{
  "exercises": ["pinch", "keypad", "openClose", "isolatedFinger"],
  "repetitionsPerSeries": 10,
  "levels": {
    "Lmin": 1, "Lmax": 10,
    "thetaG1": 0.5, "dTheta": 0.05,
    "tHold1": 0.5, "dTHold": 0.15,
    "tMax1": 8, "dTMax": 0.5, "tMaxMin": 2
  },
  "isolationMin": { "1": 0.6, "2": 0.6, "3": 0.4, "4": 0.4, "5": 0.5 },
  "dxMin": { "distance": 0.15, "openness": 0.15, "flexion": 0.35 },
  "targetFrequencyHz": 0.25
}
```

| Поле | Зміст |
|---|---|
| `levels.Lmin`, `Lmax` | межі рівня складності |
| `thetaG1`, `dTheta` | θ_g(L) = θ_g,1 + (L − 1)·Δθ (не більше 1) |
| `tHold1`, `dTHold` | час утримання t_h(L), с |
| `tMax1`, `dTMax`, `tMaxMin` | допустимий час спроби T_max(L), с, з нижньою межею |
| `isolationMin` | I_min,k для пальців 1..5 |
| `dxMin` | Δx_min: частки s для відстаней і розкриття, радіани для кутів |
| `targetFrequencyHz` | темп перешкод у вправі «Повітряна куля» |
