package ua.edu.zsea.sosna.stroke.domain;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Налаштування вправ пацієнта, які задає фахівець з реабілітації (задача 5), — JSON
 * у форматі ExerciseSettings клієнта. Поки фахівець їх не задав, запису немає.
 */
@Entity
@Table(name = "exercise_settings")
@Getter
@Setter
public class ExerciseSettings {

	@Id
	@Column(nullable = false, updatable = false)
	@SequenceGenerator(name = "primary_sequence", sequenceName = "primary_sequence", allocationSize = 1, initialValue = 10000)
	@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "primary_sequence")
	private Long id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false, unique = true)
	private User user;

	@Column(nullable = false, columnDefinition = "text")
	private String settings;

	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

}
