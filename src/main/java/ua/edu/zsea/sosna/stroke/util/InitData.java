package ua.edu.zsea.sosna.stroke.util;

import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import ua.edu.zsea.sosna.stroke.service.InstalationProperties;
import ua.edu.zsea.sosna.stroke.service.auth.UserService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ua.edu.zsea.sosna.stroke.domain.User;
import ua.edu.zsea.sosna.stroke.model.Roles;
import ua.edu.zsea.sosna.stroke.model.auth.UserNewInitial;
import ua.edu.zsea.sosna.stroke.repos.UserRepository;

@Service
@AllArgsConstructor
@Slf4j
public class InitData {
	private final UserService userService;
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final InstalationProperties instalationProperties;

	@PostConstruct
	public void onSetup() {
		log.debug("start databank initialisation");
		var usersConfig = instalationProperties.getUsers();
		if (usersConfig!=null) {
		if (usersConfig.size() == 0) {
			log.debug("users in config 0, skipping");
			return;
		}
		
		}else {
			return;
		}
		var usersInDb = userRepository.findAll();
		if (usersInDb.size()>0) {
			log.debug("users also exist in db, skipping ");
			return;
		}
		for (UserNewInitial userNewInitial : usersConfig) {
			setupUser(userNewInitial, false);
			
		}
	}

	private String validateOrGeneratePassword(String password, String partOfMassage) {
		StringBuilder builder = new StringBuilder(partOfMassage);
		String result = password;
		if (password == null || password.isBlank()) {
			result = UUID.randomUUID().toString();
			builder.append(" password is empty, set new password: ");
			builder.append(password);
			log.warn(builder.toString());
		}
		return result;
	}

	private void setupUser(UserNewInitial user, Boolean reWrite) {
		User newUser = new User();
		var optionalUserDb = userRepository.findByEmail(user.email());
		if (optionalUserDb.isPresent()) {
			if (reWrite != null && !reWrite) {
				log.warn("user:{} exist in db, reWrite rule:, skipping ", user.email(), reWrite);
				return;
			}
			newUser = optionalUserDb.get();

		}
		newUser.setEmail(user.email());
		newUser.setFullName(user.fullname());
		newUser.setRole(Roles.valueOf(user.role()));
		newUser.setPassword(passwordEncoder.encode(validateOrGeneratePassword(user.password(), "user:"+user.email())));
		
		userRepository.save(newUser);

	}

}
