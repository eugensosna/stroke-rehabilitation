package ua.edu.zsea.sosna.stroke.rest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import ua.edu.zsea.sosna.stroke.service.auth.jwtService;

@RestController
//@RequestMapping()
public class TestResource {
	private final jwtService jwtService;

	public TestResource(ua.edu.zsea.sosna.stroke.service.auth.jwtService jwtService) {
		super();
		this.jwtService = jwtService;
	}
	
	@GetMapping("/test/test")
	public ResponseEntity<String> test(){
		return ResponseEntity.ok("ok");
	}
	

}
