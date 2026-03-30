package com.makeitcl.makitscale.security;

import com.makeitcl.makitscale.model.Usuario;
import com.makeitcl.makitscale.repository.UsuarioRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public UserDetailsServiceImpl(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + username));

        // Por simplicidad, tomaremos el primer rol en el MVP, u obtener el rol del usuario
        String role = !usuario.getRoles().isEmpty() ? usuario.getRoles().iterator().next().getNombre() : "ROLE_USER";

        return new User(
                usuario.getUsername(),
                usuario.getPassword(),
                usuario.getActivo(),
                true,
                true,
                true,
                Collections.singletonList(new SimpleGrantedAuthority(role))
        );
    }
}
