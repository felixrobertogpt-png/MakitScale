package com.makeitcl.makitscale.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Detalle de venta — línea de una factura de venta.
 *
 * Registra el precio de venta, el CPP al momento de la venta (snapshot),
 * y calcula el margen por línea para trazabilidad de rentabilidad.
 */
@Entity
@Table(name = "detalle_venta")
public class DetalleVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference("venta-detalle")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id", nullable = false)
    private Venta venta;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @NotNull
    @Column(nullable = false, precision = 16, scale = 4)
    private BigDecimal cantidad;

    /**
     * Precio de venta unitario (lo que cobra la empresa).
     */
    @NotNull
    @Column(name = "precio_venta", nullable = false, precision = 16, scale = 2)
    private BigDecimal precioVenta;

    /**
     * CPP vigente al momento de la venta (snapshot para trazabilidad).
     */
    @Column(name = "cpp_al_venta", precision = 16, scale = 6)
    private BigDecimal cppAlVenta;

    /**
     * Subtotal venta = cantidad × precioVenta.
     */
    @Column(name = "subtotal_venta", precision = 16, scale = 2)
    private BigDecimal subtotalVenta;

    /**
     * Costo real = cantidad × cppAlVenta.
     */
    @Column(name = "costo_real", precision = 16, scale = 6)
    private BigDecimal costoReal;

    /**
     * Margen línea = subtotalVenta - costoReal.
     */
    @Column(name = "margen_linea", precision = 16, scale = 2)
    private BigDecimal margenLinea;

    // --- Constructors ---
    public DetalleVenta() {}

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Venta getVenta() { return venta; }
    public void setVenta(Venta venta) { this.venta = venta; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }

    public BigDecimal getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(BigDecimal precioVenta) { this.precioVenta = precioVenta; }

    public BigDecimal getCppAlVenta() { return cppAlVenta; }
    public void setCppAlVenta(BigDecimal cppAlVenta) { this.cppAlVenta = cppAlVenta; }

    public BigDecimal getSubtotalVenta() { return subtotalVenta; }
    public void setSubtotalVenta(BigDecimal subtotalVenta) { this.subtotalVenta = subtotalVenta; }

    public BigDecimal getCostoReal() { return costoReal; }
    public void setCostoReal(BigDecimal costoReal) { this.costoReal = costoReal; }

    public BigDecimal getMargenLinea() { return margenLinea; }
    public void setMargenLinea(BigDecimal margenLinea) { this.margenLinea = margenLinea; }
}
