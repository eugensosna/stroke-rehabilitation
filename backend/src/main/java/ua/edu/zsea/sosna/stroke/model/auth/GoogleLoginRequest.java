package ua.edu.zsea.sosna.stroke.model.auth;

import jakarta.validation.constraints.NotBlank;

/** ID token (credential), отриманий фронтендом від Google Identity Services */
public record GoogleLoginRequest(@NotBlank String credential) {

}
