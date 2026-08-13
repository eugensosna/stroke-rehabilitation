package ua.edu.zsea.sosna.stroke.rest;

import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import ua.edu.zsea.sosna.stroke.service.auth.jwtService;

@WebMvcTest(controllers = TestResource.class)
@AutoConfigureMockMvc(addFilters = false)
class TestResourceTest {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private jwtService jwtService;

	@Test
	void test_returnsOkAndCallsJwtService() throws Exception {
		mockMvc.perform(get("/test/test")).andExpect(status().isOk()).andExpect(content().string("ok"));

		verify(jwtService).getAccessTokenExpiration();
	}
}

