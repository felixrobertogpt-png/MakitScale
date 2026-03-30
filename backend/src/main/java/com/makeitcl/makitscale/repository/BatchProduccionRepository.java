package com.makeitcl.makitscale.repository;

import com.makeitcl.makitscale.model.BatchProduccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BatchProduccionRepository extends JpaRepository<BatchProduccion, Long> {

    List<BatchProduccion> findByEmpresaIdOrderByCreatedAtDesc(Long empresaId);

    Optional<BatchProduccion> findByNumeroLoteAndEmpresaId(String numeroLote, Long empresaId);
    
    Optional<BatchProduccion> findByIdAndEmpresaId(Long id, Long empresaId);
}
