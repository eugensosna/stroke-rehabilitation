package ua.edu.zsea.sosna.stroke.repos;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.edu.zsea.sosna.stroke.domain.GameStats;


public interface GameStatsRepository extends JpaRepository<GameStats, Long> {
}
