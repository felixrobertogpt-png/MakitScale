package com.makeitcl.makitscale.controller;

import com.makeitcl.makitscale.model.BatchProduccion;
import com.makeitcl.makitscale.service.BatchProduccionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/produccion")
public class BatchProduccionController {

    private final BatchProduccionService batchService;

    public BatchProduccionController(BatchProduccionService batchService) {
        this.batchService = batchService;
    }

    /**
     * Listar todos los lotes de producción (más recientes primero).
     */
    @GetMapping
    public ResponseEntity<List<BatchProduccion>> listarTodos() {
        return ResponseEntity.ok(batchService.listarTodos());
    }

    /**
     * Obtener detalle de un lote específico.
     */
    @GetMapping("/{id}")
    public ResponseEntity<BatchProduccion> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(batchService.buscarPorId(id));
    }

    /**
     * 🎯 Producir un lote.
     *
     * Body esperado:
     * {
     *   "recetaId": 1,
     *   "multiplicador": 1.0,
     *   "costosOcultos": 50000.00
     * }
     */
    @PostMapping
    public ResponseEntity<BatchProduccion> producir(@RequestBody Map<String, Object> body) {
        Long recetaId = Long.valueOf(body.get("recetaId").toString());
        BigDecimal multiplicador = new BigDecimal(
                body.getOrDefault("multiplicador", "1").toString()
        );
        BigDecimal costosOcultos = new BigDecimal(
                body.getOrDefault("costosOcultos", "0").toString()
        );

        BatchProduccion batch = batchService.producir(recetaId, multiplicador, costosOcultos);
        return ResponseEntity.status(HttpStatus.CREATED).body(batch);
    }
}
