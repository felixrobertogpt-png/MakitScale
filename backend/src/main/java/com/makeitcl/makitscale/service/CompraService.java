package com.makeitcl.makitscale.service;

import com.makeitcl.makitscale.model.Compra;
import com.makeitcl.makitscale.model.DetalleCompra;
import com.makeitcl.makitscale.model.Empresa;
import com.makeitcl.makitscale.repository.CompraRepository;
import com.makeitcl.makitscale.security.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Servicio de Compras.
 * Al registrar una compra, por cada línea de detalle:
 *   1. Calcula el subtotal (cantidad × precioUnitario)
 *   2. Actualiza stock del producto
 *   3. Recalcula el Costo Promedio Ponderado
 */
@Service
@Transactional
public class CompraService {

    private static final int SCALE = 6;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    private final CompraRepository compraRepository;
    private final ProductoService productoService;

    public CompraService(CompraRepository compraRepository, ProductoService productoService) {
        this.compraRepository = compraRepository;
        this.productoService = productoService;
    }

    public List<Compra> listarTodas() {
        return compraRepository.findByEmpresaId(TenantContext.getCurrentTenant());
    }

    public Compra buscarPorId(Long id) {
        return compraRepository.findByIdAndEmpresaId(id, TenantContext.getCurrentTenant())
                .orElseThrow(() -> new RuntimeException("Compra no encontrada con ID: " + id));
    }

    /**
     * Registra una factura de compra completa.
     * Procesa cada línea: calcula subtotal, actualiza stock y recalcula CPP.
     */
    public Compra registrarCompra(Compra compra) {
        Empresa e = new Empresa();
        e.setId(TenantContext.getCurrentTenant());
        compra.setEmpresa(e);
        BigDecimal totalFactura = BigDecimal.ZERO;

        for (DetalleCompra detalle : compra.getDetalles()) {
            detalle.setCompra(compra);

            // Calcular subtotal de la línea
            BigDecimal subtotal = detalle.getCantidad()
                    .multiply(detalle.getPrecioUnitario())
                    .setScale(SCALE, ROUNDING);
            detalle.setSubtotal(subtotal);
            totalFactura = totalFactura.add(subtotal);

            // Actualizar stock + recalcular CPP del producto
            productoService.actualizarCostoPromedioPonderado(
                    detalle.getProducto().getId(),
                    detalle.getCantidad(),
                    detalle.getPrecioUnitario()
            );
        }

        compra.setTotal(totalFactura.setScale(SCALE, ROUNDING));
        return compraRepository.save(compra);
    }
}
