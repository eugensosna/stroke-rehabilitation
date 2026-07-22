package ua.edu.zsea.sosna.stroke.service.auth;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;

import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class JwtTokenServiceImpl implements jwtService {
	@Value("${jwt.secret}")
	private String secretKey;

	@Value("${jwt.access-token-expiration-second:-600}")
	private Long accessTokenExpirationSeconds;

	@Value("${jwt.refresh-token-expiration-second:-36000}")
	private Long refreshTokenExpirationSeconds;

	private final Algorithm algorithm;
	private final JWTVerifier verifier;

	public JwtTokenServiceImpl(@Value("${jwt.secret}") String secretKey) {
		super();
		this.secretKey = secretKey;
		this.algorithm = Algorithm.HMAC512(secretKey);
		this.verifier = JWT.require(algorithm).build();
	}

	// ── Generate Tokens ──
	@Override
	public String generateAccessToken(UserDetails userDetails) {
		Map<String, Object> claims = new HashMap<>();
		claims.put("role", userDetails.getAuthorities().iterator().next().getAuthority());
		return buildToken(claims, userDetails.getUsername(), accessTokenExpirationSeconds);
	}

	private String buildToken(Map<String, Object> claims, String subject, Long expiration) {
		var now = Instant.now();
		var builder = JWT.create().withSubject(subject).withIssuedAt(now).withExpiresAt(now.plusSeconds(expiration));
		// Dynamically attach all claims from the map
		if (claims != null) {
			claims.forEach((key, value) -> {
				if (value instanceof String[] strArray) {
					builder.withArrayClaim(key, strArray);
				} else if (value instanceof String str) {
					builder.withClaim(key, str);
				} else {
					// If it's another object type, java-jwt handles Object mapping
					builder.withClaim(key, value.toString());
				}
			});
		}
		String token = builder.sign(this.algorithm);
		return token;
	}

	@Override
	public String generateRefreshToken(UserDetails user) {
		Map<String, Object> claims = new HashMap<>();
		claims.put("type", "refresh");
		return buildToken(claims, user.getUsername(), refreshTokenExpirationSeconds);
	}

	@Override
	public Long getAccessTokenExpiration() {
		var now = Instant.now();
		return now.plusSeconds(this.accessTokenExpirationSeconds).toEpochMilli();
	}

	@Override
	public DecodedJWT validateToken(final String token, final HttpServletResponse response) {
		try {
			return verifier.verify(token);
		} catch (final JWTVerificationException verificationEx) {

			log.warn("token invalid: {}", verificationEx.getMessage());
			return null;
		}
	}

	@Override
	public boolean isTokenExpired(DecodedJWT decodedToken) {
		boolean result = false;
		var expiresAt = decodedToken.getExpiresAtAsInstant();
		if (expiresAt != null) {
			result = expiresAt.isBefore(Instant.now());
		}

		return result;
	}

}
