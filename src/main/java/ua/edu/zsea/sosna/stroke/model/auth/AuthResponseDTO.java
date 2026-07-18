package ua.edu.zsea.sosna.stroke.model.auth;


import com.fasterxml.jackson.annotation.JsonIgnoreType;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import ua.edu.zsea.sosna.stroke.config.JwtAuthenticationFilter;
import ua.edu.zsea.sosna.stroke.domain.User;
@Setter
@Getter
public class AuthResponseDTO {
	String tokenType;
	String accessToken;
    String refreshToken;
    Long expiresIn;
    User user;
	
}


