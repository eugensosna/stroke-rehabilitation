package ua.edu.zsea.sosna.stroke.repos;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import ua.edu.zsea.sosna.stroke.domain.AccessToken;

public interface accessTokenRepository extends JpaRepository<AccessToken, Long> {

	Optional<AccessToken> findByRefreshToken(String refreshToken);
}
