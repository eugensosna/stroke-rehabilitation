package ua.edu.zsea.sosna.stroke.landmarks;

/**
 * Результат розпізнавання однієї кисті.
 *
 * @param handedness мітка руки MediaPipe як є ("Left" / "Right") або null
 * @param landmarks  21 трійка [x, y, z] у нормованих координатах MediaPipe або null — кисті немає
 */
public record HandDetection(String handedness, double[][] landmarks) {

	public static final int LANDMARK_COUNT = 21;

	public static HandDetection none() {
		return new HandDetection(null, null);
	}

}
