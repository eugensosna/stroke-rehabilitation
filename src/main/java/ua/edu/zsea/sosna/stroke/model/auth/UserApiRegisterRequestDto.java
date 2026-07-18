package ua.edu.zsea.sosna.stroke.model.auth;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Setter
@Getter
//@NoArgsConstructor
public class UserApiRegisterRequestDto {
	String email;
	String password;
	String fullName;
	
	
	
}