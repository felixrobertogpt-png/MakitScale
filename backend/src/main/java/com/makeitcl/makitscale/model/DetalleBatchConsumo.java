package com.makeitcl.makitscale.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Detalle de consumo de materia prima en un lote de producción.
 * Registra exactamente cuánto de cada ingrediente se usó y a qué CPP.
 * Esto permite trazabilidad: "este lote consumió X kg de Y a $Z/kg".
 */
@Entity
@Table(name = "detalle_batch_consumo")
public class DetalleBatchConsumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference("batch-consumo")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private BatchProduccion batch;

    /**
     * Materia prima consumida.
     */
    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    /**
     * Cantidad consumida.
     */
    @NotNull
    @Column(nullable = false, precision = 16, scale = 4)
    private BigDecimal cantidad;

    /**
     * CPP vigente al momento del consumo (snapshot para trazabilidad).
     */
    @Column(name = "cpp_al_consumo", precision = 16, scale = 6)
    private BigDecimal cppAlConsumo;

    /**
     * Costo de esta línea = cantidad × cppAlConsumo.
     */
    @Column(name = "costo_linea", precision = 16, scale = 6)
    private BigDecimal costoLinea;

    // --- Constructors ---
    public DetalleBatchConsumo() {}

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BatchProduccion getBatch() { return batch; }
    public void setBatch(BatchProduccion batch) { this.batch = batch; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }

    public BigDecimal getCppAlConsumo() { return cppAlConsumo; }
    public void setCppAlConsumo(BigDecimal cppAlConsumo) { this.cppAlConsumo = cppAlConsumo; }

    public BigDecimal getCostoLinea() { return costoLinea; }
    public void setCostoLinea(BigDecimal costoLinea) { this.costoLinea = costoLinea; }
}
