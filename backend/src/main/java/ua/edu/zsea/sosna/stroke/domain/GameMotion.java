package ua.edu.zsea.sosna.stroke.domain;

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
 * Один завершений рух зап'ястка в межах ігрової сесії. Координати нормалізовані (0..1).
 */
@Entity
@Table(name = "GameMotions")
@Getter
@Setter
public class GameMotion {

    @Id
    @Column(nullable = false, updatable = false)
    @SequenceGenerator(
            name = "primary_sequence",
            sequenceName = "primary_sequence",
            allocationSize = 1,
            initialValue = 10000
    )
    @GeneratedValue(
            strategy = GenerationType.SEQUENCE,
            generator = "primary_sequence"
    )
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_stats_id", nullable = false)
    private GameStats gameStats;

    // зсув початку руху від старту сесії, мс
    @Column(nullable = false)
    private Long startOffsetMs;

    @Column(nullable = false)
    private Double durationMs;

    @Column(nullable = false)
    private Double startX;

    @Column(nullable = false)
    private Double startY;

    @Column(nullable = false)
    private Double endX;

    @Column(nullable = false)
    private Double endY;

    @Column(nullable = false)
    private Double distance;

    @Column(nullable = false)
    private Double speed;

}
