package com.makeitcl.makitscale.repository;

import com.makeitcl.makitscale.model.Venta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VentaRepository extends JpaRepository<Venta, Long> {

    List<Venta> findByEmpresaIdOrderByFechaVentaDesc(Long empresaId);
    
    java.util.Optional<Venta> findByIdAndEmpresaId(Long id, Long empresaId);
}
