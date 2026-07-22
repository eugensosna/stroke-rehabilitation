package ua.edu.zsea.sosna.stroke.rest;

import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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
import ua.edu.zsea.sosna.stroke.model.GameDTO;
import ua.edu.zsea.sosna.stroke.service.GameService;
import ua.edu.zsea.sosna.stroke.service.GameStatsService;
import ua.edu.zsea.sosna.stroke.service.auth.UserService;

@RestController
@RequestMapping(value = "/api/games", produces = MediaType.APPLICATION_JSON_VALUE)
public class GameResource {

	private final GameService gameService;
	private final GameStatsService gameStatsService;
	private final UserService userService;

	public GameResource(final GameService gameService, final GameStatsService gameStatsService,
			final UserService userService) {
		this.gameService = gameService;
		this.gameStatsService = gameStatsService;
		this.userService = userService;
	}

	@GetMapping
	public ResponseEntity<List<GameDTO>> getAllGames() {
		return ResponseEntity.ok(gameService.findAll());
	}

	@GetMapping("/test")
	public ResponseEntity<String> test() {
		return ResponseEntity.ok("ok");
	}

	@GetMapping("/{id}")
	public ResponseEntity<GameDTO> getGame(@PathVariable(name = "id") final Long id) {
		return ResponseEntity.ok(gameService.get(id));
	}

	@PostMapping
	@ApiResponse(responseCode = "201")
	public ResponseEntity<Long> createGame(@RequestBody @Valid final GameDTO gameDTO) {
		final Long createdId = gameService.create(gameDTO);
		return new ResponseEntity<>(createdId, HttpStatus.CREATED);
	}

	@PutMapping("/{id}")
	public ResponseEntity<Long> updateGame(@PathVariable(name = "id") final Long id,
			@RequestBody @Valid final GameDTO gameDTO) {
		gameService.update(id, gameDTO);
		return ResponseEntity.ok(id);
	}

	@DeleteMapping("/{id}")
	@ApiResponse(responseCode = "204")
	public ResponseEntity<Void> deleteGame(@PathVariable(name = "id") final Long id) {
		gameService.delete(id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/statisticValues")
	public ResponseEntity<Map<Long, Long>> getStatisticValues() {
		return ResponseEntity.ok(gameStatsService.getGameStatsValues());
	}

	@GetMapping("/userValues")
	public ResponseEntity<Map<Long, Long>> getUserValues() {
		return ResponseEntity.ok(userService.getUserValues());
	}

}
