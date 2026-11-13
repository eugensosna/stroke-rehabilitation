package ua.edu.zsea.sosna.stroke.landmarks;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * Заглушка Python-сервісу розпізнавання: зображення не аналізується, повертається синтетична права
 * кисть, що повільно розкривається і стискається (цикл 4 с). Дає змогу перевірити резервний режим
 * від клієнта до сервера без MediaPipe. Увімкнена, поки {@code stroke.landmarks.detector=mock} (типово).
 */
@Component
@ConditionalOnProperty(name = "stroke.landmarks.detector", havingValue = "mock", matchIfMissing = true)
@Slf4j
public class MockHandLandmarkDetector implements HandLandmarkDetector {

	/** Напрямки пальців від зап'ястка, рад (0 — вгору), для пальців 1..5 у недзеркальному кадрі */
	private static final double[] FINGER_ANGLE = { 0.9, 0.28, 0.05, -0.18, -0.4 };
	/** Довжини фаланг у частках s (п'ясткова кістка, проксимальна, середня, дистальна) */
	private static final double[][] BONES = { { 0.45, 0.35, 0.3, 0.25 }, { 1.0, 0.45, 0.27, 0.22 },
			{ 1.0, 0.5, 0.32, 0.24 }, { 0.95, 0.46, 0.3, 0.22 }, { 0.88, 0.36, 0.22, 0.2 } };

	public MockHandLandmarkDetector() {
		log.warn("Розпізнавання кисті: заглушка (stroke.landmarks.detector=mock), Python-сервіс не використовується");
	}

	@Override
	public HandDetection detect(final byte[] image, final int width, final int height) {
		final double t = System.nanoTime() / 1e9;
		// ступінь згинання 0..0.9
		final double flex = 0.45 * (1 - Math.cos(2 * Math.PI * t / 4));
		return new HandDetection("Left", hand(flex, width, height));
	}

	/**
	 * Синтетична кисть у нормованих координатах: зап'ясток унизу по центру, s ≈ 0,22 висоти кадру.
	 * Згинання суглоба на кут β вкорочує фалангу в площині кадру (cos β) і зсуває її до камери (z).
	 * Мітка "Left" — як повертає MediaPipe для правої руки на недзеркальному кадрі.
	 *
	 * @param flex згинання в кожному суглобі, рад (великий палець — половина)
	 */
	static double[][] hand(final double flex, final int width, final int height) {
		final double w = Math.max(1, width);
		final double h = Math.max(1, height);
		final double s = 0.22 * h;
		final double[][] p = new double[HandDetection.LANDMARK_COUNT][];
		final double wx = 0.5 * w;
		final double wy = 0.82 * h;
		p[0] = new double[] { wx / w, wy / h, 0 };
		for (int k = 0; k < 5; k++) {
			final double dx = Math.sin(FINGER_ANGLE[k]);
			final double dy = -Math.cos(FINGER_ANGLE[k]);
			double x = wx;
			double y = wy;
			double z = 0;
			double bend = 0;
			for (int j = 0; j < 4; j++) {
				if (j > 0) {
					bend += (k == 0 ? 0.5 : 1.0) * flex;
				}
				final double len = BONES[k][j] * s;
				x += dx * len * Math.cos(bend);
				y += dy * len * Math.cos(bend);
				z -= len * Math.sin(bend);
				p[4 * k + j + 1] = new double[] { x / w, y / h, z / w };
			}
		}
		return p;
	}

}
