package com.makeitcl.makitscale.controller;

import com.makeitcl.makitscale.model.Venta;
import com.makeitcl.makitscale.service.VentaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ventas")
public class VentaController {

    private final VentaService ventaService;

    public VentaController(VentaService ventaService) {
        this.ventaService = ventaService;
    }

    @GetMapping
    public ResponseEntity<List<Venta>> listarTodas() {
        return ResponseEntity.ok(ventaService.listarTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Venta> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(ventaService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Venta> registrarVenta(@Valid @RequestBody Venta venta) {
        Venta registrada = ventaService.registrarVenta(venta);
        return ResponseEntity.status(HttpStatus.CREATED).body(registrada);
    }
}
