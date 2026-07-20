package ua.edu.zsea.sosna.stroke.model.auth;

import lombok.Getter;
import lombok.Setter;


@Setter
@Getter
//@NoArgsConstructor
public class UserApiRegisterRequestDto {
	String email;
	String password;
	String fullName;
	
	
	
}