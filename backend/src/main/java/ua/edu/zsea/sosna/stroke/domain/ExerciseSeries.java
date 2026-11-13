package ua.edu.zsea.sosna.stroke.domain;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Звіт серії ігрової вправи (табл. 2.2 роботи). Повний звіт — JSON у {@link #report}
 * (лише числові показники), ключові поля винесено в стовпці для вибірок кабінету фахівця.
 */
@Entity
@Table(name = "exercise_series")
@Getter
@Setter
public class ExerciseSeries {

	@Id
	@Column(nullable = false, updatable = false)
	@SequenceGenerator(name = "primary_sequence", sequenceName = "primary_sequence", allocationSize = 1, initialValue = 10000)
	@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "primary_sequence")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(name = "exercise_id", nullable = false, length = 32)
	private String exerciseId;

	@Column(name = "started_at", nullable = false)
	private OffsetDateTime startedAt;

	@Column(name = "saved_at", nullable = false)
	private OffsetDateTime savedAt;

	@Column(nullable = false)
	private Integer attempts;

	@Column(nullable = false)
	private Integer successes;

	@Column(name = "start_level", nullable = false)
	private Integer startLevel;

	@Column(name = "end_level", nullable = false)
	private Integer endLevel;

	@Column(nullable = false, columnDefinition = "text")
	private String report;

}
