package com.makeitcl.makitscale.service;

import com.makeitcl.makitscale.model.Proveedor;
import com.makeitcl.makitscale.model.Empresa;
import com.makeitcl.makitscale.repository.ProveedorRepository;
import com.makeitcl.makitscale.security.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio CRUD para Proveedores.
 */
@Service
@Transactional
public class ProveedorService {

    private final ProveedorRepository proveedorRepository;

    public ProveedorService(ProveedorRepository proveedorRepository) {
        this.proveedorRepository = proveedorRepository;
    }

    public List<Proveedor> listarTodos() {
        return proveedorRepository.findByEmpresaId(TenantContext.getCurrentTenant());
    }

    public List<Proveedor> listarActivos() {
        return proveedorRepository.findByActivoTrueAndEmpresaId(TenantContext.getCurrentTenant());
    }

    public Proveedor buscarPorId(Long id) {
        return proveedorRepository.findByIdAndEmpresaId(id, TenantContext.getCurrentTenant())
                .orElseThrow(() -> new RuntimeException("Proveedor no encontrado con ID: " + id));
    }

    public Proveedor crear(Proveedor proveedor) {
        Empresa e = new Empresa();
        e.setId(TenantContext.getCurrentTenant());
        proveedor.setEmpresa(e);
        return proveedorRepository.save(proveedor);
    }

    public Proveedor actualizar(Long id, Proveedor datosActualizados) {
        Proveedor existente = buscarPorId(id);
        existente.setRut(datosActualizados.getRut());
        existente.setRazonSocial(datosActualizados.getRazonSocial());
        existente.setContacto(datosActualizados.getContacto());
        existente.setEmail(datosActualizados.getEmail());
        existente.setTelefono(datosActualizados.getTelefono());
        existente.setActivo(datosActualizados.getActivo());
        return proveedorRepository.save(existente);
    }
}
