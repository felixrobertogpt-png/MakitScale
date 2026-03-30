package com.makeitcl.makitscale.controller;

import com.makeitcl.makitscale.model.Receta;
import com.makeitcl.makitscale.service.RecetaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recetas")
public class RecetaController {

    private final RecetaService recetaService;

    public RecetaController(RecetaService recetaService) {
        this.recetaService = recetaService;
    }

    @GetMapping
    public ResponseEntity<List<Receta>> listarTodas() {
        return ResponseEntity.ok(recetaService.listarActivas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Receta> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(recetaService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Receta> crear(@Valid @RequestBody Receta receta) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recetaService.crear(receta));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Receta> actualizar(@PathVariable Long id,
                                              @Valid @RequestBody Receta receta) {
        return ResponseEntity.ok(recetaService.actualizar(id, receta));
    }

    /**
     * 🎯 Endpoint estrella: Costeo de receta en tiempo real.
     * Usa el CPP vigente de cada ingrediente para calcular
     * el costo total y unitario al instante.
     */
    @GetMapping("/{id}/costeo")
    public ResponseEntity<Map<String, Object>> costearReceta(@PathVariable Long id) {
        return ResponseEntity.ok(recetaService.calcularCostoReceta(id));
    }
}
