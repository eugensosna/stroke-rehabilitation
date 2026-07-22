package ua.edu.zsea.sosna.stroke.rest;

import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ua.edu.zsea.sosna.stroke.model.GameStatsDTO;
import ua.edu.zsea.sosna.stroke.service.GameStatsService;


@RestController
@RequestMapping(value = "/api/gameStatss", produces = MediaType.APPLICATION_JSON_VALUE)
public class GameStatsResource {

    private final GameStatsService gameStatsService;

    public GameStatsResource(final GameStatsService gameStatsService) {
        this.gameStatsService = gameStatsService;
    }

    @GetMapping
    public ResponseEntity<List<GameStatsDTO>> getAllGameStatss() {
        return ResponseEntity.ok(gameStatsService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GameStatsDTO> getGameStats(@PathVariable(name = "id") final Long id) {
        return ResponseEntity.ok(gameStatsService.get(id));
    }

    @PostMapping
    @ApiResponse(responseCode = "201")
    public ResponseEntity<Long> createGameStats(
            @RequestBody @Valid final GameStatsDTO gameStatsDTO) {
        final Long createdId = gameStatsService.create(gameStatsDTO);
        return new ResponseEntity<>(createdId, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Long> updateGameStats(@PathVariable(name = "id") final Long id,
            @RequestBody @Valid final GameStatsDTO gameStatsDTO) {
        gameStatsService.update(id, gameStatsDTO);
        return ResponseEntity.ok(id);
    }

    @DeleteMapping("/{id}")
    @ApiResponse(responseCode = "204")
    public ResponseEntity<Void> deleteGameStats(@PathVariable(name = "id") final Long id) {
        gameStatsService.delete(id);
        return ResponseEntity.noContent().build();
    }

}
