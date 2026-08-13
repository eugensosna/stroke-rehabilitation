package ua.edu.zsea.sosna.stroke.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Serve Reacts index.html for all requests that are not relevant for the
 * backend.
 */
@Controller
public class ReactForwardController {

	@RequestMapping(value = { "/{path:[^\\.]*}", "/**/{path:[^\\.]*}" })
	public String redirect() {
		return "forward:/index.html";
	}

}
