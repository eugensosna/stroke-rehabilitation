package ua.edu.zsea.sosna.stroke.landmarks;

/**
 * Розпізнавання 21 ключової точки кисті на кадрі (резервний режим, docs/protocol-landmarks-ws.md).
 *
 * Робоча реалізація — gRPC-клієнт Python-сервісу MediaPipe Hand Landmarker (контракт —
 * docs/proto/hand_landmarks.proto); поки сервісу немає, використовується {@link MockHandLandmarkDetector}.
 * Зображення обробляється в пам'яті й ніде не зберігається.
 */
public interface HandLandmarkDetector {

	/**
	 * @param image  стиснуте зображення (WebP або JPEG), зменшене, недзеркальне
	 * @param width  ширина вихідного кадру вебкамери, пікс.
	 * @param height висота вихідного кадру, пікс.
	 * @return результат; {@link HandDetection#none()}, якщо кисть не знайдено
	 * @throws DetectorUnavailableException сервіс розпізнавання недоступний
	 */
	HandDetection detect(byte[] image, int width, int height);

}
