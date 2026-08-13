package ua.edu.zsea.sosna.stroke.rest;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;

import ua.edu.zsea.sosna.stroke.model.GameDTO;
import ua.edu.zsea.sosna.stroke.service.GameService;
import ua.edu.zsea.sosna.stroke.service.GameStatsService;
import ua.edu.zsea.sosna.stroke.service.auth.UserService;

@WebMvcTest(controllers = GameResource.class)
@AutoConfigureMockMvc(addFilters = false)
class GameResourceTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private GameService gameService;

	@MockBean
	private GameStatsService gameStatsService;

	@MockBean
	private UserService userService;

	@Test
	void getAllGames_returnsList() throws Exception {
		when(gameService.findAll()).thenReturn(List.of());

		mockMvc.perform(get("/api/games")).andExpect(status().isOk()).andExpect(content().json("[]"));
	}

	@Test
	void test_returnsOk() throws Exception {
		mockMvc.perform(get("/api/games/test")).andExpect(status().isOk()).andExpect(content().string("ok"));
	}

	@Test
	void getGame_returnsDto() throws Exception {
		final GameDTO dto = new GameDTO();
		dto.setId(1L);
		dto.setName("g1");
		dto.setStatistic(2L);
		dto.setUser(3L);
		when(gameService.get(1L)).thenReturn(dto);

		mockMvc.perform(get("/api/games/1")).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.name").value("g1")).andExpect(jsonPath("$.statistic").value(2))
				.andExpect(jsonPath("$.user").value(3));
	}

	@Test
	void createGame_returnsCreatedId() throws Exception {
		when(gameService.create(any(GameDTO.class))).thenReturn(10L);

		mockMvc.perform(post("/api/games").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(new GameDTO())))
				.andExpect(status().isCreated()).andExpect(content().string("10"));
	}

	@Test
	void updateGame_returnsId() throws Exception {
		mockMvc.perform(put("/api/games/5").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(new GameDTO())))
				.andExpect(status().isOk()).andExpect(content().string("5"));

		verify(gameService).update(eq(5L), any(GameDTO.class));
	}

	@Test
	void deleteGame_returnsNoContent() throws Exception {
		mockMvc.perform(delete("/api/games/7")).andExpect(status().isNoContent());

		verify(gameService).delete(7L);
	}

	@Test
	void getStatisticValues_returnsMap() throws Exception {
		when(gameStatsService.getGameStatsValues()).thenReturn(Map.of(1L, 2L));

		mockMvc.perform(get("/api/games/statisticValues")).andExpect(status().isOk()).andExpect(jsonPath("$.\"1\"").value(2));
	}

	@Test
	void getUserValues_returnsMap() throws Exception {
		when(userService.getUserValues()).thenReturn(Map.of(1L, 2L));

		mockMvc.perform(get("/api/games/userValues")).andExpect(status().isOk()).andExpect(jsonPath("$.\"1\"").value(2));
	}
}

