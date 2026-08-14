package ua.edu.zsea.sosna.stroke.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.AllArgsConstructor;
import ua.edu.zsea.sosna.stroke.domain.User;
import ua.edu.zsea.sosna.stroke.model.Roles;
import ua.edu.zsea.sosna.stroke.model.UserDTO;
import ua.edu.zsea.sosna.stroke.repos.UserRepository;
import ua.edu.zsea.sosna.stroke.util.CustomCollectors;
import ua.edu.zsea.sosna.stroke.util.NotFoundException;

@Service
@Transactional(rollbackFor = Exception.class)
@AllArgsConstructor
public class UserServiceImpl implements UserEntityService {

	private final UserRepository userRepository;

	private final ApplicationEventPublisher publisher;
	private final PasswordEncoder passwordEncoder;

	@Override
	public List<UserDTO> findAll() {
		final List<User> users = userRepository.findAll(Sort.by("id"));
		return users.stream().map(user -> mapToDTO(user, new UserDTO())).toList();
	}

	@Override
	public UserDTO get(final Long id) {
		return userRepository.findById(id).map(user -> mapToDTO(user, new UserDTO()))
				.orElseThrow(NotFoundException::new);
	}

	@Override
	public Long create(final UserDTO userDTO) {
		final User user = new User();
		mapToEntity(userDTO, user);
		return userRepository.save(user).getId();
	}

	@Override
	public void update(final Long id, final UserDTO userDTO) {
		final User user = userRepository.findById(id).orElseThrow(NotFoundException::new);
		mapToEntity(userDTO, user);
		userRepository.save(user);
	}
	
	

	@Override
	public void delete(final Long id) {
		final User user = userRepository.findById(id).orElseThrow(NotFoundException::new);
//        publisher.publishEvent(new BeforeDeleteUser(id));
		userRepository.delete(user);
	}

	private UserDTO mapToDTO(final User user, final UserDTO userDTO) {
		userDTO.setId(user.getId());
//        userDTO.setUuid(user.getUuid());
		userDTO.setName(user.getName());
		userDTO.setEmail(user.getEmail());
//        userDTO.setFirstName(user.getFirstName());
//        userDTO.setLastName(user.getLastName());
//        userDTO.setResetToken(user.getResetToken());
		userDTO.setResetStart(user.getResetStart());
//        userDTO.setTags(user.getTags().stream()
//                .map(tag -> tag.getId())
//                .toList());
		userDTO.setRoles(user.getRole() == null ? null : user.getRole().toString());
		return userDTO;
	}

	private User mapToEntity(final UserDTO userDTO, final User user) {
		user.setName(userDTO.getName());
		user.setEmail(userDTO.getEmail());
		user.setPassword(userDTO.getPassword() == null ? null : passwordEncoder.encode(userDTO.getPassword()));
//        user.setFirstName(userDTO.getFirstName());
//        user.setLastName(userDTO.getLastName());
//        user.setResetToken(userDTO.getResetToken());
		user.setResetStart(userDTO.getResetStart());

		Roles roleEnum = userDTO.getRoles() == null ? Roles.valueOf(userDTO.getRoles()) : Roles.USER;
		user.setRole(roleEnum);
		return user;
	}

	
	@Override
	public boolean nameExists(final String name) {
		return userRepository.existsByNameIgnoreCase(name);
	}

	@Override
	public boolean emailExists(final String email) {
		return userRepository.existsByEmail(email);
	}

	@Override
	public Map<Long, Long> getUserValues() {
		return userRepository.findAll(Sort.by("id")).stream()
				.collect(CustomCollectors.toSortedMap(User::getId, User::getId));
	}
	
@Override
	public User get(long userId) {
		// TODO Auto-generated method stub
		return userRepository.findById(userId)
				.orElseThrow(() -> new NotFoundException(String.format("entity User not found for id:'%s'", userId)));
	}

@Override
public User findByEmail(String email) {
	// TODO Auto-generated method stub
	return userRepository.findByEmail(email).orElseThrow(()-> new NotFoundException(String.format("user entity by email '%s' not found in db", email)));
}

@Override
public User findByName(String name) {
	// TODO Auto-generated method stub
	return userRepository.findByName(name).orElseThrow(()-> new NotFoundException(String.format("user entity by name '%s' not found in db", name)));
}

}
