package ua.edu.zsea.sosna.stroke.model;

import java.time.OffsetDateTime;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record GameSessionRequest(
		@NotBlank @Size(max = 255) String gameName,
		@NotNull OffsetDateTime start,
		@NotNull @PositiveOrZero Long durationMs,
		@NotNull @Size(max = 10000) List<@Valid @NotNull GameMotionDTO> motions) {

}
