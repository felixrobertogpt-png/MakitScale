package com.makeitcl.makitscale.service;

import com.makeitcl.makitscale.model.DetalleVenta;
import com.makeitcl.makitscale.model.Producto;
import com.makeitcl.makitscale.model.Venta;
import com.makeitcl.makitscale.model.Empresa;
import com.makeitcl.makitscale.repository.ProductoRepository;
import com.makeitcl.makitscale.repository.VentaRepository;
import com.makeitcl.makitscale.repository.VentaRepository;
import com.makeitcl.makitscale.security.TenantContext;
import com.makeitcl.makitscale.exception.BusinessException;
import com.makeitcl.makitscale.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Servicio de Ventas — Cálculo de márgenes reales.
 *
 * "Saber la rentabilidad real de cada factura" — Angel
 *
 * Flujo: Registrar venta → Snapshot CPP → Calcular margen → Descontar stock
 */
@Service
@Transactional(readOnly = true)
public class VentaService {

    private static final int SCALE = 6;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    private final VentaRepository ventaRepository;
    private final ProductoRepository productoRepository;

    public VentaService(VentaRepository ventaRepository, ProductoRepository productoRepository) {
        this.ventaRepository = ventaRepository;
        this.productoRepository = productoRepository;
    }

    public List<Venta> listarTodas() {
        return ventaRepository.findByEmpresaIdOrderByFechaVentaDesc(TenantContext.getCurrentTenant());
    }

    public Venta buscarPorId(Long id) {
        return ventaRepository.findByIdAndEmpresaId(id, TenantContext.getCurrentTenant())
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada con ID: " + id));
    }

    /**
     * 🎯 Registrar una venta con cálculo de margen real.
     *
     * Para cada línea:
     *   1. Obtener CPP vigente del producto (costo real)
     *   2. Calcular subtotal venta = cantidad × precioVenta
     *   3. Calcular costo real = cantidad × CPP
     *   4. Margen línea = subtotalVenta - costoReal
     *   5. Descontar stock del producto
     *
     * Al final: totalVenta, costoRealTotal, margenBruto, %margen
     */
    @Transactional
    public Venta registrarVenta(Venta venta) {
        Empresa e = new Empresa();
        e.setId(TenantContext.getCurrentTenant());
        venta.setEmpresa(e);
        BigDecimal totalVenta = BigDecimal.ZERO;
        BigDecimal costoRealTotal = BigDecimal.ZERO;

        for (DetalleVenta detalle : venta.getDetalles()) {
            Producto producto = productoRepository.findById(detalle.getProducto().getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                        "Producto no encontrado: " + detalle.getProducto().getId()));

            BigDecimal cantidad = detalle.getCantidad();

            // Verificar stock
            if (producto.getStockActual().compareTo(cantidad) < 0) {
                throw new BusinessException(
                    String.format("Stock insuficiente de '%s': disponible=%.4f, requerido=%.4f",
                        producto.getNombre(),
                        producto.getStockActual(),
                        cantidad));
            }

            // Snapshot CPP al momento de la venta
            BigDecimal cppSnapshot = producto.getCostoPromedioPonderado();
            detalle.setCppAlVenta(cppSnapshot);

            // Cálculos
            BigDecimal subtotalVenta = cantidad.multiply(detalle.getPrecioVenta())
                    .setScale(2, ROUNDING);
            BigDecimal costoReal = cantidad.multiply(cppSnapshot)
                    .setScale(SCALE, ROUNDING);
            BigDecimal margenLinea = subtotalVenta.subtract(
                    costoReal.setScale(2, ROUNDING));

            detalle.setSubtotalVenta(subtotalVenta);
            detalle.setCostoReal(costoReal);
            detalle.setMargenLinea(margenLinea);
            detalle.setProducto(producto);

            totalVenta = totalVenta.add(subtotalVenta);
            costoRealTotal = costoRealTotal.add(costoReal);

            // Descontar stock
            producto.setStockActual(producto.getStockActual().subtract(cantidad));
            productoRepository.save(producto);

            // Set parent reference
            detalle.setVenta(venta);
        }

        // Totales de la factura
        venta.setTotalVenta(totalVenta);
        venta.setCostoRealTotal(costoRealTotal);

        BigDecimal margenBruto = totalVenta.subtract(
                costoRealTotal.setScale(2, ROUNDING));
        venta.setMargenBruto(margenBruto);

        // % Margen
        BigDecimal porcentajeMargen = BigDecimal.ZERO;
        if (totalVenta.compareTo(BigDecimal.ZERO) > 0) {
            porcentajeMargen = margenBruto
                    .divide(totalVenta, 4, ROUNDING)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, ROUNDING);
        }
        venta.setPorcentajeMargen(porcentajeMargen);

        return ventaRepository.save(venta);
    }
}
