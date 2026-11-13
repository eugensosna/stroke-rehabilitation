package ua.edu.zsea.sosna.stroke.landmarks;

/** Сервіс розпізнавання (gRPC) недоступний — з'єднання закривається з кодом 1011 */
public class DetectorUnavailableException extends RuntimeException {

	public DetectorUnavailableException(final String message, final Throwable cause) {
		super(message, cause);
	}

}
