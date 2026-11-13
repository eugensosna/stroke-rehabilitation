package ua.edu.zsea.sosna.stroke.service;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.databind.JsonNode;

/**
 * Перевірка тіл запитів вправ і калібрування (контракт — docs/api-exercise.md).
 *
 * Звіти зберігаються як JSON, тому перевіряються ключові поля та обсяг. Окремо гарантується, що на
 * сервер не потрапляють координати ключових точок чи зображення: запит з такими полями відхиляється.
 */
public final class ExercisePayloads {

	/** Ідентифікатори вправ клієнта */
	public static final Set<String> EXERCISE_IDS = Set.of("pinch", "opposition", "keypad", "openClose",
			"isolatedFinger", "arkanoid", "arkade2");

	/** Керуючі показники */
	public static final Set<String> CONTROL_METRICS = Set.of("d2", "d3", "d4", "d5", "O", "Phi1", "Phi2", "Phi3",
			"Phi4", "Phi5", "Z", "X");

	public static final Set<String> CALIBRATION_KINDS = Set.of("full", "short");

	/** Поля, яких не може бути в жодному звіті (координати точок, кадри) */
	static final Set<String> FORBIDDEN_FIELDS = Set.of("landmarks", "keypoints", "image", "images", "frame",
			"frames", "video");

	/** Межі обсягу */
	static final int MAX_REPETITIONS = 1000;
	static final int MAX_DEPTH = 8;
	static final int MAX_LEVEL = 100;

	private ExercisePayloads() {
	}

	/** Звіт серії: обов'язкові поля, узгодженість і відсутність координат */
	public static void validateSeries(final JsonNode body) {
		requireObject(body, "звіт серії");
		requireAllowed(body, 0);
		final String exerciseId = requiredString(body, "exerciseId");
		if (!EXERCISE_IDS.contains(exerciseId)) {
			throw bad("Невідома вправа: " + exerciseId);
		}
		requiredDate(body, "startedAt");
		final int attempts = requiredInt(body, "attempts", 0, 100_000);
		requiredInt(body, "successes", 0, attempts);
		requiredInt(body, "startLevel", 1, MAX_LEVEL);
		requiredInt(body, "endLevel", 1, MAX_LEVEL);
		final JsonNode reps = body.get("repetitions");
		if (reps != null && !reps.isNull()) {
			if (!reps.isArray()) {
				throw bad("Поле repetitions має бути масивом");
			}
			if (reps.size() > MAX_REPETITIONS) {
				throw bad("Забагато повторень у серії");
			}
		}
	}

	/** Калібрування: тип і діапазони відомих показників */
	public static void validateCalibration(final JsonNode body) {
		requireObject(body, "калібрування");
		requireAllowed(body, 0);
		final String kind = requiredString(body, "kind");
		if (!CALIBRATION_KINDS.contains(kind)) {
			throw bad("Невідомий тип калібрування: " + kind);
		}
		final JsonNode ranges = body.get("ranges");
		if (ranges == null || !ranges.isObject()) {
			throw bad("Поле ranges обов'язкове");
		}
		for (final String metric : ranges.propertyNames()) {
			if (!CONTROL_METRICS.contains(metric)) {
				throw bad("Невідомий показник: " + metric);
			}
			final JsonNode r = ranges.get(metric);
			if (r == null || !r.isObject() || !isFinite(r.get("xr")) || !isFinite(r.get("xg"))
					|| r.get("unavailable") == null || !r.get("unavailable").isBoolean()) {
				throw bad("Діапазон " + metric + " має містити xr, xg і unavailable");
			}
		}
	}

	/** Дата створення калібрування (необов'язкова; без неї — час сервера) */
	public static OffsetDateTime optionalDate(final JsonNode body, final String field) {
		final JsonNode v = body.get(field);
		return v == null || v.isNull() ? null : parseDate(v, field);
	}

	public static OffsetDateTime requiredDate(final JsonNode body, final String field) {
		final JsonNode v = body.get(field);
		if (v == null || v.isNull()) {
			throw bad("Поле " + field + " обов'язкове");
		}
		return parseDate(v, field);
	}

	public static int requiredInt(final JsonNode body, final String field, final int min, final int max) {
		final JsonNode v = body.get(field);
		if (v == null || !v.isIntegralNumber()) {
			throw bad("Поле " + field + " має бути цілим числом");
		}
		final int value = v.asInt();
		if (value < min || value > max) {
			throw bad("Поле " + field + " поза межами [" + min + "; " + max + "]");
		}
		return value;
	}

	public static String requiredString(final JsonNode body, final String field) {
		final JsonNode v = body.get(field);
		if (v == null || !v.isString() || v.asString().isBlank()) {
			throw bad("Поле " + field + " обов'язкове");
		}
		return v.asString();
	}

	private static OffsetDateTime parseDate(final JsonNode v, final String field) {
		try {
			return OffsetDateTime.parse(v.asString());
		} catch (final DateTimeParseException e) {
			throw bad("Поле " + field + " має бути датою ISO-8601");
		}
	}

	private static boolean isFinite(final JsonNode v) {
		return v != null && v.isNumber() && Double.isFinite(v.asDouble());
	}

	private static void requireObject(final JsonNode body, final String what) {
		if (body == null || !body.isObject()) {
			throw bad("Очікується об'єкт: " + what);
		}
	}

	/** Рекурсивно: немає заборонених полів і надмірної вкладеності */
	private static void requireAllowed(final JsonNode node, final int depth) {
		if (depth > MAX_DEPTH) {
			throw bad("Надто глибока вкладеність даних");
		}
		if (node.isObject()) {
			for (final String name : node.propertyNames()) {
				if (FORBIDDEN_FIELDS.contains(name)) {
					throw bad("Координати ключових точок і зображення не приймаються сервером");
				}
				requireAllowed(node.get(name), depth + 1);
			}
		} else if (node.isArray()) {
			for (final JsonNode item : node) {
				requireAllowed(item, depth + 1);
			}
		}
	}

	private static ResponseStatusException bad(final String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}

}
