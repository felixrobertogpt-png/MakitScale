package com.makeitcl.makitscale.service;

import com.makeitcl.makitscale.model.*;
import com.makeitcl.makitscale.repository.BatchProduccionRepository;
import com.makeitcl.makitscale.repository.ProductoRepository;
import com.makeitcl.makitscale.repository.RecetaRepository;
import com.makeitcl.makitscale.security.TenantContext;
import com.makeitcl.makitscale.exception.BusinessException;
import com.makeitcl.makitscale.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Servicio de Producción — Fase 2: Trazabilidad.
 *
 * Flujo: Seleccionar receta → Definir cantidad → Producir lote
 *   1. Descontar materias primas del inventario
 *   2. Registrar snapshot del CPP al momento del consumo
 *   3. Calcular costo real del batch (materias + costos ocultos)
 *   4. Ingresar producto terminado al inventario
 *   5. Actualizar CPP del producto terminado
 */
@Service
@Transactional(readOnly = true)
public class BatchProduccionService {

    private static final int SCALE = 6;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    private final BatchProduccionRepository batchRepository;
    private final RecetaRepository recetaRepository;
    private final ProductoRepository productoRepository;

    public BatchProduccionService(BatchProduccionRepository batchRepository,
                                   RecetaRepository recetaRepository,
                                   ProductoRepository productoRepository) {
        this.batchRepository = batchRepository;
        this.recetaRepository = recetaRepository;
        this.productoRepository = productoRepository;
    }

    public List<BatchProduccion> listarTodos() {
        return batchRepository.findByEmpresaIdOrderByCreatedAtDesc(TenantContext.getCurrentTenant());
    }

    public BatchProduccion buscarPorId(Long id) {
        return batchRepository.findByIdAndEmpresaId(id, TenantContext.getCurrentTenant())
                .orElseThrow(() -> new ResourceNotFoundException("Lote no encontrado con ID: " + id));
    }

    /**
     * 🎯 Producir un lote completo.
     *
     * @param recetaId          ID de la receta a producir
     * @param multiplicador     Factor de producción (ej: 2.0 = doble de la receta base)
     * @param costosOcultos     Costos adicionales (horas hombre, electricidad, etc.)
     * @return BatchProduccion con trazabilidad completa
     */
    @Transactional
    public BatchProduccion producir(Long recetaId, BigDecimal multiplicador, BigDecimal costosOcultos,
                                    TipoContencion tipoContencion, java.util.Map<Long, BigDecimal> empaques) {
        Receta receta = recetaRepository.findById(recetaId)
                .orElseThrow(() -> new ResourceNotFoundException("Receta no encontrada: " + recetaId));

        // Cantidad a producir
        BigDecimal cantidadProducida = receta.getCantidadResultante()
                .multiply(multiplicador)
                .setScale(4, ROUNDING);

        // Generar número de lote
        String numeroLote = generarNumeroLote();

        // Crear batch
        BatchProduccion batch = new BatchProduccion();
        Empresa e = new Empresa();
        e.setId(TenantContext.getCurrentTenant());
        batch.setEmpresa(e);
        batch.setNumeroLote(numeroLote);
        batch.setReceta(receta);
        batch.setProductoResultante(receta.getProductoResultante());
        batch.setCantidadProducida(cantidadProducida);
        batch.setCostosOcultos(costosOcultos != null ? costosOcultos : BigDecimal.ZERO);
        batch.setEstado(EstadoBatch.COMPLETADO);
        batch.setTipoContencion(tipoContencion != null ? tipoContencion : TipoContencion.GRANEL);

        BigDecimal costoMaterias = BigDecimal.ZERO;

        // Procesar cada ingrediente
        for (DetalleReceta detalle : receta.getDetalles()) {
            Producto materiaPrima = detalle.getProducto();

            // Cantidad a consumir = cantidad receta × multiplicador
            BigDecimal cantidadConsumo = detalle.getCantidad()
                    .multiply(multiplicador)
                    .setScale(4, ROUNDING);

            // Verificar stock suficiente
            if (materiaPrima.getStockActual().compareTo(cantidadConsumo) < 0) {
                throw new BusinessException(
                    String.format("Stock insuficiente de '%s': disponible=%.4f, requerido=%.4f",
                        materiaPrima.getNombre(),
                        materiaPrima.getStockActual(),
                        cantidadConsumo));
            }

            // Snapshot CPP al momento del consumo
            BigDecimal cppSnapshot = materiaPrima.getCostoPromedioPonderado();

            // Costo de esta línea
            BigDecimal costoLinea = cantidadConsumo.multiply(cppSnapshot).setScale(SCALE, ROUNDING);
            costoMaterias = costoMaterias.add(costoLinea);

            // Descontar stock de materia prima
            materiaPrima.setStockActual(
                    materiaPrima.getStockActual().subtract(cantidadConsumo)
            );
            productoRepository.save(materiaPrima);

            // Registrar consumo con trazabilidad
            DetalleBatchConsumo consumo = new DetalleBatchConsumo();
            consumo.setProducto(materiaPrima);
            consumo.setCantidad(cantidadConsumo);
            consumo.setCppAlConsumo(cppSnapshot);
            consumo.setCostoLinea(costoLinea);
            batch.addConsumo(consumo);
        }

        // Procesar empaques si es ENVASADO
        if (batch.getTipoContencion() == TipoContencion.ENVASADO && empaques != null) {
            for (java.util.Map.Entry<Long, BigDecimal> entry : empaques.entrySet()) {
                Producto empaque = productoRepository.findById(entry.getKey())
                        .orElseThrow(() -> new ResourceNotFoundException("Empaque no encontrado: " + entry.getKey()));
                
                BigDecimal cantidadConsumo = entry.getValue();
                
                if (empaque.getStockActual().compareTo(cantidadConsumo) < 0) {
                    throw new BusinessException(
                        String.format("Stock insuficiente de empaque '%s': disponible=%.4f, requerido=%.4f",
                            empaque.getNombre(), empaque.getStockActual(), cantidadConsumo));
                }

                BigDecimal cppSnapshot = empaque.getCostoPromedioPonderado();
                BigDecimal costoLinea = cantidadConsumo.multiply(cppSnapshot).setScale(SCALE, ROUNDING);
                costoMaterias = costoMaterias.add(costoLinea);

                empaque.setStockActual(empaque.getStockActual().subtract(cantidadConsumo));
                productoRepository.save(empaque);

                DetalleBatchConsumo consumo = new DetalleBatchConsumo();
                consumo.setProducto(empaque);
                consumo.setCantidad(cantidadConsumo);
                consumo.setCppAlConsumo(cppSnapshot);
                consumo.setCostoLinea(costoLinea);
                batch.addConsumo(consumo);
            }
        }

        // Calcular costos totales
        batch.setCostoMaterias(costoMaterias);
        BigDecimal costoTotal = costoMaterias.add(batch.getCostosOcultos());
        batch.setCostoTotal(costoTotal);

        // Costo unitario del producto terminado
        BigDecimal costoUnitario = BigDecimal.ZERO;
        if (cantidadProducida.compareTo(BigDecimal.ZERO) > 0) {
            costoUnitario = costoTotal.divide(cantidadProducida, SCALE, ROUNDING);
        }
        batch.setCostoUnitario(costoUnitario);

        // Ingresar producto terminado al inventario con CPP actualizado
        Producto productoTerminado = receta.getProductoResultante();
        BigDecimal stockAnterior = productoTerminado.getStockActual();
        BigDecimal cppAnterior = productoTerminado.getCostoPromedioPonderado();

        // CPP del producto terminado = promedio ponderado
        BigDecimal nuevoStock = stockAnterior.add(cantidadProducida);
        BigDecimal nuevoCPP;
        if (nuevoStock.compareTo(BigDecimal.ZERO) > 0) {
            nuevoCPP = stockAnterior.multiply(cppAnterior)
                    .add(cantidadProducida.multiply(costoUnitario))
                    .divide(nuevoStock, SCALE, ROUNDING);
        } else {
            nuevoCPP = costoUnitario;
        }

        productoTerminado.setStockActual(nuevoStock);
        productoTerminado.setCostoPromedioPonderado(nuevoCPP);
        productoRepository.save(productoTerminado);

        return batchRepository.save(batch);
    }

    /**
     * Genera número de lote auto-incremental: LOT-YYYYMMDD-NNN
     */
    private String generarNumeroLote() {
        String prefix = "LOT-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-";
        long count = batchRepository.count() + 1;
        return prefix + String.format("%03d", count);
    }
}
