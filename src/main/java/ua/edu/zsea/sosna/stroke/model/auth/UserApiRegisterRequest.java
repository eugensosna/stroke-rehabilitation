package ua.edu.zsea.sosna.stroke.model.auth;

import jakarta.validation.constraints.NotNull;

public record UserApiRegisterRequest(@NotNull String fullname, @NotNull String email, String password) {

}
