package ua.edu.zsea.sosna.stroke.model;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import ua.edu.zsea.sosna.stroke.util.WebUtils;

@Getter
@Setter
public class UserDTO {

	private Long id;

	@Size(max = 255)
	@UserNameUnique
	private String name;

	@Email(regexp = WebUtils.EMAIL_PATTERN)
	@UserEmailUnique
	private String email;

	private String password;

	@Size(max = 255)
	private String firstName;

	@Size(max = 255)
	private String lastName;

	@DateTimeFormat(pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
	private OffsetDateTime resetStart;

	@NotNull
	private String roles;

}
