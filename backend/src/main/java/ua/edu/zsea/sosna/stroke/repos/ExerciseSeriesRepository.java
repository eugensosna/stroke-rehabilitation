package ua.edu.zsea.sosna.stroke.repos;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import ua.edu.zsea.sosna.stroke.domain.ExerciseSeries;

public interface ExerciseSeriesRepository extends JpaRepository<ExerciseSeries, Long> {

	List<ExerciseSeries> findByUserIdOrderByStartedAtDesc(Long userId, Pageable pageable);

	List<ExerciseSeries> findByUserIdAndStartedAtGreaterThanEqualOrderByStartedAtDesc(Long userId,
			OffsetDateTime from, Pageable pageable);

}
