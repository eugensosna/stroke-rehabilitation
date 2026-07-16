package ua.edu.zsea.sosna.stroke.model.auth;


import lombok.Builder;
import ua.edu.zsea.sosna.stroke.domain.User;
@Builder
public record AuthResponse( String tokenType,     String accessToken,
     String refreshToken,
     Long expiresIn,
     User user) {
	
public static AuthResponse of (String accessToken, String refreshToken, Long expiresIn, User user) {
	return new AuthResponse("Bearer", accessToken, refreshToken, expiresIn, user);
	
}
}

