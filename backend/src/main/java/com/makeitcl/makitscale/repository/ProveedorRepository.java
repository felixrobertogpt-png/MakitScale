package com.makeitcl.makitscale.repository;

import com.makeitcl.makitscale.model.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {
    Optional<Proveedor> findByRutAndEmpresaId(String rut, Long empresaId);
    List<Proveedor> findByActivoTrueAndEmpresaId(Long empresaId);
    List<Proveedor> findByEmpresaId(Long empresaId);
    Optional<Proveedor> findByIdAndEmpresaId(Long id, Long empresaId);
}
