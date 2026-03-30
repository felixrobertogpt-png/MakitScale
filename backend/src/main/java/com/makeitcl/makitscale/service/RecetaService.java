package com.makeitcl.makitscale.service;

import com.makeitcl.makitscale.model.DetalleReceta;
import com.makeitcl.makitscale.model.Receta;
import com.makeitcl.makitscale.model.Empresa;
import com.makeitcl.makitscale.repository.RecetaRepository;
import com.makeitcl.makitscale.security.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Servicio de Recetas y Costeo en tiempo real.
 *
 * calcularCostoReceta() toma el CPP vigente de cada ingrediente
 * y calcula el costo total y unitario de la receta al instante.
 */
@Service
@Transactional(readOnly = true)
public class RecetaService {

    private static final int SCALE = 6;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    private final RecetaRepository recetaRepository;

    public RecetaService(RecetaRepository recetaRepository) {
        this.recetaRepository = recetaRepository;
    }

    public List<Receta> listarTodas() {
        return recetaRepository.findByEmpresaId(TenantContext.getCurrentTenant());
    }

    public List<Receta> listarActivas() {
        return recetaRepository.findByActivaTrueAndEmpresaId(TenantContext.getCurrentTenant());
    }

    public Receta buscarPorId(Long id) {
        return recetaRepository.findByIdAndEmpresaId(id, TenantContext.getCurrentTenant())
                .orElseThrow(() -> new RuntimeException("Receta no encontrada con ID: " + id));
    }

    @Transactional
    public Receta crear(Receta receta) {
        Empresa e = new Empresa();
        e.setId(TenantContext.getCurrentTenant());
        receta.setEmpresa(e);
        for (DetalleReceta detalle : receta.getDetalles()) {
            detalle.setReceta(receta);
        }
        return recetaRepository.save(receta);
    }

    @Transactional
    public Receta actualizar(Long id, Receta datosActualizados) {
        Receta existente = buscarPorId(id);
        existente.setNombre(datosActualizados.getNombre());
        existente.setProductoResultante(datosActualizados.getProductoResultante());
        existente.setCantidadResultante(datosActualizados.getCantidadResultante());
        existente.setActiva(datosActualizados.getActiva());

        // Reemplazar detalles
        existente.getDetalles().clear();
        for (DetalleReceta detalle : datosActualizados.getDetalles()) {
            existente.addDetalle(detalle);
        }

        return recetaRepository.save(existente);
    }

    // --- COSTEO EN TIEMPO REAL ---

    /**
     * Calcula el costo de una receta usando los CPP vigentes.
     *
     * @param recetaId ID de la receta
     * @return Mapa con: costoTotal, costoUnitario, cantidadResultante, detallesCosto
     */
    public Map<String, Object> calcularCostoReceta(Long recetaId) {
        Receta receta = buscarPorId(recetaId);

        BigDecimal costoTotal = BigDecimal.ZERO;
        List<Map<String, Object>> detallesCosto = new java.util.ArrayList<>();

        for (DetalleReceta detalle : receta.getDetalles()) {
            BigDecimal cppIngrediente = detalle.getProducto().getCostoPromedioPonderado();
            BigDecimal costoLinea = detalle.getCantidad()
                    .multiply(cppIngrediente)
                    .setScale(SCALE, ROUNDING);

            costoTotal = costoTotal.add(costoLinea);

            Map<String, Object> lineaCosto = new HashMap<>();
            lineaCosto.put("productoId", detalle.getProducto().getId());
            lineaCosto.put("productoNombre", detalle.getProducto().getNombre());
            lineaCosto.put("cantidad", detalle.getCantidad());
            lineaCosto.put("cppVigente", cppIngrediente);
            lineaCosto.put("costoLinea", costoLinea);
            detallesCosto.add(lineaCosto);
        }

        BigDecimal costoUnitario = BigDecimal.ZERO;
        if (receta.getCantidadResultante().compareTo(BigDecimal.ZERO) > 0) {
            costoUnitario = costoTotal.divide(receta.getCantidadResultante(), SCALE, ROUNDING);
        }

        Map<String, Object> resultado = new HashMap<>();
        resultado.put("recetaId", receta.getId());
        resultado.put("recetaNombre", receta.getNombre());
        resultado.put("cantidadResultante", receta.getCantidadResultante());
        resultado.put("costoTotal", costoTotal);
        resultado.put("costoUnitario", costoUnitario);
        resultado.put("detallesCosto", detallesCosto);

        return resultado;
    }
}
