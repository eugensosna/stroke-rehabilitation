package ua.edu.zsea.sosna.stroke.model;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;


@Getter
@Setter
public class GameDTO {

    private Long id;

    @Size(max = 255)
    private String name;

    @GameStatisticUnique
    private Long statistic;

    private Long user;

}
