package ua.edu.zsea.sosna.stroke.model.auth;

import jakarta.validation.constraints.NotNull;

public record UserLoginRequest(@NotNull String email, String password, String refreshTocken) {

}
