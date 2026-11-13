package ua.edu.zsea.sosna.stroke.repos;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import ua.edu.zsea.sosna.stroke.domain.Calibration;

public interface CalibrationRepository extends JpaRepository<Calibration, Long> {

	Optional<Calibration> findFirstByUserIdOrderByCreatedAtDescIdDesc(Long userId);

}
