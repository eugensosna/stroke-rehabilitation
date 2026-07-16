package ua.edu.zsea.sosna.stroke.service.auth;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import ua.edu.zsea.sosna.stroke.domain.AccesTocken;
import ua.edu.zsea.sosna.stroke.domain.User;
import ua.edu.zsea.sosna.stroke.model.Roles;
import ua.edu.zsea.sosna.stroke.model.auth.AuthResponse;
import ua.edu.zsea.sosna.stroke.model.auth.UserRegisterRequest;
import ua.edu.zsea.sosna.stroke.repos.UserRepository;
import ua.edu.zsea.sosna.stroke.repos.AccesTockenRepository;
import ua.edu.zsea.sosna.stroke.util.CustomCollectors;

@Service
//@NoArgsConstructor
@AllArgsConstructor
public class UserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final AccesTockenRepository accesTockenRepository;
	private final jwtService jwtService;

	/*
	 * public UserService(final UserRepository userRepository) { this.userRepository
	 * = userRepository; }
	 */
	public Map<Long, Long> getUserValues() {
		return userRepository.findAll(Sort.by("id")).stream()
				.collect(CustomCollectors.toSortedMap(User::getId, User::getId));
	}

	public AuthResponse register(UserRegisterRequest user) {
		var newItem = new User();
		newItem.setEmail(user.email());
		newItem.setFullName(user.fullname());
		newItem.setPassword(passwordEncoder.encode(user.password()));
		newItem.setRole(Roles.valueOf(user.role()));
		var savedUser = userRepository.save(newItem);
		return buildAuthResponse(savedUser, user.email(), user.role(), true);

	}

	private AuthResponse buildAuthResponse(User user, String email, String role, boolean isNewUser) {
        // Create custom UserDetails for JWT generation
        org.springframework.security.core.userdetails.User userDetails = 
            new org.springframework.security.core.userdetails.User(
                email, 
                "", 
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority(role))
            );

        String accessToken = jwtService.generateAccessToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);
        Long expiresIn=jwtService.getAccessTokenExpiration();

        // Persist refresh token
        AccesTocken rt = AccesTocken.builder()
        		.user(user)
        		.tocken(accessToken)
        		.refreshTocken(refreshToken)
        		.dateCreated(OffsetDateTime.now())
        		.endTime(OffsetDateTime.now().plusDays(30)).build();
        		
        accesTockenRepository.save(rt);

//        AuthResponse.builder().accessToken(accessToken).
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(expiresIn / 1000) // seconds
                .user(User.builder()
                		.id(user.getId())
                		.email(user.getEmail())
                		.fullName(user.getFullName())
                		.role(user.getRole())
                		.build()
                        )
                .build();
    }

}
