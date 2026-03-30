package com.makeitcl.makitscale.repository;

import com.makeitcl.makitscale.model.Producto;
import com.makeitcl.makitscale.model.TipoProducto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {
    Optional<Producto> findByCodigoAndEmpresaId(String codigo, Long empresaId);
    List<Producto> findByTipoProductoAndEmpresaId(TipoProducto tipoProducto, Long empresaId);
    List<Producto> findByActivoTrueAndEmpresaId(Long empresaId);
    List<Producto> findByEmpresaId(Long empresaId);
    Optional<Producto> findByIdAndEmpresaId(Long id, Long empresaId);
}
