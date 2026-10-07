package ua.edu.zsea.sosna.stroke.repos;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.edu.zsea.sosna.stroke.domain.GameStats;


public interface GameStatsRepository extends JpaRepository<GameStats, Long> {

    List<GameStats> findAllByUserIdOrderByStartDesc(Long userId);

}
