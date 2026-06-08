package com.geriatriccare.controller;

import com.geriatriccare.model.CareOrder;
import com.geriatriccare.service.CareOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.lang.NonNull;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/care-orders")
@CrossOrigin(origins = "*")
public class CareOrderController {

    @Autowired
    private CareOrderService careOrderService;

    @PostMapping
    public ResponseEntity<CareOrder> createOrder(@RequestBody @NonNull CareOrder order) {
        CareOrder savedOrder = careOrderService.createOrder(order);
        return ResponseEntity.ok(savedOrder);
    }

    @GetMapping
    public ResponseEntity<List<CareOrder>> getAllOrders() {
        return ResponseEntity.ok(careOrderService.getAllOrders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CareOrder> getOrderById(@PathVariable @NonNull Long id) {
        CareOrder order = careOrderService.getOrderById(id);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(order);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<CareOrder> updateStatus(@PathVariable @NonNull Long id, @RequestBody Map<String, String> body) {
        CareOrder updated = careOrderService.updateOrderStatus(id, body.get("status"));
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CareOrder> updateOrder(@PathVariable @NonNull Long id, @RequestBody CareOrder orderData) {
        CareOrder updated = careOrderService.updateOrder(id, orderData);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteOrder(@PathVariable @NonNull Long id) {
        careOrderService.deleteOrder(id);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Order deleted successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<CareOrder>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(careOrderService.getOrdersByStatus(status));
    }
}
