package com.makeitcl.makitscale.controller;

import com.makeitcl.makitscale.controller.dto.AuthRequest;
import com.makeitcl.makitscale.controller.dto.AuthResponse;
import com.makeitcl.makitscale.model.Empresa;
import com.makeitcl.makitscale.model.Rol;
import com.makeitcl.makitscale.model.Usuario;
import com.makeitcl.makitscale.repository.EmpresaRepository;
import com.makeitcl.makitscale.repository.RolRepository;
import com.makeitcl.makitscale.repository.UsuarioRepository;
import com.makeitcl.makitscale.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UsuarioRepository usuarioRepository;
    private final EmpresaRepository empresaRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwtUtil, 
                          UsuarioRepository usuarioRepository, EmpresaRepository empresaRepository, 
                          RolRepository rolRepository, PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.usuarioRepository = usuarioRepository;
        this.empresaRepository = empresaRepository;
        this.rolRepository = rolRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request) {
        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            Usuario usuario = usuarioRepository.findByUsername(request.getUsername()).orElseThrow();
            
            String token = jwtUtil.generateToken(usuario.getUsername(), usuario.getEmpresa().getId());

            return ResponseEntity.ok(new AuthResponse(
                    token,
                    usuario.getId(),
                    usuario.getUsername(),
                    usuario.getNombre(),
                    usuario.getApellido(),
                    usuario.getEmail(),
                    usuario.getEmpresa().getId(),
                    usuario.getEmpresa().getNombre(),
                    !usuario.getRoles().isEmpty() ? usuario.getRoles().iterator().next().getNombre() : "ROLE_USER"
            ));
        } catch (AuthenticationException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Credenciales incorrectas");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
    }

    // Endpoint simplificado de registro para MVP
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");
        String nombreEmpresa = payload.get("empresa");
        String email = payload.get("email");

        if (usuarioRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body("El usuario ya existe");
        }

        // 1. Crear empresa
        Empresa empresa = new Empresa();
        empresa.setNombre(nombreEmpresa);
        empresa.setRut(payload.getOrDefault("rut", "RUT-" + System.currentTimeMillis()));
        empresa = empresaRepository.save(empresa);

        // 2. Obtener rol o crearlo (simplificado)
        Rol rolAdmin = rolRepository.findByNombre("ROLE_ADMIN")
                .orElseGet(() -> {
                    Rol newRol = new Rol();
                    newRol.setNombre("ROLE_ADMIN");
                    return rolRepository.save(newRol);
                });

        // 3. Crear usuario
        Usuario nuevoUsuario = new Usuario();
        nuevoUsuario.setUsername(username);
        nuevoUsuario.setPassword(passwordEncoder.encode(password));
        nuevoUsuario.setEmail(email != null ? email : username + "@makitscale.com");
        nuevoUsuario.setNombre(username);
        nuevoUsuario.setEmpresa(empresa);
        nuevoUsuario.getRoles().add(rolAdmin);
        
        usuarioRepository.save(nuevoUsuario);

        // Auto login
        String token = jwtUtil.generateToken(nuevoUsuario.getUsername(), empresa.getId());
        
        return ResponseEntity.ok(new AuthResponse(
                token,
                nuevoUsuario.getId(),
                nuevoUsuario.getUsername(),
                nuevoUsuario.getNombre(),
                nuevoUsuario.getApellido(),
                nuevoUsuario.getEmail(),
                nuevoUsuario.getEmpresa().getId(),
                nuevoUsuario.getEmpresa().getNombre(),
                nuevoUsuario.getRoles().iterator().next().getNombre()
        ));
    }
}
