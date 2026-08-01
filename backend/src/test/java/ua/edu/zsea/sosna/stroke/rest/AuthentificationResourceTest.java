package ua.edu.zsea.sosna.stroke.rest;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;

import ua.edu.zsea.sosna.stroke.model.auth.AuthResponse;
import ua.edu.zsea.sosna.stroke.model.auth.UserApiRegisterRequest;
import ua.edu.zsea.sosna.stroke.model.auth.UserApiRegisterRequestDto;
import ua.edu.zsea.sosna.stroke.model.auth.UserLoginRequest;
import ua.edu.zsea.sosna.stroke.service.auth.UserService;
import ua.edu.zsea.sosna.stroke.service.auth.jwtService;

@WebMvcTest(controllers = AuthentificationResource.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class AuthentificationResourceTest {

	@Autowired
	private MockMvc mockMvc;
	
	private final ObjectMapper objectMapper = new ObjectMapper();

	@MockitoBean
	private UserService userService;
	
	 @MockitoBean
	 private jwtService jwtService;

	@Test
	void get_returnsOk() throws Exception {
		mockMvc.perform(get("/api/auth")).andExpect(status().isOk()).andExpect(content().string("ok"));
	}

	@Test
	void testGet_returnsOk() throws Exception {
		mockMvc.perform(get("/api/auth/test")).andExpect(status().isOk()).andExpect(content().string("ok"));
	}

	@Test
	void testPost_echoesBody() throws Exception {
		final UserApiRegisterRequestDto dto = new UserApiRegisterRequestDto();
		dto.setEmail("u@example.com");
		dto.setPassword("p");
		dto.setFullName("User");

		mockMvc.perform(post("/api/auth/test").contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(dto))).andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("u@example.com")).andExpect(jsonPath("$.password").value("p"))
				.andExpect(jsonPath("$.fullName").value("User"));
	}

	@Test
	void login_returnsAuthResponse() throws Exception {
		when(userService.login(any(UserLoginRequest.class))).thenReturn(AuthResponse.of("access", "refresh", 123L));

		mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(new UserLoginRequest("u@example.com", "pw", null))))
				.andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").value("access"))
				.andExpect(jsonPath("$.refreshToken").value("refresh"));

		verify(userService).login(any(UserLoginRequest.class));
	}

	@Test
	void register_setsCookieAndReturnsAuthResponse() throws Exception {
		when(userService.register(any(UserApiRegisterRequest.class)))
				.thenReturn(AuthResponse.of("access", "refresh", 123L));

		mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(
				objectMapper.writeValueAsString(new UserApiRegisterRequest("User User", "u@example.com", "pw"))))
				.andExpect(status().isOk())
				.andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("user-token=access")))
				.andExpect(jsonPath("$.accessToken").value("access"))
				.andExpect(jsonPath("$.refreshToken").value("refresh"));

		verify(userService).register(any(UserApiRegisterRequest.class));
	}
}
