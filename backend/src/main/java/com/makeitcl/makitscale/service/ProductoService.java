package com.makeitcl.makitscale.service;

import com.makeitcl.makitscale.model.Producto;
import com.makeitcl.makitscale.model.TipoProducto;
import com.makeitcl.makitscale.model.Empresa;
import com.makeitcl.makitscale.repository.ProductoRepository;
import com.makeitcl.makitscale.security.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Servicio de Productos con cálculo de Costo Promedio Ponderado.
 *
 * Fórmula CPP:
 *   NuevoCPP = ((stockAnterior × cppAnterior) + (cantidadComprada × precioUnitario))
 *              / (stockAnterior + cantidadComprada)
 *
 * Toda la aritmética usa BigDecimal con escala 6 y HALF_UP.
 */
@Service
@Transactional
public class ProductoService {

    private static final int SCALE_CPP = 6;
    private static final int SCALE_STOCK = 4;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    private final ProductoRepository productoRepository;

    public ProductoService(ProductoRepository productoRepository) {
        this.productoRepository = productoRepository;
    }

    // --- CRUD ---

    public List<Producto> listarTodos() {
        return productoRepository.findByEmpresaId(TenantContext.getCurrentTenant());
    }

    public List<Producto> listarActivos() {
        return productoRepository.findByActivoTrueAndEmpresaId(TenantContext.getCurrentTenant());
    }

    public List<Producto> listarPorTipo(TipoProducto tipo) {
        return productoRepository.findByTipoProductoAndEmpresaId(tipo, TenantContext.getCurrentTenant());
    }

    public Producto buscarPorId(Long id) {
        return productoRepository.findByIdAndEmpresaId(id, TenantContext.getCurrentTenant())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + id));
    }

    public Producto buscarPorCodigo(String codigo) {
        return productoRepository.findByCodigoAndEmpresaId(codigo, TenantContext.getCurrentTenant())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado con código: " + codigo));
    }

    public Producto crear(Producto producto) {
        if (producto.getStockActual() == null) {
            producto.setStockActual(BigDecimal.ZERO);
        }
        if (producto.getCostoPromedioPonderado() == null) {
            producto.setCostoPromedioPonderado(BigDecimal.ZERO);
        }
        Empresa e = new Empresa();
        e.setId(TenantContext.getCurrentTenant());
        producto.setEmpresa(e);
        return productoRepository.save(producto);
    }

    public Producto actualizar(Long id, Producto datosActualizados) {
        Producto existente = buscarPorId(id);
        existente.setNombre(datosActualizados.getNombre());
        existente.setCodigo(datosActualizados.getCodigo());
        existente.setTipoProducto(datosActualizados.getTipoProducto());
        existente.setUnidadMedida(datosActualizados.getUnidadMedida());
        existente.setActivo(datosActualizados.getActivo());
        return productoRepository.save(existente);
    }

    // --- COSTO PROMEDIO PONDERADO ---

    /**
     * Recalcula el Costo Promedio Ponderado del producto tras una compra.
     *
     * @param productoId     ID del producto
     * @param cantidadNueva  Cantidad comprada (ej: 500 KG)
     * @param precioUnitario Precio unitario de la compra (ej: $1,250.50)
     */
    public void actualizarCostoPromedioPonderado(Long productoId, BigDecimal cantidadNueva, BigDecimal precioUnitario) {
        Producto producto = buscarPorId(productoId);

        BigDecimal stockAnterior = producto.getStockActual();
        BigDecimal cppAnterior = producto.getCostoPromedioPonderado();

        // Valor del inventario existente: stockAnterior × CPP_anterior
        BigDecimal valorInventarioExistente = stockAnterior.multiply(cppAnterior);

        // Valor de la nueva compra: cantidadNueva × precioUnitario
        BigDecimal valorCompraNueva = cantidadNueva.multiply(precioUnitario);

        // Nuevo stock total
        BigDecimal nuevoStock = stockAnterior.add(cantidadNueva);

        // Nuevo CPP = (valorExistente + valorNuevo) / nuevoStock
        BigDecimal nuevoCpp;
        if (nuevoStock.compareTo(BigDecimal.ZERO) == 0) {
            nuevoCpp = BigDecimal.ZERO;
        } else {
            nuevoCpp = valorInventarioExistente.add(valorCompraNueva)
                    .divide(nuevoStock, SCALE_CPP, ROUNDING);
        }

        producto.setStockActual(nuevoStock.setScale(SCALE_STOCK, ROUNDING));
        producto.setCostoPromedioPonderado(nuevoCpp);

        productoRepository.save(producto);
    }
}
