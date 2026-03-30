package com.makeitcl.makitscale.controller.dto;

public class AuthResponse {
    private String token;
    private Long id;
    private String username;
    private String nombre;
    private String apellido;
    private String email;
    private Long empresaId;
    private String empresaNombre;
    private String rol;

    public AuthResponse(String token, Long id, String username, String nombre, String apellido, 
                        String email, Long empresaId, String empresaNombre, String rol) {
        this.token = token;
        this.id = id;
        this.username = username;
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.empresaId = empresaId;
        this.empresaNombre = empresaNombre;
        this.rol = rol;
    }

    public String getToken() { return token; }
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getNombre() { return nombre; }
    public String getApellido() { return apellido; }
    public String getEmail() { return email; }
    public Long getEmpresaId() { return empresaId; }
    public String getEmpresaNombre() { return empresaNombre; }
    public String getRol() { return rol; }
}
