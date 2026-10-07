package ua.edu.zsea.sosna.stroke.model.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserApiRegisterRequest(@NotBlank @Size(max = 255) String fullname,
		@NotBlank @Email @Size(max = 255) String email, @NotBlank @Size(min = 6, max = 128) String password) {

}
