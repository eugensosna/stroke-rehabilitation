package ua.edu.zsea.sosna.stroke.repos;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.edu.zsea.sosna.stroke.domain.User;


public interface UserRepository extends JpaRepository<User, Long> {
	
    Optional<User> findByEmail(String email);

	
}
