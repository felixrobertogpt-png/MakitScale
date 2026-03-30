package com.makeitcl.makitscale.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Venta — Factura de venta con cálculo de márgenes reales.
 *
 * Registra cada venta, descuenta stock del producto terminado,
 * y calcula el margen real usando el CPP vigente vs precio de venta.
 */
@Entity
@Table(name = "venta")
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "numero_factura", nullable = false, length = 50)
    private String numeroFactura;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String cliente;

    @NotNull
    @Column(name = "fecha_venta", nullable = false)
    private LocalDate fechaVenta;

    /**
     * Total de venta (suma de líneas: cantidad × precioVenta).
     */
    @Column(name = "total_venta", precision = 16, scale = 2)
    private BigDecimal totalVenta = BigDecimal.ZERO;

    /**
     * Costo real total (suma de líneas: cantidad × CPP al momento).
     */
    @Column(name = "costo_real_total", precision = 16, scale = 6)
    private BigDecimal costoRealTotal = BigDecimal.ZERO;

    /**
     * Margen bruto = totalVenta - costoRealTotal.
     */
    @Column(name = "margen_bruto", precision = 16, scale = 2)
    private BigDecimal margenBruto = BigDecimal.ZERO;

    /**
     * % Margen = (margenBruto / totalVenta) × 100.
     */
    @Column(name = "porcentaje_margen", precision = 8, scale = 2)
    private BigDecimal porcentajeMargen = BigDecimal.ZERO;

    @JsonManagedReference("venta-detalle")
    @OneToMany(mappedBy = "venta", fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DetalleVenta> detalles = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Empresa empresa;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // --- Helper ---
    public void addDetalle(DetalleVenta detalle) {
        detalles.add(detalle);
        detalle.setVenta(this);
    }

    // --- Constructors ---
    public Venta() {}

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNumeroFactura() { return numeroFactura; }
    public void setNumeroFactura(String numeroFactura) { this.numeroFactura = numeroFactura; }

    public String getCliente() { return cliente; }
    public void setCliente(String cliente) { this.cliente = cliente; }

    public LocalDate getFechaVenta() { return fechaVenta; }
    public void setFechaVenta(LocalDate fechaVenta) { this.fechaVenta = fechaVenta; }

    public BigDecimal getTotalVenta() { return totalVenta; }
    public void setTotalVenta(BigDecimal totalVenta) { this.totalVenta = totalVenta; }

    public BigDecimal getCostoRealTotal() { return costoRealTotal; }
    public void setCostoRealTotal(BigDecimal costoRealTotal) { this.costoRealTotal = costoRealTotal; }

    public BigDecimal getMargenBruto() { return margenBruto; }
    public void setMargenBruto(BigDecimal margenBruto) { this.margenBruto = margenBruto; }

    public BigDecimal getPorcentajeMargen() { return porcentajeMargen; }
    public void setPorcentajeMargen(BigDecimal porcentajeMargen) { this.porcentajeMargen = porcentajeMargen; }

    public List<DetalleVenta> getDetalles() { return detalles; }
    public void setDetalles(List<DetalleVenta> detalles) { this.detalles = detalles; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
}
