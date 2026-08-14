package ua.edu.zsea.sosna.stroke.service.auth;

import java.time.OffsetDateTime;
import java.util.Map;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import lombok.AllArgsConstructor;
import ua.edu.zsea.sosna.stroke.domain.AccessToken;
import ua.edu.zsea.sosna.stroke.domain.User;
import ua.edu.zsea.sosna.stroke.model.Roles;
import ua.edu.zsea.sosna.stroke.model.auth.AuthResponse;
import ua.edu.zsea.sosna.stroke.model.auth.UserApiRegisterRequest;
import ua.edu.zsea.sosna.stroke.model.auth.UserLoginRequest;
import ua.edu.zsea.sosna.stroke.model.auth.UserNewInitial;
import ua.edu.zsea.sosna.stroke.repos.accessTokenRepository;
import ua.edu.zsea.sosna.stroke.repos.UserRepository;
import ua.edu.zsea.sosna.stroke.util.CustomCollectors;
import ua.edu.zsea.sosna.stroke.util.NotFoundException;

@Service
// @NoArgsConstructor
@AllArgsConstructor
public class UserService {

	private final UserRepository userRepository;
	private final AuthenticationManager authenticationManager;
	private final PasswordEncoder passwordEncoder;
	private final accessTokenRepository accessTokenRepository;
	private final jwtService jwtService;
	private final UserDetailsService userDetailsService;

	/*
	 * public UserService(final UserRepository userRepository) { this.userRepository
	 * = userRepository; }
	 */
	public Map<Long, Long> getUserValues() {
		return userRepository.findAll(Sort.by(Sort.Order.asc("id"))).stream()
				.collect(CustomCollectors.toSortedMap(u -> u.getId(), u -> u.getId()));
	}

	@Transactional
	public AuthResponse login(UserLoginRequest loginUser) {

		var userDb = userRepository.findByEmail(loginUser.email())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

		try {
			authenticationManager
					.authenticate(new UsernamePasswordAuthenticationToken(loginUser.email(), loginUser.password()));
		} catch (final BadCredentialsException ex) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
		}
		var result = buildAuthResponse(userDb, userDb.getEmail(), userDb.getRole().name(), false);

		return result;
	}

	public AuthResponse register(UserNewInitial user) {

		var newItem = new User();
		newItem.setEmail(user.email());
		newItem.setFullName(user.fullname());
		newItem.setPassword(passwordEncoder.encode(user.password()));
		newItem.setRole(Roles.valueOf(user.role()));
		var savedUser = userRepository.save(newItem);
		return buildAuthResponse(savedUser, user.email(), user.role(), true);

	}

	public AuthResponse register(UserApiRegisterRequest user) {
		var newItem = UserNewInitial.builder().email(user.email()).fullname(user.fullname()).password(user.password())
				.role(Roles.USER.name()).build();
		return register(newItem);

	}

	public AuthResponse buildAuthResponse(User user, String email, String role, boolean isNewUser) {
		// Create custom UserDetails for JWT generation
		org.springframework.security.core.userdetails.User userDetails = new org.springframework.security.core.userdetails.User(
				email, "",
				java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority(role)));

		String accessToken = jwtService.generateAccessToken(userDetails);
		String refreshToken = jwtService.generateRefreshToken(userDetails);
		Long expiresIn = jwtService.getAccessTokenExpiration();

		// Persist refresh token
		AccessToken rt = AccessToken.builder().user(user).Token(accessToken).refreshToken(refreshToken)
				.dateCreated(OffsetDateTime.now()).endTime(OffsetDateTime.now().plusDays(30)).build();

		accessTokenRepository.save(rt);

		// AuthResponse.builder().accessToken(accessToken).
		return AuthResponse.builder().accessToken(accessToken).refreshToken(refreshToken).expiresIn(expiresIn / 1000) // seconds
				.build();
	}

	@Transactional
	public AuthResponse refreshToken(String refreshToken) {
		var token = accessTokenRepository.findByRefreshToken(refreshToken)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

		if (token.getEndTime().isBefore(OffsetDateTime.now())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expired");
		}

		var user = token.getUser();
		return buildAuthResponse(user, user.getEmail(), user.getRole().name(), false);
	}

}
