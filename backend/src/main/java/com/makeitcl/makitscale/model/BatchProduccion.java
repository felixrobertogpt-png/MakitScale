package com.makeitcl.makitscale.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Lote de Producción — Trazabilidad completa.
 *
 * Registra cada batch fabricado: qué receta se usó, cuánto se produjo,
 * qué materias primas se consumieron, y el costo real del lote.
 * Permite rastrear "de qué lote salió cada producto".
 */
@Entity
@Table(name = "batch_produccion")
public class BatchProduccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Número de lote único (ej: LOT-2026-001)
     */
    @NotBlank
    @Column(name = "numero_lote", nullable = false, unique = true, length = 50)
    private String numeroLote;

    /**
     * Receta base utilizada para esta producción.
     */
    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "receta_id", nullable = false)
    private Receta receta;

    /**
     * Producto terminado resultante.
     */
    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "producto_resultante_id", nullable = false)
    private Producto productoResultante;

    /**
     * Cantidad producida en este lote.
     */
    @NotNull
    @Column(name = "cantidad_producida", nullable = false, precision = 16, scale = 4)
    private BigDecimal cantidadProducida;

    /**
     * Costo total de materias primas consumidas.
     */
    @Column(name = "costo_materias", precision = 16, scale = 6)
    private BigDecimal costoMaterias = BigDecimal.ZERO;

    /**
     * Costos ocultos adicionales (horas hombre, electricidad, transporte).
     */
    @Column(name = "costos_ocultos", precision = 16, scale = 6)
    private BigDecimal costosOcultos = BigDecimal.ZERO;

    /**
     * Costo total del batch = costoMaterias + costosOcultos.
     */
    @Column(name = "costo_total", precision = 16, scale = 6)
    private BigDecimal costoTotal = BigDecimal.ZERO;

    /**
     * Costo unitario = costoTotal / cantidadProducida.
     */
    @Column(name = "costo_unitario", precision = 16, scale = 6)
    private BigDecimal costoUnitario = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoBatch estado = EstadoBatch.COMPLETADO;

    @JsonManagedReference("batch-consumo")
    @OneToMany(mappedBy = "batch", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<DetalleBatchConsumo> consumos = new ArrayList<>();

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
    public void addConsumo(DetalleBatchConsumo consumo) {
        consumos.add(consumo);
        consumo.setBatch(this);
    }

    // --- Constructors ---
    public BatchProduccion() {}

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNumeroLote() { return numeroLote; }
    public void setNumeroLote(String numeroLote) { this.numeroLote = numeroLote; }

    public Receta getReceta() { return receta; }
    public void setReceta(Receta receta) { this.receta = receta; }

    public Producto getProductoResultante() { return productoResultante; }
    public void setProductoResultante(Producto productoResultante) { this.productoResultante = productoResultante; }

    public BigDecimal getCantidadProducida() { return cantidadProducida; }
    public void setCantidadProducida(BigDecimal cantidadProducida) { this.cantidadProducida = cantidadProducida; }

    public BigDecimal getCostoMaterias() { return costoMaterias; }
    public void setCostoMaterias(BigDecimal costoMaterias) { this.costoMaterias = costoMaterias; }

    public BigDecimal getCostosOcultos() { return costosOcultos; }
    public void setCostosOcultos(BigDecimal costosOcultos) { this.costosOcultos = costosOcultos; }

    public BigDecimal getCostoTotal() { return costoTotal; }
    public void setCostoTotal(BigDecimal costoTotal) { this.costoTotal = costoTotal; }

    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }

    public EstadoBatch getEstado() { return estado; }
    public void setEstado(EstadoBatch estado) { this.estado = estado; }

    public List<DetalleBatchConsumo> getConsumos() { return consumos; }
    public void setConsumos(List<DetalleBatchConsumo> consumos) { this.consumos = consumos; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
}
