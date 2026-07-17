package ua.edu.zsea.sosna.stroke.rest;

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
import ua.edu.zsea.sosna.stroke.service.auth.jwtService;

@RestController
@RequestMapping(value = "/api/auth", produces = MediaType.APPLICATION_JSON_VALUE)
@Slf4j
//@AllArgsConstructor
public class AuthentificationResource {
	private jwtService jwtService;
	private UserService userService;
	
	
	
	
	public AuthentificationResource(ua.edu.zsea.sosna.stroke.service.auth.jwtService jwtService,
			UserService userService) {
		super();
		this.jwtService = jwtService;
		this.userService = userService;
	}

	@GetMapping
	public ResponseEntity<String> get(){
		return ResponseEntity.ok("ok");
	}
	
	@PostMapping("/test")
	public ResponseEntity<UserApiRegisterRequestDto> testPost (@RequestBody UserApiRegisterRequestDto user) {
		return ResponseEntity.ok(user);
		
	}

	@PostMapping("/login")
	@Transactional
	public ResponseEntity<AuthResponse> login(@RequestBody UserLoginRequest loginUser) {
		var result = userService.login(loginUser);
		ResponseCookie cookieTocken = ResponseCookie.from("user-token", result.accessToken()).httpOnly(true) // Protects
																												// against
																												// XSS
																												// attacks
				.secure(true) // Ensures cookie is only sent over HTTPS
				.path("/") // Available everywhere on the domain
				.maxAge(7 * 24 * 60 * 60) // Expires in 7 days (in seconds)
				.sameSite("Lax") // Protects against CSRF attacks
				.build();

		return ResponseEntity.ok().header(org.springframework.http.HttpHeaders.SET_COOKIE, cookieTocken.toString())
				.body(result);

	}

	@PostMapping("/register")
	@Transactional
	public ResponseEntity<AuthResponse> register(@RequestBody UserApiRegisterRequest newUser) {
		var result = userService.register(newUser);
		ResponseCookie cookieTocken = ResponseCookie.from("user-token", result.accessToken()).httpOnly(true) // Protects
																												// against
																												// XSS
																												// attacks
				.secure(true) // Ensures cookie is only sent over HTTPS
				.path("/") // Available everywhere on the domain
				.maxAge(7 * 24 * 60 * 60) // Expires in 7 days (in seconds)
				.sameSite("Lax") // Protects against CSRF attacks
				.build();

		return ResponseEntity.ok().header(org.springframework.http.HttpHeaders.SET_COOKIE, cookieTocken.toString())
				.body(result);

	}

}
