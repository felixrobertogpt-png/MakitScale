package com.makeitcl.makitscale.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Receta base de producción.
 * Define los ingredientes (materias primas) y cantidades necesarias
 * para fabricar un producto terminado.
 */
@Entity
@Table(name = "receta")
public class Receta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 150)
    @Column(nullable = false, length = 150)
    private String nombre;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_resultante_id", nullable = false)
    private Producto productoResultante;

    /**
     * Cantidad que produce esta receta (ej: 100 KG).
     */
    @NotNull
    @Column(name = "cantidad_resultante", nullable = false, precision = 16, scale = 4)
    private BigDecimal cantidadResultante;

    @JsonManagedReference
    @OneToMany(mappedBy = "receta", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<DetalleReceta> detalles = new ArrayList<>();

    @Column(nullable = false)
    private Boolean activa = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Empresa empresa;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // --- Helper methods ---
    public void addDetalle(DetalleReceta detalle) {
        detalles.add(detalle);
        detalle.setReceta(this);
    }

    // --- Constructors ---
    public Receta() {}

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public Producto getProductoResultante() { return productoResultante; }
    public void setProductoResultante(Producto productoResultante) { this.productoResultante = productoResultante; }

    public BigDecimal getCantidadResultante() { return cantidadResultante; }
    public void setCantidadResultante(BigDecimal cantidadResultante) { this.cantidadResultante = cantidadResultante; }

    public List<DetalleReceta> getDetalles() { return detalles; }
    public void setDetalles(List<DetalleReceta> detalles) { this.detalles = detalles; }

    public Boolean getActiva() { return activa; }
    public void setActiva(Boolean activa) { this.activa = activa; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
}
