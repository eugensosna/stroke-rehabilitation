package ua.edu.zsea.sosna.stroke.service.auth;

import org.springframework.security.core.userdetails.UserDetails;

public interface jwtService {
	public String generateAccessToken(UserDetails user);
	public String generateRefreshToken(UserDetails user);
	public Long getAccessTokenExpiration();

}
