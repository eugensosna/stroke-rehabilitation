package ua.edu.zsea.sosna.stroke.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import ua.edu.zsea.sosna.stroke.domain.Calibration;
import ua.edu.zsea.sosna.stroke.domain.ExerciseSeries;
import ua.edu.zsea.sosna.stroke.domain.User;
import ua.edu.zsea.sosna.stroke.repos.CalibrationRepository;
import ua.edu.zsea.sosna.stroke.repos.ExerciseSeriesRepository;
import ua.edu.zsea.sosna.stroke.repos.ExerciseSettingsRepository;
import ua.edu.zsea.sosna.stroke.util.NotFoundException;

/**
 * Звіти серій, калібрування і налаштування вправ поточного пацієнта (користувач — з JWT).
 */
@Service
@Slf4j
@AllArgsConstructor
public class ExerciseService {

	static final int DEFAULT_LIMIT = 100;
	static final int MAX_LIMIT = 500;

	private final ExerciseSeriesRepository seriesRepository;
	private final CalibrationRepository calibrationRepository;
	private final ExerciseSettingsRepository settingsRepository;
	private final UserEntityService userEntityService;
	private final ObjectMapper objectMapper;

	/** Збереження звіту серії; відповідь — звіт з id і savedAt */
	@Transactional
	public JsonNode saveSeries(final String userEmail, final JsonNode body) {
		ExercisePayloads.validateSeries(body);
		final User user = userEntityService.findByEmail(userEmail);
		final ObjectNode report = ((ObjectNode) body).deepCopy();
		report.remove("id");
		report.remove("savedAt");

		final ExerciseSeries series = new ExerciseSeries();
		series.setUser(user);
		series.setExerciseId(report.get("exerciseId").asString());
		series.setStartedAt(ExercisePayloads.requiredDate(report, "startedAt"));
		series.setSavedAt(OffsetDateTime.now(ZoneOffset.UTC));
		series.setAttempts(report.get("attempts").asInt());
		series.setSuccesses(report.get("successes").asInt());
		series.setStartLevel(report.get("startLevel").asInt());
		series.setEndLevel(report.get("endLevel").asInt());
		series.setReport(objectMapper.writeValueAsString(report));
		final ExerciseSeries saved = seriesRepository.save(series);
		log.info("saved exercise series {} ({}) for user {}", saved.getId(), saved.getExerciseId(), user.getId());
		return toRecord(saved);
	}

	/** Серії пацієнта від нових до старих */
	@Transactional(readOnly = true)
	public List<JsonNode> mySeries(final String userEmail, final Integer limit, final OffsetDateTime from) {
		final User user = userEntityService.findByEmail(userEmail);
		final int size = limit == null ? DEFAULT_LIMIT : Math.max(1, Math.min(MAX_LIMIT, limit));
		final PageRequest page = PageRequest.of(0, size);
		final List<ExerciseSeries> list = from == null
				? seriesRepository.findByUserIdOrderByStartedAtDesc(user.getId(), page)
				: seriesRepository.findByUserIdAndStartedAtGreaterThanEqualOrderByStartedAtDesc(user.getId(), from,
						page);
		return list.stream().map(this::toRecord).toList();
	}

	/** Збереження калібрування (новий запис історії) */
	@Transactional
	public JsonNode saveCalibration(final String userEmail, final JsonNode body) {
		ExercisePayloads.validateCalibration(body);
		final User user = userEntityService.findByEmail(userEmail);
		final OffsetDateTime createdAt = ExercisePayloads.optionalDate(body, "createdAt");

		final Calibration calibration = new Calibration();
		calibration.setUser(user);
		calibration.setCreatedAt(createdAt != null ? createdAt : OffsetDateTime.now(ZoneOffset.UTC));
		calibration.setKind(body.get("kind").asString());
		calibration.setRanges(objectMapper.writeValueAsString(body.get("ranges")));
		final Calibration saved = calibrationRepository.save(calibration);
		log.info("saved calibration {} ({}) for user {}", saved.getId(), saved.getKind(), user.getId());
		return toRecord(saved);
	}

	/** Останнє калібрування; 404, якщо його ще не було */
	@Transactional(readOnly = true)
	public JsonNode latestCalibration(final String userEmail) {
		final User user = userEntityService.findByEmail(userEmail);
		return calibrationRepository.findFirstByUserIdOrderByCreatedAtDescIdDesc(user.getId()).map(this::toRecord)
				.orElseThrow(() -> new NotFoundException("Калібрування ще не проводилося"));
	}

	/** Налаштування, задані фахівцем; 404 — клієнт бере типові */
	@Transactional(readOnly = true)
	public JsonNode mySettings(final String userEmail) {
		final User user = userEntityService.findByEmail(userEmail);
		return settingsRepository.findByUserId(user.getId()).map(s -> objectMapper.readTree(s.getSettings()))
				.orElseThrow(() -> new NotFoundException("Налаштування вправ ще не задано"));
	}

	private JsonNode toRecord(final ExerciseSeries s) {
		final ObjectNode node = (ObjectNode) objectMapper.readTree(s.getReport());
		node.put("id", s.getId());
		node.put("savedAt", s.getSavedAt().toString());
		return node;
	}

	private JsonNode toRecord(final Calibration c) {
		final ObjectNode node = objectMapper.createObjectNode();
		node.put("id", c.getId());
		node.put("createdAt", c.getCreatedAt().toString());
		node.put("kind", c.getKind());
		node.set("ranges", objectMapper.readTree(c.getRanges()));
		return node;
	}

}
