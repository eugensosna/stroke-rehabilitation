package ua.edu.zsea.sosna.stroke.service.auth;

import org.springframework.security.core.userdetails.UserDetails;

import com.auth0.jwt.interfaces.DecodedJWT;

import jakarta.servlet.http.HttpServletResponse;

public interface jwtService {
	public String generateAccessToken(UserDetails user);
	public String generateRefreshToken(UserDetails user);
	public Long getAccessTokenExpiration();
	public DecodedJWT validateToken(final String token, final HttpServletResponse response);
	public boolean isTokenExpired(DecodedJWT decodedToken);

}
