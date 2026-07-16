package ua.edu.zsea.sosna.stroke.model.auth;

import jakarta.validation.constraints.NotNull;

public record UserRegisterRequest(@NotNull String fullname, @NotNull String email, String password, String role) {

}
