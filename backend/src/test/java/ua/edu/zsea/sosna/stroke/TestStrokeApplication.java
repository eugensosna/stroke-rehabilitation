package ua.edu.zsea.sosna.stroke;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(classes = StrokeApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT

)
@ActiveProfiles("test")
public class TestStrokeApplication {

	@Test
	public void contextLoad() {

	}

}
