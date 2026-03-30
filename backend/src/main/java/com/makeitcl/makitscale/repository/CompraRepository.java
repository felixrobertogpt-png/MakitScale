package com.makeitcl.makitscale.repository;

import com.makeitcl.makitscale.model.Compra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompraRepository extends JpaRepository<Compra, Long> {
    List<Compra> findByEmpresaId(Long empresaId);
    java.util.Optional<Compra> findByIdAndEmpresaId(Long id, Long empresaId);
}
