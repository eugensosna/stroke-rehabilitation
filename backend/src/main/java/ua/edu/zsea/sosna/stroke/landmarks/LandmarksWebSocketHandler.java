package ua.edu.zsea.sosna.stroke.landmarks;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayDeque;
import java.util.Deque;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import com.auth0.jwt.interfaces.DecodedJWT;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import ua.edu.zsea.sosna.stroke.service.auth.jwtService;

/**
 * Резервний режим розпізнавання кисті: WebSocket {@code /ws/landmarks} (протокол —
 * docs/protocol-landmarks-ws.md).
 *
 * Перше текстове повідомлення — {@code {"type":"auth","token":"<JWT>"}}; далі бінарні кадри
 * (заголовок 16 байт LE + WebP/JPEG), на кожен — JSON із 21 ключовою точкою. Кадри обробляються в
 * пам'яті, не зберігаються і не потрапляють у журнали.
 */
@Component
@Slf4j
public class LandmarksWebSocketHandler extends AbstractWebSocketHandler {

	/** Закриття: недійсний маркер */
	public static final CloseStatus UNAUTHORIZED = new CloseStatus(4401, "unauthorized");
	/** Розмір заголовка кадру: seq u32, timestamp f64, width u16, height u16 */
	static final int HEADER_BYTES = 16;

	private static final String ATTR_USER = "landmarks.user";
	private static final String ATTR_TIMES = "landmarks.times";

	private final jwtService jwtService;
	private final HandLandmarkDetector detector;
	private final ObjectMapper objectMapper;
	private final int maxFps;

	public LandmarksWebSocketHandler(final jwtService jwtService, final HandLandmarkDetector detector,
			final ObjectMapper objectMapper, @Value("${stroke.landmarks.max-fps:30}") final int maxFps) {
		this.jwtService = jwtService;
		this.detector = detector;
		this.objectMapper = objectMapper;
		this.maxFps = maxFps;
	}

	@Override
	protected void handleTextMessage(final WebSocketSession session, final TextMessage message) throws IOException {
		final JsonNode msg;
		try {
			msg = objectMapper.readTree(message.getPayload());
		} catch (final JacksonException e) {
			sendError(session, "bad_frame", "Повідомлення не розпізнано.");
			return;
		}
		if (!"auth".equals(msg.path("type").asString(""))) {
			sendError(session, "bad_frame", "Невідоме повідомлення.");
			return;
		}
		final String token = msg.path("token").asString("");
		final DecodedJWT jwt = token.isBlank() ? null : jwtService.validateToken(token, null);
		if (jwt == null || jwtService.isTokenExpired(jwt)) {
			rejectUnauthorized(session);
			return;
		}
		session.getAttributes().put(ATTR_USER, jwt.getSubject());
		session.getAttributes().put(ATTR_TIMES, new ArrayDeque<Long>());
		log.debug("landmarks socket {} authenticated", session.getId());
	}

	@Override
	@SuppressWarnings("unchecked")
	protected void handleBinaryMessage(final WebSocketSession session, final BinaryMessage message)
			throws IOException {
		if (session.getAttributes().get(ATTR_USER) == null) {
			rejectUnauthorized(session);
			return;
		}
		if (!allowFrame((Deque<Long>) session.getAttributes().get(ATTR_TIMES))) {
			sendError(session, "rate_limited", "Забагато кадрів за секунду.");
			return;
		}

		final ByteBuffer buf = message.getPayload().order(ByteOrder.LITTLE_ENDIAN);
		if (buf.remaining() <= HEADER_BYTES) {
			sendError(session, "bad_frame", "Кадр не розпізнано.");
			return;
		}
		final long seq = Integer.toUnsignedLong(buf.getInt());
		final double timestamp = buf.getDouble();
		final int width = Short.toUnsignedInt(buf.getShort());
		final int height = Short.toUnsignedInt(buf.getShort());
		final byte[] image = new byte[buf.remaining()];
		buf.get(image);

		final HandDetection result;
		try {
			result = detector.detect(image, width, height);
		} catch (final DetectorUnavailableException e) {
			log.warn("landmark detector unavailable: {}", e.getMessage());
			sendError(session, "unavailable", "Сервіс розпізнавання тимчасово недоступний.");
			session.close(CloseStatus.SERVER_ERROR);
			return;
		}
		session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response(seq, timestamp, result))));
	}

	/** Ковзне вікно 1 с: не більше maxFps кадрів */
	private boolean allowFrame(final Deque<Long> times) {
		final long now = System.nanoTime();
		while (!times.isEmpty() && now - times.peekFirst() > 1_000_000_000L) {
			times.pollFirst();
		}
		if (times.size() >= maxFps) {
			return false;
		}
		times.addLast(now);
		return true;
	}

	private ObjectNode response(final long seq, final double timestamp, final HandDetection result) {
		final ObjectNode node = objectMapper.createObjectNode();
		node.put("seq", seq);
		node.put("timestamp", timestamp);
		if (result.landmarks() == null || result.landmarks().length != HandDetection.LANDMARK_COUNT) {
			node.putNull("handedness");
			node.putNull("landmarks");
			return node;
		}
		node.put("handedness", result.handedness());
		final ArrayNode points = node.putArray("landmarks");
		for (final double[] p : result.landmarks()) {
			points.addArray().add(p[0]).add(p[1]).add(p.length > 2 ? p[2] : 0);
		}
		return node;
	}

	private void rejectUnauthorized(final WebSocketSession session) throws IOException {
		sendError(session, "unauthorized", "Потрібна автентифікація.");
		session.close(UNAUTHORIZED);
	}

	private void sendError(final WebSocketSession session, final String code, final String text) throws IOException {
		if (!session.isOpen()) {
			return;
		}
		final ObjectNode node = objectMapper.createObjectNode();
		node.put("type", "error");
		node.put("code", code);
		node.put("message", text);
		session.sendMessage(new TextMessage(objectMapper.writeValueAsString(node)));
	}

}
