package com.makeitcl.makitscale.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Ingrediente de una receta.
 * Asocia una materia prima con la cantidad requerida.
 */
@Entity
@Table(name = "detalle_receta")
public class DetalleReceta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receta_id", nullable = false)
    private Receta receta;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    /**
     * Cantidad requerida de este ingrediente (ej: 5.5 KG).
     */
    @NotNull
    @Column(nullable = false, precision = 16, scale = 4)
    private BigDecimal cantidad;

    // --- Constructors ---
    public DetalleReceta() {}

    public DetalleReceta(Producto producto, BigDecimal cantidad) {
        this.producto = producto;
        this.cantidad = cantidad;
    }

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Receta getReceta() { return receta; }
    public void setReceta(Receta receta) { this.receta = receta; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
}
