package ua.edu.zsea.sosna.stroke.rest;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.json.JsonParser;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.RestClient;

import ua.edu.zsea.sosna.stroke.StrokeApplication;

/**
 * Наскрізний сценарій вправ: звіт серії, калібрування, налаштування (docs/api-exercise.md).
 */
@SpringBootTest(classes = StrokeApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ExerciseFlowIT {

	static final String SERIES = """
			{"exerciseId":"pinch","startedAt":"2026-11-13T10:00:00.000Z","attempts":3,"successes":2,
			 "successRatePct":66.7,"meanAmplitude":0.71,"maxAmplitude":0.84,"amplitudeUnit":"s",
			 "frequencyHz":0.25,"rhythmCvPct":6.3,"meanHoldTimeS":0.92,"meanIsolation":null,
			 "ranges":[{"metric":"d2","xr":0.95,"xg":0.12}],"startLevel":2,"endLevel":3,
			 "activeDurationMin":1.2,"detectionRatePct":97.4,"trackingMode":"local","meanFps":29.7,
			 "repetitions":[{"index":1,"target":null,"metric":"d2","startS":1.04,"goalS":1.83,"endS":3.9,
			   "success":true,"level":2,"amplitude":0.79,"holdTimeS":1.12,"isolation":null,
			   "pausedBefore":false,"jointAnglesDeg":[[12.1,20.4],[8.3,15.0,9.9]]}]}
			""";

	static final String CALIBRATION = """
			{"createdAt":"2026-11-13T09:58:00.000Z","kind":"full",
			 "ranges":{"O":{"xr":1.21,"xg":2.05,"unavailable":false},"d2":{"xr":0.98,"xg":0.14,"unavailable":false}}}
			""";

	@LocalServerPort
	private int port;

	private final JsonParser json = JsonParserFactory.getJsonParser();
	private RestClient client;

	private record Result(int status, String body) {
	}

	@BeforeEach
	void setUp() {
		client = RestClient.builder().baseUrl("http://localhost:" + port + "/api")
				.defaultStatusHandler(HttpStatusCode::isError, (req, res) -> {
				}).build();
	}

	private Result post(final String path, final String body, final String token) {
		var spec = client.post().uri(path).contentType(MediaType.APPLICATION_JSON).body(body);
		if (token != null) {
			spec = spec.header("Authorization", "Bearer " + token);
		}
		return spec.exchange(
				(req, res) -> new Result(res.getStatusCode().value(), new String(res.getBody().readAllBytes())));
	}

	private Result get(final String path, final String token) {
		var spec = client.get().uri(path);
		if (token != null) {
			spec = spec.header("Authorization", "Bearer " + token);
		}
		return spec.exchange(
				(req, res) -> new Result(res.getStatusCode().value(), new String(res.getBody().readAllBytes())));
	}

	private String register(final String email) {
		final Result r = post("/auth/register",
				"{\"fullname\":\"Test Patient\",\"email\":\"" + email + "\",\"password\":\"secret123\"}", null);
		assertThat(r.status()).isEqualTo(200);
		return (String) json.parseMap(r.body()).get("accessToken");
	}

	@Test
	void seriesAreSavedAndReturnedForOwnerOnly() {
		final String token = register("exercise-series@example.com");

		assertThat(post("/exercise-series", SERIES, null).status()).isEqualTo(401);

		final Result saved = post("/exercise-series", SERIES, token);
		assertThat(saved.status()).isEqualTo(201);
		final Map<String, Object> record = json.parseMap(saved.body());
		assertThat(record.get("id")).isNotNull();
		assertThat(record.get("savedAt")).isNotNull();
		assertThat(record.get("exerciseId")).isEqualTo("pinch");
		assertThat((List<?>) record.get("repetitions")).hasSize(1);

		final List<Object> mine = json.parseList(get("/exercise-series/my", token).body());
		assertThat(mine).hasSize(1);
		assertThat(((Map<?, ?>) mine.get(0)).get("endLevel")).isEqualTo(3);

		final String other = register("exercise-other@example.com");
		assertThat(json.parseList(get("/exercise-series/my", other).body())).isEmpty();
	}

	@Test
	void seriesWithLandmarksOrInconsistentCountsIsRejected() {
		final String token = register("exercise-invalid@example.com");
		final String withLandmarks = SERIES.replace("\"pausedBefore\":false",
				"\"pausedBefore\":false,\"landmarks\":[[0.1,0.2,0]]");
		assertThat(post("/exercise-series", withLandmarks, token).status()).isEqualTo(400);
		assertThat(post("/exercise-series", SERIES.replace("\"successes\":2", "\"successes\":5"), token).status())
				.isEqualTo(400);
		assertThat(post("/exercise-series", SERIES.replace("\"pinch\"", "\"unknown\""), token).status())
				.isEqualTo(400);
		assertThat(json.parseList(get("/exercise-series/my", token).body())).isEmpty();
	}

	@Test
	void latestCalibrationAndSettings() {
		final String token = register("exercise-calibration@example.com");

		assertThat(get("/calibrations/latest", token).status()).isEqualTo(404);
		assertThat(get("/exercise-settings/my", token).status()).isEqualTo(404);

		assertThat(post("/calibrations", CALIBRATION, token).status()).isEqualTo(201);
		final Result second = post("/calibrations", CALIBRATION.replace("\"full\"", "\"short\"")
				.replace("09:58", "10:30"), token);
		assertThat(second.status()).isEqualTo(201);

		final Result latest = get("/calibrations/latest", token);
		assertThat(latest.status()).isEqualTo(200);
		final Map<String, Object> rec = json.parseMap(latest.body());
		assertThat(rec.get("kind")).isEqualTo("short");
		final Map<?, ?> ranges = (Map<?, ?>) rec.get("ranges");
		assertThat(ranges.containsKey("O") && ranges.containsKey("d2")).isTrue();

		assertThat(post("/calibrations", CALIBRATION.replace("\"O\"", "\"Q\""), token).status()).isEqualTo(400);
	}

}
