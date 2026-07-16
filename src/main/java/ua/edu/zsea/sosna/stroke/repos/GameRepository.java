package ua.edu.zsea.sosna.stroke.repos;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.edu.zsea.sosna.stroke.domain.Game;


public interface GameRepository extends JpaRepository<Game, Long> {

    Game findFirstByStatisticId(Long id);

    boolean existsByStatisticId(Long id);

}
