package ua.edu.zsea.sosna.stroke.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class ExercisePayloadsTest {

	private final JsonMapper mapper = JsonMapper.builder().build();

	private JsonNode json(final String s) {
		return mapper.readTree(s);
	}

	private static final String MIN = """
			{"exerciseId":"keypad","startedAt":"2026-11-13T10:00:00Z","attempts":0,"successes":0,
			 "startLevel":1,"endLevel":1,"repetitions":[]}""";

	@Test
	void minimalSeriesIsValid() {
		assertThatCode(() -> ExercisePayloads.validateSeries(json(MIN))).doesNotThrowAnyException();
	}

	@Test
	void nestedForbiddenFieldsAreRejected() {
		for (final String field : new String[] { "landmarks", "image", "frames" }) {
			final String body = MIN.replace("\"repetitions\":[]",
					"\"repetitions\":[{\"x\":{\"" + field + "\":1}}]");
			assertThatThrownBy(() -> ExercisePayloads.validateSeries(json(body)))
					.isInstanceOf(ResponseStatusException.class);
		}
	}

	@Test
	void missingOrWrongFieldsAreRejected() {
		assertThatThrownBy(() -> ExercisePayloads.validateSeries(json("[]")))
				.isInstanceOf(ResponseStatusException.class);
		assertThatThrownBy(() -> ExercisePayloads.validateSeries(json(MIN.replace("\"attempts\":0,", ""))))
				.isInstanceOf(ResponseStatusException.class);
		assertThatThrownBy(() -> ExercisePayloads.validateSeries(json(MIN.replace("2026-11-13T10:00:00Z", "вчора"))))
				.isInstanceOf(ResponseStatusException.class);
		assertThatThrownBy(() -> ExercisePayloads.validateSeries(json(MIN.replace("\"endLevel\":1", "\"endLevel\":0"))))
				.isInstanceOf(ResponseStatusException.class);
	}

	@Test
	void calibrationRangesAreChecked() {
		final String ok = """
				{"kind":"full","ranges":{"Z":{"xr":0,"xg":0.2,"unavailable":false}}}""";
		assertThatCode(() -> ExercisePayloads.validateCalibration(json(ok))).doesNotThrowAnyException();
		assertThatThrownBy(() -> ExercisePayloads.validateCalibration(json(ok.replace("\"xg\":0.2,", ""))))
				.isInstanceOf(ResponseStatusException.class);
		assertThatThrownBy(() -> ExercisePayloads.validateCalibration(json(ok.replace("full", "half"))))
				.isInstanceOf(ResponseStatusException.class);
	}

}
