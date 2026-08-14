package ua.edu.zsea.sosna.stroke.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import ua.edu.zsea.sosna.stroke.domain.User;
import ua.edu.zsea.sosna.stroke.model.UserDTO;

public interface UserEntityService {

	List<UserDTO> findAll();

	UserDTO get(Long id);

	User findByEmail(String email);

	User findByName(String name);

	Long create(UserDTO userDTO);

	void update(Long id, UserDTO userDTO);

	void delete(Long id);

	boolean nameExists(String name);

	boolean emailExists(String email);

	Map<Long, Long> getUserValues();

	User get(long userId);

}
