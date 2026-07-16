package ua.edu.zsea.sosna.stroke.model;

import static java.lang.annotation.ElementType.ANNOTATION_TYPE;
import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.METHOD;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.Map;
import org.springframework.web.servlet.HandlerMapping;
import ua.edu.zsea.sosna.stroke.service.GameService;


/**
 * Validate that the statistic value isn't taken yet.
 */
@Target({ FIELD, METHOD, ANNOTATION_TYPE })
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Constraint(
        validatedBy = GameStatisticUnique.GameStatisticUniqueValidator.class
)
public @interface GameStatisticUnique {

    String message() default "{Exists.game.statistic}";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class GameStatisticUniqueValidator implements ConstraintValidator<GameStatisticUnique, Long> {

        private final GameService gameService;
        private final HttpServletRequest request;

        public GameStatisticUniqueValidator(final GameService gameService,
                final HttpServletRequest request) {
            this.gameService = gameService;
            this.request = request;
        }

        @Override
        public boolean isValid(final Long value, final ConstraintValidatorContext cvContext) {
            if (value == null) {
                // no value present
                return true;
            }
            @SuppressWarnings("unchecked") final Map<String, String> pathVariables =
                    ((Map<String, String>)request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE));
            final String currentId = pathVariables.get("id");
            if (currentId != null && value.equals(gameService.get(Long.parseLong(currentId)).getStatistic())) {
                // value hasn't changed
                return true;
            }
            return !gameService.statisticExists(value);
        }

    }

}
