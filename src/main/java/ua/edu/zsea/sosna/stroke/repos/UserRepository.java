package ua.edu.zsea.sosna.stroke.repos;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.edu.zsea.sosna.stroke.domain.User;


public interface UserRepository extends JpaRepository<User, Long> {
}
