package ua.edu.zsea.sosna.stroke.model.auth;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record UserRegisterRequest(@NotNull String fullname, @NotNull String email, String password, String role) {

}
