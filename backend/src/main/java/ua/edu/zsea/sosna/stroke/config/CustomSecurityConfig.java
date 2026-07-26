package ua.edu.zsea.sosna.stroke.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import lombok.extern.slf4j.Slf4j;

@Configuration
@EnableWebSecurity
@Slf4j
public class CustomSecurityConfig {
	@Value("${stroke.cors.allowed-origins}")
	String corsAllowesOrigins;

	@Bean
	public PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	@Bean
	public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
		return configuration.getAuthenticationManager();
	}

	@Bean
	public SecurityFilterChain securityFilterChain(final HttpSecurity http) {

		var result = http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.cors(cors -> cors.configurationSource(corsConfigurationSource())).authorizeHttpRequests(authz -> {
					// authz.anyRequest().authenticated();
					authz.requestMatchers(HttpMethod.OPTIONS, "/api/**").permitAll();

					authz.requestMatchers("/api/auth/**").permitAll();
					authz.requestMatchers("/api/**").authenticated();
					authz.anyRequest().permitAll();
				}).csrf(csrf -> csrf.disable()).build();
		return result;
		// return result;

	}

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		String corsToSet = "*";
		if (corsAllowesOrigins != null && !corsAllowesOrigins.isBlank()) {
			corsToSet = corsAllowesOrigins;
		}

		List<String> corsList = Arrays.stream(corsToSet.split(",")).map(String::trim).toList();
		if (corsList.size() == 0) {
			corsList.add(corsToSet);
		}

		log.info("set cors to {}", corsList.toString());
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(corsList);
		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
		configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", configuration);
		log.info("cors set for domain {}", corsToSet);
		return source;
	}

}
