package ua.edu.zsea.sosna.stroke.service;

import java.util.List;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import ua.edu.zsea.sosna.stroke.domain.Game;
import ua.edu.zsea.sosna.stroke.domain.GameStats;
import ua.edu.zsea.sosna.stroke.domain.User;
import ua.edu.zsea.sosna.stroke.events.BeforeDeleteGameStats;
import ua.edu.zsea.sosna.stroke.model.GameDTO;
import ua.edu.zsea.sosna.stroke.repos.GameRepository;
import ua.edu.zsea.sosna.stroke.repos.GameStatsRepository;
import ua.edu.zsea.sosna.stroke.repos.UserRepository;
import ua.edu.zsea.sosna.stroke.util.NotFoundException;
import ua.edu.zsea.sosna.stroke.util.ReferencedException;


@Service
public class GameService {

    private final GameRepository gameRepository;
    private final GameStatsRepository gameStatsRepository;
    private final UserRepository userRepository;

    public GameService(final GameRepository gameRepository,
            final GameStatsRepository gameStatsRepository, final UserRepository userRepository) {
        this.gameRepository = gameRepository;
        this.gameStatsRepository = gameStatsRepository;
        this.userRepository = userRepository;
    }

    public List<GameDTO> findAll() {
        final List<Game> games = gameRepository.findAll(Sort.by(Game::getId));
        return games.stream()
                .map(game -> mapToDTO(game, new GameDTO()))
                .toList();
    }

    public GameDTO get(final Long id) {
        return gameRepository.findById(id)
                .map(game -> mapToDTO(game, new GameDTO()))
                .orElseThrow(NotFoundException::new);
    }

    public Long create(final GameDTO gameDTO) {
        final Game game = new Game();
        mapToEntity(gameDTO, game);
        return gameRepository.save(game).getId();
    }

    public void update(final Long id, final GameDTO gameDTO) {
        final Game game = gameRepository.findById(id)
                .orElseThrow(NotFoundException::new);
        mapToEntity(gameDTO, game);
        gameRepository.save(game);
    }

    public void delete(final Long id) {
        final Game game = gameRepository.findById(id)
                .orElseThrow(NotFoundException::new);
        gameRepository.delete(game);
    }

    private GameDTO mapToDTO(final Game game, final GameDTO gameDTO) {
        gameDTO.setId(game.getId());
        gameDTO.setName(game.getName());
        gameDTO.setStatistic(game.getStatistic() == null ? null : game.getStatistic().getId());
        gameDTO.setUser(game.getUser() == null ? null : game.getUser().getId());
        return gameDTO;
    }

    private Game mapToEntity(final GameDTO gameDTO, final Game game) {
        game.setName(gameDTO.getName());
        final GameStats statistic = gameDTO.getStatistic() == null ? null : gameStatsRepository.findById(gameDTO.getStatistic())
                .orElseThrow(() -> new NotFoundException("statistic not found"));
        game.setStatistic(statistic);
        final User user = gameDTO.getUser() == null ? null : userRepository.findById(gameDTO.getUser())
                .orElseThrow(() -> new NotFoundException("user not found"));
        game.setUser(user);
        return game;
    }

    public boolean statisticExists(final Long id) {
        return gameRepository.existsByStatisticId(id);
    }

    @EventListener(BeforeDeleteGameStats.class)
    public void on(final BeforeDeleteGameStats event) {
        final ReferencedException referencedException = new ReferencedException();
        final Game statisticGame = gameRepository.findFirstByStatisticId(event.getId());
        if (statisticGame != null) {
            referencedException.setKey("gameStats.game.statistic.referenced");
            referencedException.addParam(statisticGame.getId());
            throw referencedException;
        }
    }

}
