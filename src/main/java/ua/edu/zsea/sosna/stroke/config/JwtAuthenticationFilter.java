package ua.edu.zsea.sosna.stroke.config;

import java.io.IOException;
import java.time.Instant;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.auth0.jwt.exceptions.JWTDecodeException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ua.edu.zsea.sosna.stroke.service.auth.jwtService;
import ua.edu.zsea.sosna.stroke.util.CustomConstans;

@Component
@Slf4j
@AllArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
	private final jwtService jwtService;
	private final UserDetailsService userDetailsService;

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {

		if (SecurityContextHolder.getContext().getAuthentication() != null) {
			filterChain.doFilter(request, response);
			return;
		}

		final String authHeader = request.getHeader("Authorization");

		if (authHeader == null || !authHeader.startsWith(CustomConstans.BEARER_HEADER_AUTH_NAME)) {
			filterChain.doFilter(request, response);
			return;
		}

		final String jwtToken = authHeader.substring(7);
		String username;

		try {
			var decJWT = jwtService.validateToken(jwtToken, response);
			if (decJWT == null) {
				log.error("Invalid to validate token {} for request {}", jwtToken, request.getContextPath());
				filterChain.doFilter(request, response);
				return;
			}
			username = decJWT.getSubject();

			// Check expiration early (before DB query)
			if (jwtService.isTokenExpired(decJWT)) {
				log.debug("Invalid or expired token for user: {} expiredAt: {} an now is: {}", username,
						decJWT.getExpiresAtAsInstant().toString(), Instant.now().toString());
				filterChain.doFilter(request, response);
				return;
			}

		} catch (JWTDecodeException e) {
			log.debug("JWT extraction failed: {}", e.getMessage());
			filterChain.doFilter(request, response);
			return;
		}

		if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

			// load form db
			UserDetails userDetails = userDetailsService.loadUserByUsername(username);

			UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(userDetails, null,
					userDetails.getAuthorities());
			authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
			SecurityContextHolder.getContext().setAuthentication(authToken);

		}

		filterChain.doFilter(request, response);

	}

}
