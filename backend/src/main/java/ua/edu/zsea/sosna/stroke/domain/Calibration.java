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
 * Результат калібрування: діапазони x_r, x_g керуючих показників (JSON, одиниці моделі).
 * Кожне калібрування — новий запис історії; клієнт бере останнє.
 */
@Entity
@Table(name = "calibrations")
@Getter
@Setter
public class Calibration {

	@Id
	@Column(nullable = false, updatable = false)
	@SequenceGenerator(name = "primary_sequence", sequenceName = "primary_sequence", allocationSize = 1, initialValue = 10000)
	@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "primary_sequence")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Column(nullable = false, length = 16)
	private String kind;

	@Column(nullable = false, columnDefinition = "text")
	private String ranges;

}
