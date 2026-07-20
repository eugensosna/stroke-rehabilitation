package ua.edu.zsea.sosna.stroke.service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.ListIterator;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import lombok.NoArgsConstructor;
import ua.edu.zsea.sosna.stroke.model.auth.UserNewInitial;

@Component
@ConfigurationProperties("stroke.init")
@NoArgsConstructor
public class InstalationProperties {
	private List<UserNewInitial> users = new ArrayList<>();

	public List<UserNewInitial> getUsers() {
		return users;
	}

	public void setUsers(List<UserNewInitial> users) {
		if (users == null) {
			this.users = new ArrayList<UserNewInitial>();
		} else {
			this.users = users;
		}
	}
	
	
}
