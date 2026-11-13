package ua.edu.zsea.sosna.stroke.rest;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import tools.jackson.databind.JsonNode;
import ua.edu.zsea.sosna.stroke.service.ExerciseService;

/**
 * Ігрові вправи поточного пацієнта: звіти серій, калібрування, налаштування.
 * Контракт — docs/api-exercise.md. Координати ключових точок і зображення не приймаються.
 */
@RestController
@RequestMapping(value = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = "bearer-jwt")
public class ExerciseResource {

	private final ExerciseService exerciseService;

	public ExerciseResource(final ExerciseService exerciseService) {
		this.exerciseService = exerciseService;
	}

	@PostMapping("/exercise-series")
	@Operation(summary = "Зберегти звіт серії (табл. 2.2)")
	@ApiResponse(responseCode = "201")
	public ResponseEntity<JsonNode> saveSeries(final Authentication authentication,
			@RequestBody final JsonNode body) {
		return new ResponseEntity<>(exerciseService.saveSeries(authentication.getName(), body), HttpStatus.CREATED);
	}

	@GetMapping("/exercise-series/my")
	@Operation(summary = "Серії поточного пацієнта, від нових до старих")
	public ResponseEntity<List<JsonNode>> mySeries(final Authentication authentication,
			@RequestParam(required = false) final Integer limit,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) final OffsetDateTime from) {
		return ResponseEntity.ok(exerciseService.mySeries(authentication.getName(), limit, from));
	}

	@PostMapping("/calibrations")
	@Operation(summary = "Зберегти результат калібрування (новий запис історії)")
	@ApiResponse(responseCode = "201")
	public ResponseEntity<JsonNode> saveCalibration(final Authentication authentication,
			@RequestBody final JsonNode body) {
		return new ResponseEntity<>(exerciseService.saveCalibration(authentication.getName(), body),
				HttpStatus.CREATED);
	}

	@GetMapping("/calibrations/latest")
	@Operation(summary = "Останнє калібрування; 404, якщо його не було")
	public ResponseEntity<JsonNode> latestCalibration(final Authentication authentication) {
		return ResponseEntity.ok(exerciseService.latestCalibration(authentication.getName()));
	}

	@GetMapping("/exercise-settings/my")
	@Operation(summary = "Налаштування вправ від фахівця; 404 — використовуються типові")
	public ResponseEntity<JsonNode> mySettings(final Authentication authentication) {
		return ResponseEntity.ok(exerciseService.mySettings(authentication.getName()));
	}

}
