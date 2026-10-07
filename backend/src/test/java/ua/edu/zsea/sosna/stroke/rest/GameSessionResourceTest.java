package ua.edu.zsea.sosna.stroke.rest;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import ua.edu.zsea.sosna.stroke.model.GameSessionRequest;
import ua.edu.zsea.sosna.stroke.model.GameSessionResponse;
import ua.edu.zsea.sosna.stroke.service.GameSessionService;
import ua.edu.zsea.sosna.stroke.service.auth.jwtService;

@WebMvcTest(controllers = GameSessionResource.class)
@AutoConfigureMockMvc(addFilters = false)
class GameSessionResourceTest {

	private static final String EMAIL = "u@example.com";

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private GameSessionService gameSessionService;

	@MockitoBean
	private jwtService jwtService;

	private final UsernamePasswordAuthenticationToken principal = new UsernamePasswordAuthenticationToken(EMAIL,
			null, List.of());

	@Test
	void saveSession_usesAuthenticatedUser() throws Exception {
		when(gameSessionService.save(eq(EMAIL), any(GameSessionRequest.class))).thenReturn(
				new GameSessionResponse(42L, "arkade", null, null, 1, 0.5, 0.5, 0.5, 0.001, 0.001));

		mockMvc.perform(post("/api/game-sessions").principal(principal).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"gameName":"arkade","start":"2026-10-07T10:00:00Z","durationMs":60000,
						 "motions":[{"startOffsetMs":100,"durationMs":500,"startX":0.1,"startY":0.2,"endX":0.4,"endY":0.6}]}
						"""))
				.andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(42))
				.andExpect(jsonPath("$.motionsCount").value(1));

		verify(gameSessionService).save(eq(EMAIL), any(GameSessionRequest.class));
	}

	@Test
	void saveSession_rejectsOutOfRangeCoordinates() throws Exception {
		mockMvc.perform(post("/api/game-sessions").principal(principal).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"gameName":"arkade","start":"2026-10-07T10:00:00Z","durationMs":60000,
						 "motions":[{"startOffsetMs":100,"durationMs":500,"startX":5,"startY":0.2,"endX":0.4,"endY":0.6}]}
						"""))
				.andExpect(status().isBadRequest());

		verify(gameSessionService, never()).save(any(), any());
	}

	@Test
	void getMySessions_returnsList() throws Exception {
		when(gameSessionService.findForUser(EMAIL)).thenReturn(List.of());

		mockMvc.perform(get("/api/game-sessions/my").principal(principal)).andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}
}
