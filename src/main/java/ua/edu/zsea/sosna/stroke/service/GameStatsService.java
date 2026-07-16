package ua.edu.zsea.sosna.stroke.service;

import java.util.List;
import java.util.Map;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import ua.edu.zsea.sosna.stroke.domain.GameStats;
import ua.edu.zsea.sosna.stroke.events.BeforeDeleteGameStats;
import ua.edu.zsea.sosna.stroke.model.GameStatsDTO;
import ua.edu.zsea.sosna.stroke.repos.GameStatsRepository;
import ua.edu.zsea.sosna.stroke.util.CustomCollectors;
import ua.edu.zsea.sosna.stroke.util.NotFoundException;


@Service
public class GameStatsService {

    private final GameStatsRepository gameStatsRepository;
    private final ApplicationEventPublisher publisher;

    public GameStatsService(final GameStatsRepository gameStatsRepository,
            final ApplicationEventPublisher publisher) {
        this.gameStatsRepository = gameStatsRepository;
        this.publisher = publisher;
    }

    public List<GameStatsDTO> findAll() {
        final List<GameStats> gameStatses = gameStatsRepository.findAll(Sort.by("id"));
        return gameStatses.stream()
                .map(gameStats -> mapToDTO(gameStats, new GameStatsDTO()))
                .toList();
    }

    public GameStatsDTO get(final Long id) {
        return gameStatsRepository.findById(id)
                .map(gameStats -> mapToDTO(gameStats, new GameStatsDTO()))
                .orElseThrow(NotFoundException::new);
    }

    public Long create(final GameStatsDTO gameStatsDTO) {
        final GameStats gameStats = new GameStats();
        mapToEntity(gameStatsDTO, gameStats);
        return gameStatsRepository.save(gameStats).getId();
    }

    public void update(final Long id, final GameStatsDTO gameStatsDTO) {
        final GameStats gameStats = gameStatsRepository.findById(id)
                .orElseThrow(NotFoundException::new);
        mapToEntity(gameStatsDTO, gameStats);
        gameStatsRepository.save(gameStats);
    }

    public void delete(final Long id) {
        final GameStats gameStats = gameStatsRepository.findById(id)
                .orElseThrow(NotFoundException::new);
        publisher.publishEvent(new BeforeDeleteGameStats(id));
        gameStatsRepository.delete(gameStats);
    }

    private GameStatsDTO mapToDTO(final GameStats gameStats, final GameStatsDTO gameStatsDTO) {
        gameStatsDTO.setId(gameStats.getId());
        gameStatsDTO.setStart(gameStats.getStart());
        gameStatsDTO.setDuration(gameStats.getDuration());
        return gameStatsDTO;
    }

    private GameStats mapToEntity(final GameStatsDTO gameStatsDTO, final GameStats gameStats) {
        gameStats.setStart(gameStatsDTO.getStart());
        gameStats.setDuration(gameStatsDTO.getDuration());
        return gameStats;
    }

    public Map<Long, Long> getGameStatsValues() {
        return gameStatsRepository.findAll(Sort.by("id"))
                .stream()
                .collect(CustomCollectors.toSortedMap(GameStats::getId, GameStats::getId));
    }

}
