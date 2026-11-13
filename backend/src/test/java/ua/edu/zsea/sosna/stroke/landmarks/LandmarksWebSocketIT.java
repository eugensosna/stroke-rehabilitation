package ua.edu.zsea.sosna.stroke.landmarks;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.List;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.boot.json.JsonParser;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.RestClient;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import ua.edu.zsea.sosna.stroke.StrokeApplication;

/**
 * WebSocket резервного режиму з заглушкою сервісу розпізнавання.
 */
@SpringBootTest(classes = StrokeApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class LandmarksWebSocketIT {

	@LocalServerPort
	private int port;

	private final JsonParser json = JsonParserFactory.getJsonParser();

	/** Клієнт, що складає текстові відповіді й код закриття */
	static class Client extends TextWebSocketHandler {
		final BlockingQueue<String> messages = new LinkedBlockingQueue<>();
		final CompletableFuture<CloseStatus> closed = new CompletableFuture<>();

		@Override
		protected void handleTextMessage(final WebSocketSession session, final TextMessage message) {
			messages.add(message.getPayload());
		}

		@Override
		public void afterConnectionClosed(final WebSocketSession session, final CloseStatus status) {
			closed.complete(status);
		}
	}

	private WebSocketSession connect(final Client client) throws Exception {
		return new StandardWebSocketClient().execute(client, "ws://localhost:" + port + "/ws/landmarks")
				.get(5, TimeUnit.SECONDS);
	}

	private String token() {
		final String body = RestClient.create("http://localhost:" + port + "/api").post().uri("/auth/register")
				.contentType(MediaType.APPLICATION_JSON)
				.body("{\"fullname\":\"Ws Patient\",\"email\":\"ws-" + System.nanoTime()
						+ "@example.com\",\"password\":\"secret123\"}")
				.retrieve().body(String.class);
		return (String) json.parseMap(body).get("accessToken");
	}

	private static BinaryMessage frame(final long seq, final double timestamp) {
		final ByteBuffer b = ByteBuffer.allocate(LandmarksWebSocketHandler.HEADER_BYTES + 4)
				.order(ByteOrder.LITTLE_ENDIAN);
		b.putInt((int) seq).putDouble(timestamp).putShort((short) 640).putShort((short) 480);
		b.put(new byte[] { 'R', 'I', 'F', 'F' });
		b.flip();
		return new BinaryMessage(b);
	}

	@Test
	void authenticatedFrameGetsLandmarks() throws Exception {
		final Client client = new Client();
		final WebSocketSession session = connect(client);
		session.sendMessage(new TextMessage("{\"type\":\"auth\",\"token\":\"" + token() + "\"}"));
		session.sendMessage(frame(7, 1234.5));

		final String reply = client.messages.poll(5, TimeUnit.SECONDS);
		assertThat(reply).isNotNull();
		final Map<String, Object> msg = json.parseMap(reply);
		assertThat(((Number) msg.get("seq")).longValue()).isEqualTo(7);
		assertThat(((Number) msg.get("timestamp")).doubleValue()).isEqualTo(1234.5);
		assertThat(msg.get("handedness")).isEqualTo("Left");
		final List<?> landmarks = (List<?>) msg.get("landmarks");
		assertThat(landmarks).hasSize(21);
		for (final Object p : landmarks) {
			final List<?> xyz = (List<?>) p;
			assertThat(xyz).hasSize(3);
			assertThat(((Number) xyz.get(0)).doubleValue()).isBetween(0.0, 1.0);
			assertThat(((Number) xyz.get(1)).doubleValue()).isBetween(0.0, 1.0);
		}
		session.close();
	}

	@Test
	void invalidTokenClosesWith4401() throws Exception {
		final Client client = new Client();
		final WebSocketSession session = connect(client);
		session.sendMessage(new TextMessage("{\"type\":\"auth\",\"token\":\"not-a-jwt\"}"));
		assertThat(json.parseMap(client.messages.poll(5, TimeUnit.SECONDS)).get("code")).isEqualTo("unauthorized");
		assertThat(client.closed.get(5, TimeUnit.SECONDS).getCode()).isEqualTo(4401);
	}

	@Test
	void frameBeforeAuthClosesWith4401() throws Exception {
		final Client client = new Client();
		final WebSocketSession session = connect(client);
		session.sendMessage(frame(1, 0));
		assertThat(client.closed.get(5, TimeUnit.SECONDS).getCode()).isEqualTo(4401);
	}

}
