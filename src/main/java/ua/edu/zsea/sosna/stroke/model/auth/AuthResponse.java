package ua.edu.zsea.sosna.stroke.model.auth;

import lombok.Builder;
import ua.edu.zsea.sosna.stroke.domain.User;
import ua.edu.zsea.sosna.stroke.util.CustomConstans;

@Builder
public record AuthResponse(String tokenType, String accessToken, String refreshToken, Long expiresIn) {

	public static AuthResponse of(String accessToken, String refreshToken, Long expiresIn) {
		return new AuthResponse(CustomConstans.BEARER_HEADER_AUTH_NAME, accessToken, refreshToken, expiresIn);

	}
}
