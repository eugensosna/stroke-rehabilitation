package ua.edu.zsea.sosna.stroke.model;

import static java.lang.annotation.ElementType.ANNOTATION_TYPE;
import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.METHOD;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.Map;

import org.springframework.web.servlet.HandlerMapping;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import ua.edu.zsea.sosna.stroke.service.UserEntityService;


/**
 * Validate that the name value isn't taken yet.
 */
@Target({ FIELD, METHOD, ANNOTATION_TYPE })
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Constraint(
        validatedBy = UserNameUnique.UserNameUniqueValidator.class
)
public @interface UserNameUnique {

    String message() default "{Exists.user.name}";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class UserNameUniqueValidator implements ConstraintValidator<UserNameUnique, String> {

        private final UserEntityService userService;
        private final HttpServletRequest request;

        public UserNameUniqueValidator(final UserEntityService userService,
                final HttpServletRequest request) {
            this.userService = userService;
            this.request = request;
        }

        @Override
        public boolean isValid(final String value, final ConstraintValidatorContext cvContext) {
            if (value == null) {
                // no value present
                return true;
            }
            @SuppressWarnings("unchecked") final Map<String, String> pathVariables =
                    ((Map<String, String>)request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE));
            final String currentId = pathVariables.get("id");
            if (currentId != null && value.equalsIgnoreCase(userService.get(Long.parseLong(currentId)).getName())) {
                // value hasn't changed
                return true;
            }
            return !userService.nameExists(value);
        }

    }

}
