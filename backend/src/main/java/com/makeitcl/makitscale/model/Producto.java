package com.makeitcl.makitscale.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Maestro de Productos (materias primas y productos terminados).
 * El campo costoPromedioPonderado se recalcula automáticamente
 * cada vez que se registra una compra.
 */
@Entity
@Table(name = "producto")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 20)
    @Column(nullable = false, unique = true, length = 20)
    private String codigo;

    @NotBlank
    @Size(max = 150)
    @Column(nullable = false, length = 150)
    private String nombre;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_producto", nullable = false, length = 30)
    private TipoProducto tipoProducto;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "unidad_medida_id")
    private UnidadMedida unidadMedida;

    /**
     * Stock actual en bodega (precisión: 16 dígitos, 4 decimales).
     */
    @NotNull
    @Column(name = "stock_actual", nullable = false, precision = 16, scale = 4)
    private BigDecimal stockActual = BigDecimal.ZERO;

    /**
     * Costo Promedio Ponderado vigente (precisión: 16 dígitos, 6 decimales).
     * Fórmula: ((stock_anterior × cpp_anterior) + (cantidad_compra × precio_unitario))
     *          / (stock_anterior + cantidad_compra)
     */
    @NotNull
    @Column(name = "costo_promedio_ponderado", nullable = false, precision = 16, scale = 6)
    private BigDecimal costoPromedioPonderado = BigDecimal.ZERO;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Empresa empresa;

    // --- Lifecycle hooks ---
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // --- Constructors ---
    public Producto() {}

    public Producto(String codigo, String nombre, TipoProducto tipoProducto) {
        this.codigo = codigo;
        this.nombre = nombre;
        this.tipoProducto = tipoProducto;
    }

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public TipoProducto getTipoProducto() { return tipoProducto; }
    public void setTipoProducto(TipoProducto tipoProducto) { this.tipoProducto = tipoProducto; }

    public UnidadMedida getUnidadMedida() { return unidadMedida; }
    public void setUnidadMedida(UnidadMedida unidadMedida) { this.unidadMedida = unidadMedida; }

    public BigDecimal getStockActual() { return stockActual; }
    public void setStockActual(BigDecimal stockActual) { this.stockActual = stockActual; }

    public BigDecimal getCostoPromedioPonderado() { return costoPromedioPonderado; }
    public void setCostoPromedioPonderado(BigDecimal costoPromedioPonderado) { this.costoPromedioPonderado = costoPromedioPonderado; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
}
