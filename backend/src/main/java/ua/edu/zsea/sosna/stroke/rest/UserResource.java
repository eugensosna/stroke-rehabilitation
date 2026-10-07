package ua.edu.zsea.sosna.stroke.rest;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import ua.edu.zsea.sosna.stroke.model.Roles;
import ua.edu.zsea.sosna.stroke.model.UserDTO;
import ua.edu.zsea.sosna.stroke.model.UserProfileResponse;
import ua.edu.zsea.sosna.stroke.service.UserEntityService;

@RestController
@RequestMapping(value = "/api/users", produces = MediaType.APPLICATION_JSON_VALUE)

//@PreAuthorize()
@SecurityRequirement(name = "bearer-jwt")
public class UserResource {

	private final UserEntityService userService;

	public UserResource(final UserEntityService userService) {
		this.userService = userService;
	}

	@GetMapping
	@PreAuthorize("hasAuthority('ADMIN')")
	public ResponseEntity<List<UserDTO>> getAllUsers() {
		return ResponseEntity.ok(userService.findAll());
	}

	@GetMapping("/profile")
	public ResponseEntity<UserProfileResponse> getProfile(Authentication authentication) {
		UserProfileResponse result = null;
		String username = authentication.getName();
//		if (userService.nameExists(username)) {
			var user = userService.findByEmail(username);
			result = UserProfileResponse.from(user);
//		}
		return ResponseEntity.ok(result);
	}

	@GetMapping("/{id}")
	public ResponseEntity<UserDTO> getUser(@PathVariable(name = "id") final Long id) {
		return ResponseEntity.ok(userService.get(id));
	}

	@PostMapping
	@ApiResponse(responseCode = "201")
	public ResponseEntity<Long> createUser(@RequestBody @Valid final UserDTO userDTO) {
		final Long createdId = userService.create(userDTO);
		return new ResponseEntity<>(createdId, HttpStatus.CREATED);
	}

	@PutMapping("/{id}")
	public ResponseEntity<Long> updateUser(@PathVariable(name = "id") final Long id,
			@RequestBody @Valid final UserDTO userDTO) {
		userService.update(id, userDTO);
		return ResponseEntity.ok(id);
	}

	@DeleteMapping("/{id}")
	@ApiResponse(responseCode = "204")
	public ResponseEntity<Void> deleteUser(@PathVariable(name = "id") final Long id) {
		userService.delete(id);
		return ResponseEntity.noContent().build();
	}

}
