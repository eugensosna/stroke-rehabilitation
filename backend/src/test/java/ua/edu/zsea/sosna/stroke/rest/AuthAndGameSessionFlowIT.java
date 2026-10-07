package ua.edu.zsea.sosna.stroke.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;

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
 * Наскрізний сценарій: реєстрація -> збереження статистики рухів -> читання -> refresh токена.
 */
@SpringBootTest(classes = StrokeApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AuthAndGameSessionFlowIT {

	private static final String SESSION_JSON = """
			{"gameName":"arkade","start":"2026-10-07T10:00:00Z","durationMs":61500,
			 "motions":[
			   {"startOffsetMs":100,"durationMs":500,"startX":0.1,"startY":0.5,"endX":0.4,"endY":0.9},
			   {"startOffsetMs":2000,"durationMs":1000,"startX":0.4,"startY":0.5,"endX":0.5,"endY":0.5}
			 ]}
			""";

	@LocalServerPort
	private int port;

	private final JsonParser json = JsonParserFactory.getJsonParser();
	private RestClient client;

	@BeforeEach
	void setUp() {
		client = RestClient.builder().baseUrl("http://localhost:" + port + "/api")
				.defaultStatusHandler(HttpStatusCode::isError, (req, res) -> {
				}).build();
	}

	private record Result(int status, String body) {
	}

	private Result post(String path, String body, String token) {
		var spec = client.post().uri(path).contentType(MediaType.APPLICATION_JSON).body(body);
		if (token != null) {
			spec = spec.header("Authorization", "Bearer " + token);
		}
		return spec.exchange((req, res) -> new Result(res.getStatusCode().value(),
				new String(res.getBody().readAllBytes())));
	}

	private Result get(String path, String token) {
		var spec = client.get().uri(path);
		if (token != null) {
			spec = spec.header("Authorization", "Bearer " + token);
		}
		return spec.exchange((req, res) -> new Result(res.getStatusCode().value(),
				new String(res.getBody().readAllBytes())));
	}

	@Test
	void registeredUserCanSaveAndReadMovementStatistics() {
		final String register = """
				{"fullname":"Test Patient","email":"patient-flow@example.com","password":"secret123"}""";

		final Result registered = post("/auth/register", register, null);
		assertThat(registered.status()).isEqualTo(200);
		final Map<String, Object> tokens = json.parseMap(registered.body());
		final String accessToken = (String) tokens.get("accessToken");
		final String refreshToken = (String) tokens.get("refreshToken");
		assertThat(accessToken).isNotBlank();

		// повторна реєстрація з тим самим email
		assertThat(post("/auth/register", register, null).status()).isEqualTo(409);

		// без токена -> 401 (фронтенд на це оновлює токен)
		assertThat(post("/game-sessions", SESSION_JSON, null).status()).isEqualTo(401);

		final Result saved = post("/game-sessions", SESSION_JSON, accessToken);
		assertThat(saved.status()).isEqualTo(201);
		final Map<String, Object> savedBody = json.parseMap(saved.body());
		assertThat(((Number) savedBody.get("motionsCount")).intValue()).isEqualTo(2);
		// 0.5 (3-4-5 трикутник * 0.1) і 0.1
		assertThat(((Number) savedBody.get("maxDistance")).doubleValue()).isCloseTo(0.5, offset(1e-9));
		assertThat(((Number) savedBody.get("averageDistance")).doubleValue()).isCloseTo(0.3, offset(1e-9));

		final Result mine = get("/game-sessions/my", accessToken);
		assertThat(mine.status()).isEqualTo(200);
		final List<Object> sessions = json.parseList(mine.body());
		assertThat(sessions).hasSize(1);

		final Result refreshed = post("/auth/refreshToken", "{\"refreshToken\":\"" + refreshToken + "\"}", null);
		assertThat(refreshed.status()).isEqualTo(200);
		final String newAccessToken = (String) json.parseMap(refreshed.body()).get("accessToken");
		assertThat(get("/game-sessions/my", newAccessToken).status()).isEqualTo(200);
	}

	@Test
	void otherUserDoesNotSeeForeignSessions() {
		final String a = (String) json.parseMap(post("/auth/register",
				"{\"fullname\":\"A A\",\"email\":\"a-iso@example.com\",\"password\":\"secret123\"}", null).body())
				.get("accessToken");
		final String b = (String) json.parseMap(post("/auth/register",
				"{\"fullname\":\"B B\",\"email\":\"b-iso@example.com\",\"password\":\"secret123\"}", null).body())
				.get("accessToken");

		assertThat(post("/game-sessions", SESSION_JSON, a).status()).isEqualTo(201);
		assertThat(json.parseList(get("/game-sessions/my", b).body())).isEmpty();
	}

}
