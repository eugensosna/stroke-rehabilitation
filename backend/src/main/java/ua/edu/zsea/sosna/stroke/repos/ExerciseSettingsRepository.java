package ua.edu.zsea.sosna.stroke.repos;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import ua.edu.zsea.sosna.stroke.domain.ExerciseSettings;

public interface ExerciseSettingsRepository extends JpaRepository<ExerciseSettings, Long> {

	Optional<ExerciseSettings> findByUserId(Long userId);

}
