package ua.edu.zsea.sosna.stroke.model.auth;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(@NotBlank String refreshToken) {

}
