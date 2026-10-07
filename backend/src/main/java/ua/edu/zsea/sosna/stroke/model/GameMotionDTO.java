package ua.edu.zsea.sosna.stroke.model;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * Рух зап'ястка з клієнта. Координати нормалізовані відносно кадру камери (0..1).
 */
public record GameMotionDTO(
		@NotNull @PositiveOrZero Long startOffsetMs,
		@NotNull @PositiveOrZero Double durationMs,
		@NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double startX,
		@NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double startY,
		@NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double endX,
		@NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double endY) {

}
