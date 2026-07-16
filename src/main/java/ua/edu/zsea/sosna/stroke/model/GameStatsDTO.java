package ua.edu.zsea.sosna.stroke.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;


@Getter
@Setter
public class GameStatsDTO {

    private Long id;

    private OffsetDateTime start;

    @Digits(integer = 12, fraction = 3)
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    @Schema(type = "string", example = "92.008")
    private BigDecimal duration;

}
