package ua.edu.zsea.sosna.stroke.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.ServletWebSocketHandlerRegistry;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

import ua.edu.zsea.sosna.stroke.landmarks.LandmarksWebSocketHandler;

/**
 * WebSocket резервного режиму розпізнавання кисті {@code /ws/landmarks}. Автентифікація — першим
 * повідомленням (браузер не може передати заголовок Authorization під час встановлення з'єднання).
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

	/** Кадр — зменшене до 256 пікс. зображення WebP/JPEG; із запасом */
	private static final int MAX_BINARY_BYTES = 512 * 1024;
	private static final int MAX_TEXT_BYTES = 16 * 1024;

	private final LandmarksWebSocketHandler landmarksHandler;
	private final String allowedOrigins;

	public WebSocketConfig(final LandmarksWebSocketHandler landmarksHandler,
			@Value("${stroke.cors.allowed-origins:*}") final String allowedOrigins) {
		this.landmarksHandler = landmarksHandler;
		this.allowedOrigins = allowedOrigins;
	}

	@Override
	public void registerWebSocketHandlers(final WebSocketHandlerRegistry registry) {
		final String[] origins = Arrays.stream(allowedOrigins.replace("\"", "").split(",")).map(String::trim)
				.filter(s -> !s.isEmpty()).toArray(String[]::new);
		// раніше за ReactForwardController, що пересилає на index.html усі шляхи без крапки
		if (registry instanceof ServletWebSocketHandlerRegistry servletRegistry) {
			servletRegistry.setOrder(Ordered.HIGHEST_PRECEDENCE);
		}
		registry.addHandler(landmarksHandler, "/ws/landmarks")
				.setAllowedOriginPatterns(origins.length == 0 ? new String[] { "*" } : origins);
	}

	@Bean
	public ServletServerContainerFactoryBean createWebSocketContainer() {
		final ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
		container.setMaxBinaryMessageBufferSize(MAX_BINARY_BYTES);
		container.setMaxTextMessageBufferSize(MAX_TEXT_BYTES);
		return container;
	}

}
