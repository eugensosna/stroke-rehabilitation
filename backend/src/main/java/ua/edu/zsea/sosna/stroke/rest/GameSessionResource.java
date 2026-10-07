package ua.edu.zsea.sosna.stroke.rest;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import ua.edu.zsea.sosna.stroke.model.GameSessionRequest;
import ua.edu.zsea.sosna.stroke.model.GameSessionResponse;
import ua.edu.zsea.sosna.stroke.service.GameSessionService;

/**
 * Ігрові сесії поточного користувача (визначається з JWT).
 */
@RestController
@RequestMapping(value = "/api/game-sessions", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = "bearer-jwt")
public class GameSessionResource {

	private final GameSessionService gameSessionService;

	public GameSessionResource(final GameSessionService gameSessionService) {
		this.gameSessionService = gameSessionService;
	}

	@PostMapping
	@ApiResponse(responseCode = "201")
	public ResponseEntity<GameSessionResponse> saveSession(final Authentication authentication,
			@RequestBody @Valid final GameSessionRequest request) {
		return new ResponseEntity<>(gameSessionService.save(authentication.getName(), request), HttpStatus.CREATED);
	}

	@GetMapping("/my")
	public ResponseEntity<List<GameSessionResponse>> getMySessions(final Authentication authentication) {
		return ResponseEntity.ok(gameSessionService.findForUser(authentication.getName()));
	}

}
