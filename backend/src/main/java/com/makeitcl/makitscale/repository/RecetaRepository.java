package com.makeitcl.makitscale.repository;

import com.makeitcl.makitscale.model.Receta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecetaRepository extends JpaRepository<Receta, Long> {
    List<Receta> findByActivaTrueAndEmpresaId(Long empresaId);
    List<Receta> findByEmpresaId(Long empresaId);
    java.util.Optional<Receta> findByIdAndEmpresaId(Long id, Long empresaId);
}
