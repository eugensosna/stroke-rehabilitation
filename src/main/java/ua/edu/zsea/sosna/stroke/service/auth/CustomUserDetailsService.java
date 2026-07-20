package ua.edu.zsea.sosna.stroke.service.auth;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import lombok.AllArgsConstructor;
import ua.edu.zsea.sosna.stroke.domain.User;
import ua.edu.zsea.sosna.stroke.repos.UserRepository;

@Service
@AllArgsConstructor
public class CustomUserDetailsService implements org.springframework.security.core.userdetails.UserDetailsService {
	private UserRepository userRepository;

	@Override
	public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
		org.springframework.security.core.userdetails.User result = null;
		User item = userRepository.findByEmail(username).orElseThrow(()-> new UsernameNotFoundException(username));
		if (item!=null) {
			Collection<GrantedAuthority> roles = List.of(new SimpleGrantedAuthority("USER"));
			result = new org.springframework.security.core.userdetails.User(
					item.getEmail(),
					item.getPassword(),
					roles
					);
			
		}
		return result;
	}

}
