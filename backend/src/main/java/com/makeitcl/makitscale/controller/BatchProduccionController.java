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
        
        com.makeitcl.makitscale.model.TipoContencion tipo = null;
        if (body.containsKey("tipoContencion")) {
            tipo = com.makeitcl.makitscale.model.TipoContencion.valueOf(body.get("tipoContencion").toString());
        }

        java.util.Map<Long, BigDecimal> empaquesMap = new java.util.HashMap<>();
        if (body.containsKey("empaques")) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> empaquesList = (List<Map<String, Object>>) body.get("empaques");
            for (Map<String, Object> item : empaquesList) {
                Long pId = Long.valueOf(item.get("productoId").toString());
                BigDecimal q = new BigDecimal(item.get("cantidad").toString());
                empaquesMap.put(pId, q);
            }
        }

        BatchProduccion batch = batchService.producir(recetaId, multiplicador, costosOcultos, tipo, empaquesMap);
        return ResponseEntity.status(HttpStatus.CREATED).body(batch);
    }
}
