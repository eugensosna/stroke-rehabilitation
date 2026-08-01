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

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;

import ua.edu.zsea.sosna.stroke.model.GameStatsDTO;
import ua.edu.zsea.sosna.stroke.service.GameStatsService;
import ua.edu.zsea.sosna.stroke.service.auth.jwtService;

@WebMvcTest(controllers = GameStatsResource.class)
@AutoConfigureMockMvc(addFilters = false)
class GameStatsResourceTest {

	@Autowired
	private MockMvc mockMvc;

	private final ObjectMapper objectMapper = new ObjectMapper();
	
	@MockitoBean
	private GameStatsService gameStatsService;

	@MockitoBean
	private jwtService jwtService;


	@Test
	void getAllGameStatss_returnsList() throws Exception {
		when(gameStatsService.findAll()).thenReturn(List.of());

		mockMvc.perform(get("/api/gameStatss")).andExpect(status().isOk()).andExpect(content().json("[]"));
	}

	@Test
	void getGameStats_returnsDto() throws Exception {
		final GameStatsDTO dto = new GameStatsDTO();
		dto.setId(1L);
		when(gameStatsService.get(1L)).thenReturn(dto);

		mockMvc.perform(get("/api/gameStatss/1")).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(1));
	}

	@Test
	void createGameStats_returnsCreatedId() throws Exception {
		when(gameStatsService.create(any(GameStatsDTO.class))).thenReturn(10L);

		mockMvc.perform(post("/api/gameStatss").contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(new GameStatsDTO()))).andExpect(status().isCreated()).andExpect(content().string("10"));
	}

	@Test
	void updateGameStats_returnsId() throws Exception {
		mockMvc.perform(put("/api/gameStatss/5").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(new GameStatsDTO())))
				.andExpect(status().isOk()).andExpect(content().string("5"));

		verify(gameStatsService).update(eq(5L), any(GameStatsDTO.class));
	}

	@Test
	void deleteGameStats_returnsNoContent() throws Exception {
		mockMvc.perform(delete("/api/gameStatss/7")).andExpect(status().isNoContent());

		verify(gameStatsService).delete(7L);
	}
}

