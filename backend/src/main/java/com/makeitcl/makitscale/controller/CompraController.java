package com.makeitcl.makitscale.controller;

import com.makeitcl.makitscale.model.Compra;
import com.makeitcl.makitscale.service.CompraService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/compras")
public class CompraController {

    private final CompraService compraService;

    public CompraController(CompraService compraService) {
        this.compraService = compraService;
    }

    @GetMapping
    public ResponseEntity<List<Compra>> listarTodas() {
        return ResponseEntity.ok(compraService.listarTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Compra> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(compraService.buscarPorId(id));
    }

    /**
     * Registrar una compra completa.
     * Dispara automáticamente: cálculo de subtotales, actualización de stock
     * y recálculo de CPP por cada línea.
     */
    @PostMapping
    public ResponseEntity<Compra> registrarCompra(@RequestBody Compra compra) {
        if(compra.getDetalles() != null && !compra.getDetalles().isEmpty()) {
            System.out.println("====== DEBUG COMPRA: ID RECIBIDO DEL PRODUCTO: " + compra.getDetalles().get(0).getProducto().getId() + " ======");
        }
        Compra registrada = compraService.registrarCompra(compra);
        return ResponseEntity.status(HttpStatus.CREATED).body(registrada);
    }
}
