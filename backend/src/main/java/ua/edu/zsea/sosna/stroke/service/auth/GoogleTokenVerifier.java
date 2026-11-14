package ua.edu.zsea.sosna.stroke.service.auth;

import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import lombok.extern.slf4j.Slf4j;

/**
 * Перевіряє Google ID token: підпис (ключі Google JWKS), термін дії, issuer і
 * audience (наш client id).
 */
@Slf4j
@Component
public class GoogleTokenVerifier {
	private static final String JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";
	private static final Set<String> ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

	private final String clientId;
	private final JwtDecoder decoder;

	public GoogleTokenVerifier(@Value("${stroke.auth.google.client-id:}") String clientId) {
		this.clientId = clientId;
		NimbusJwtDecoder nimbus = NimbusJwtDecoder.withJwkSetUri(JWK_SET_URI).build();
		nimbus.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(), jwt -> {
			String iss = jwt.getClaimAsString("iss");
			List<String> aud = jwt.getAudience();
			if (iss == null || !ISSUERS.contains(iss)) {
				return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "bad issuer", null));
			}
			if (aud == null || !aud.contains(this.clientId)) {
				return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "bad audience", null));
			}
			return OAuth2TokenValidatorResult.success();
		}));
		this.decoder = nimbus;
	}

	public record GoogleUser(String email, String fullName) {
	}

	public GoogleUser verify(String idToken) {
		if (clientId == null || clientId.isBlank()) {
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Google sign-in is not configured");
		}
		Jwt jwt;
		try {
			jwt = decoder.decode(idToken);
		} catch (JwtException ex) {
			log.warn("google id token rejected: {}", ex.getMessage());
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid Google token");
		}
		String email = jwt.getClaimAsString("email");
		Object verified = jwt.getClaim("email_verified");
		if (email == null || !(Boolean.TRUE.equals(verified) || "true".equals(String.valueOf(verified)))) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google email is not verified");
		}
		String name = jwt.getClaimAsString("name");
		return new GoogleUser(email, name == null || name.isBlank() ? email : name);
	}
}
