package ua.edu.zsea.sosna.stroke.model;

import ua.edu.zsea.sosna.stroke.domain.User;

public record UserProfileResponse(Long id, String fullName, String name, String email) {

	public static UserProfileResponse from(User user) {
		// TODO Auto-generated method stub
		return new UserProfileResponse(user.getId(), user.getFullName(), user.getName(), user.getEmail());
	}

}
