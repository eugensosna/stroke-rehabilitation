package ua.edu.zsea.sosna.stroke.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ua.edu.zsea.sosna.stroke.domain.Game;
import ua.edu.zsea.sosna.stroke.domain.GameMotion;
import ua.edu.zsea.sosna.stroke.domain.GameStats;
import ua.edu.zsea.sosna.stroke.domain.User;
import ua.edu.zsea.sosna.stroke.model.GameMotionDTO;
import ua.edu.zsea.sosna.stroke.model.GameSessionRequest;
import ua.edu.zsea.sosna.stroke.model.GameSessionResponse;
import ua.edu.zsea.sosna.stroke.repos.GameRepository;
import ua.edu.zsea.sosna.stroke.repos.GameStatsRepository;

/**
 * Зберігає статистику рухів ігрової сесії для автентифікованого користувача.
 */
@Service
@Slf4j
@AllArgsConstructor
public class GameSessionService {

	private final GameStatsRepository gameStatsRepository;
	private final GameRepository gameRepository;
	private final UserEntityService userEntityService;

	@Transactional
	public GameSessionResponse save(final String userEmail, final GameSessionRequest request) {
		final User user = userEntityService.findByEmail(userEmail);

		final GameStats stats = new GameStats();
		stats.setUser(user);
		stats.setGameName(request.gameName());
		stats.setStart(request.start());
		// duration зберігається в секундах
		stats.setDuration(BigDecimal.valueOf(request.durationMs()).divide(BigDecimal.valueOf(1000), 3,
				RoundingMode.HALF_UP));

		double totalDistance = 0;
		double totalSpeed = 0;
		double maxDistance = 0;
		double maxSpeed = 0;
		for (final GameMotionDTO dto : request.motions()) {
			final GameMotion motion = mapToEntity(dto, stats);
			stats.getMotions().add(motion);
			totalDistance += motion.getDistance();
			totalSpeed += motion.getSpeed();
			maxDistance = Math.max(maxDistance, motion.getDistance());
			maxSpeed = Math.max(maxSpeed, motion.getSpeed());
		}
		final int count = stats.getMotions().size();
		stats.setMotionsCount(count);
		stats.setTotalDistance(totalDistance);
		stats.setMaxDistance(maxDistance);
		stats.setMaxSpeed(maxSpeed);
		stats.setAverageDistance(count == 0 ? 0 : totalDistance / count);
		stats.setAverageSpeed(count == 0 ? 0 : totalSpeed / count);
		final GameStats saved = gameStatsRepository.save(stats);

		final Game game = new Game();
		game.setName(request.gameName());
		game.setUser(user);
		game.setStatistic(saved);
		gameRepository.save(game);

		log.info("saved game session {} for user {} with {} motions", saved.getId(), user.getId(), count);
		return GameSessionResponse.from(saved);
	}

	@Transactional(readOnly = true)
	public List<GameSessionResponse> findForUser(final String userEmail) {
		final User user = userEntityService.findByEmail(userEmail);
		return gameStatsRepository.findAllByUserIdOrderByStartDesc(user.getId()).stream()
				.map(GameSessionResponse::from).toList();
	}

	private GameMotion mapToEntity(final GameMotionDTO dto, final GameStats stats) {
		final GameMotion motion = new GameMotion();
		motion.setGameStats(stats);
		motion.setStartOffsetMs(dto.startOffsetMs());
		motion.setDurationMs(dto.durationMs());
		motion.setStartX(dto.startX());
		motion.setStartY(dto.startY());
		motion.setEndX(dto.endX());
		motion.setEndY(dto.endY());
		// перераховуємо на сервері, щоб не довіряти клієнтським значенням
		final double distance = Math.hypot(dto.endX() - dto.startX(), dto.endY() - dto.startY());
		motion.setDistance(distance);
		motion.setSpeed(dto.durationMs() > 0 ? distance / dto.durationMs() : 0);
		return motion;
	}

}
