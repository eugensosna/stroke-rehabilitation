package ua.edu.zsea.sosna.stroke.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.LocaleResolver;

import jakarta.servlet.http.HttpServletRequest;

@Component
public class WebUtils {

	public static final String EMAIL_PATTERN = "([a-zA-Z0-9][\\-\\.\\+_]?)*[a-zA-Z0-9]+@([a-zA-Z0-9][\\-\\.]?)*[a-zA-Z0-9]+\\.[a-zA-Z]+";
	public static final String MSG_SUCCESS = "MSG_SUCCESS";
	public static final String MSG_INFO = "MSG_INFO";
	public static final String MSG_ERROR = "MSG_ERROR";
	private static MessageSource messageSource;
	private static LocaleResolver localeResolver;

	public WebUtils(final MessageSource messageSource, final LocaleResolver localeResolver) {
		WebUtils.messageSource = messageSource;
		WebUtils.localeResolver = localeResolver;
	}

	public static HttpServletRequest getRequest() {
		return ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
	}

	public static String getMessage(final String code, final Object... args) {
		return messageSource.getMessage(code, args, code, localeResolver.resolveLocale(getRequest()));
	}

	private static String getStepUrl(final Page<?> page, final int targetPage) {
		String stepUrl = "?page=" + targetPage + "&size=" + page.getSize();
		if (getRequest().getParameter("sort") != null) {
			stepUrl += "&sort=" + getRequest().getParameter("sort");
		}
		if (getRequest().getParameter("filter") != null) {
			stepUrl += "&filter=" + getRequest().getParameter("filter");
		}
		return stepUrl;
	}

}
