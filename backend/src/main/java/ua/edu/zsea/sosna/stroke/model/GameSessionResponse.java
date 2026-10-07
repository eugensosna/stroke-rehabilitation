package ua.edu.zsea.sosna.stroke.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import ua.edu.zsea.sosna.stroke.domain.GameStats;

public record GameSessionResponse(Long id, String gameName, OffsetDateTime start, BigDecimal duration,
		Integer motionsCount, Double totalDistance, Double averageDistance, Double maxDistance, Double averageSpeed,
		Double maxSpeed) {

	public static GameSessionResponse from(GameStats stats) {
		return new GameSessionResponse(stats.getId(), stats.getGameName(), stats.getStart(), stats.getDuration(),
				stats.getMotionsCount(), stats.getTotalDistance(), stats.getAverageDistance(), stats.getMaxDistance(),
				stats.getAverageSpeed(), stats.getMaxSpeed());
	}

}
