package ua.edu.zsea.sosna.stroke.rest;

import org.springframework.boot.actuate.web.exchanges.HttpExchange.Principal;
import org.springframework.boot.health.actuate.*;
import org.springframework.boot.health.actuate.endpoint.HealthDescriptor;
import org.springframework.boot.health.actuate.endpoint.HealthEndpoint;
import org.springframework.boot.health.contributor.Status;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ua.edu.zsea.sosna.stroke.model.auth.AuthResponse;
import ua.edu.zsea.sosna.stroke.model.auth.UserApiRegisterRequest;
import ua.edu.zsea.sosna.stroke.model.auth.UserApiRegisterRequestDto;
import ua.edu.zsea.sosna.stroke.model.auth.UserLoginRequest;
import ua.edu.zsea.sosna.stroke.service.auth.UserService;

// @CrossOrigin(origins = "*")
@RestController
@RequestMapping(value = "/api/auth", produces = MediaType.APPLICATION_JSON_VALUE)
@Slf4j
@AllArgsConstructor
public class AuthentificationResource {
	private UserService userService;
	private final HealthEndpoint healthEndpoint;

	@GetMapping
	public ResponseEntity<String> get() {
		return ResponseEntity.ok("ok");
	}

	@GetMapping("/ping")
	public  ResponseEntity<HealthDescriptor> ping() {
		// Delegates directly to Actuator's health component check
		var responce = healthEndpoint.healthForPath("ping");
		if (responce.getStatus() != Status.UP) {
//			return ResponseEntity. (responce);
		}
		
		return  ResponseEntity.ok(responce);
	}

	@GetMapping("/test")
	public ResponseEntity<String> testGet() {
		return ResponseEntity.ok("ok");

	}

	@GetMapping("/username-principal")
	public String getCurrentPrincipal(Principal principal) {
		return "Current user: " + principal.getName();
	}

	@PostMapping("/test")
	public ResponseEntity<UserApiRegisterRequestDto> testPost(@RequestBody UserApiRegisterRequestDto user) {
		return ResponseEntity.ok(user);

	}

	@PostMapping("/login")
	@Transactional
	public ResponseEntity<AuthResponse> login(@RequestBody UserLoginRequest loginUser) {
		log.info("start login for user: {}", loginUser.email());
		var result = userService.login(loginUser);
		// ResponseCookie cookieToken = ResponseCookie.from("user-token",
		// result.accessToken()).httpOnly(true) // Protects
		// // against
		// // XSS
		// // attacks
		// .secure(true) // Ensures cookie is only sent over HTTPS
		// .path("/") // Available everywhere on the domain
		// .maxAge(7 * 24 * 60 * 60) // Expires in 7 days (in seconds)
		// .sameSite("Lax") // Protects against CSRF attacks
		// .build();
		log.info("login is successful");
		// return
		// ResponseEntity.ok().header(org.springframework.http.HttpHeaders.SET_COOKIE,
		// cookieToken.toString())
		// .body(result);
		return ResponseEntity.ok().body(result);

	}

	@PostMapping("/refreshToken")
	@Transactional
	public ResponseEntity<AuthResponse> refreshToken(@RequestBody String refreshToken) {
		var result = userService.refreshToken(refreshToken);
		return ResponseEntity.ok().body(result);
	}

	@PostMapping("/register")
	@Transactional
	public ResponseEntity<AuthResponse> register(@RequestBody UserApiRegisterRequest newUser) {
		var result = userService.register(newUser);
		ResponseCookie cookieToken = ResponseCookie.from("user-token", result.accessToken()).httpOnly(true) // Protects
																											// against
																											// XSS
																											// attacks
				.secure(true) // Ensures cookie is only sent over HTTPS
				.path("/") // Available everywhere on the domain
				.maxAge(7 * 24 * 60 * 60) // Expires in 7 days (in seconds)
				.sameSite("Lax") // Protects against CSRF attacks
				.build();

		return ResponseEntity.ok().header(org.springframework.http.HttpHeaders.SET_COOKIE, cookieToken.toString())
				.body(result);

	}

}
