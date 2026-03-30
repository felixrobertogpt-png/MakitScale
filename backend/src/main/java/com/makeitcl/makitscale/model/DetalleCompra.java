package com.makeitcl.makitscale.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Línea de detalle de una factura de compra.
 * Al persistirse, dispara el recálculo del Costo Promedio Ponderado
 * del producto asociado.
 */
@Entity
@Table(name = "detalle_compra")
public class DetalleCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "compra_id", nullable = false)
    private Compra compra;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @NotNull
    @Column(nullable = false, precision = 16, scale = 4)
    private BigDecimal cantidad;

    @NotNull
    @Column(name = "precio_unitario", nullable = false, precision = 16, scale = 6)
    private BigDecimal precioUnitario;

    /**
     * Subtotal = cantidad × precioUnitario (calculado automáticamente).
     */
    @Column(nullable = false, precision = 16, scale = 6)
    private BigDecimal subtotal = BigDecimal.ZERO;

    // --- Constructors ---
    public DetalleCompra() {}

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Compra getCompra() { return compra; }
    public void setCompra(Compra compra) { this.compra = compra; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }

    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precioUnitario) { this.precioUnitario = precioUnitario; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
}
