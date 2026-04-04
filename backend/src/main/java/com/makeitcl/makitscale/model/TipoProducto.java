package com.makeitcl.makitscale.model;

/**
 * Tipo de producto en el sistema de costeo.
 */
public enum TipoProducto {
    /** Materia prima: se compra y se usa como ingrediente */
    MATERIA_PRIMA,
    /** Empaques e insumos periféricos para envasado */
    EMPAQUE_INSUMO,
    /** Producto terminado: resultado de una receta de producción */
    PRODUCTO_TERMINADO
}
