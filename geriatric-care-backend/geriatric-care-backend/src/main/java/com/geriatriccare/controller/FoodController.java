package com.geriatriccare.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/food")
@CrossOrigin(origins = "*")
public class FoodController {

    @GetMapping("/vendors")
    public ResponseEntity<List<Map<String, Object>>> getNearbyVendors() {
        List<Map<String, Object>> vendors = new ArrayList<>();
        
        // Simulate nearby food vendors
        vendors.add(Map.of(
            "id", 1,
            "name", "Healthy Meals Delivery",
            "address", "456 Health St, Downtown",
            "rating", 4.8,
            "deliveryTime", "15-30 minutes",
            "deliveryFee", 2.99,
            "specialties", Arrays.asList("Diabetic-friendly", "Low-sodium", "Pureed meals"),
            "isOpen", true
        ));
        
        vendors.add(Map.of(
            "id", 2,
            "name", "Comfort Kitchen",
            "address", "789 Home Ave, Midtown",
            "rating", 4.5,
            "deliveryTime", "20-40 minutes",
            "deliveryFee", 3.50,
            "specialties", Arrays.asList("Soft foods", "Familiar recipes", "Home-style"),
            "isOpen", true
        ));
        
        return ResponseEntity.ok(vendors);
    }

    @GetMapping("/menu")
    public ResponseEntity<Map<String, Object>> getFoodMenu() {
        Map<String, Object> menu = new HashMap<>();
        
        List<Map<String, Object>> recommended = Arrays.asList(
            Map.of(
                "id", 1,
                "name", "Mediterranean Salad",
                "description", "Fresh vegetables, olive oil, feta cheese, and herbs",
                "price", 12.99,
                "calories", 320,
                "ingredients", Arrays.asList("Lettuce", "Tomatoes", "Cucumbers", "Feta", "Olive Oil"),
                "isDiabeticFriendly", true,
                "isLowSodium", true,
                "image", "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=150&h=150&fit=crop"
            ),
            Map.of(
                "id", 2,
                "name", "Grilled Salmon",
                "description", "Fresh Atlantic salmon with steamed vegetables and brown rice",
                "price", 18.99,
                "calories", 450,
                "ingredients", Arrays.asList("Salmon", "Broccoli", "Carrots", "Brown Rice", "Lemon"),
                "isDiabeticFriendly", true,
                "isLowSodium", false,
                "image", "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=150&h=150&fit=crop"
            ),
            Map.of(
                "id", 3,
                "name", "Chicken and Vegetable Soup",
                "description", "Homemade chicken soup with soft vegetables and noodles",
                "price", 10.99,
                "calories", 280,
                "ingredients", Arrays.asList("Chicken", "Carrots", "Celery", "Noodles", "Broth"),
                "isDiabeticFriendly", true,
                "isLowSodium", true,
                "image", "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=150&h=150&fit=crop"
            )
        );
        
        List<Map<String, Object>> healthyOptions = Arrays.asList(
            Map.of(
                "id", 4,
                "name", "Quinoa Bowl",
                "description", "Protein-rich quinoa with roasted vegetables",
                "price", 14.99,
                "calories", 380,
                "ingredients", Arrays.asList("Quinoa", "Sweet Potato", "Spinach", "Chickpeas"),
                "isDiabeticFriendly", true,
                "isLowSodium", true,
                "image", "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=150&h=150&fit=crop"
            )
        );
        
        menu.put("recommended", recommended);
        menu.put("healthyOptions", healthyOptions);
        menu.put("lastUpdated", LocalDateTime.now());
        
        return ResponseEntity.ok(menu);
    }

    @PostMapping("/order")
    public ResponseEntity<Map<String, Object>> placeOrder(@RequestBody Map<String, Object> orderRequest) {
        Map<String, Object> response = new HashMap<>();
        
        // Simulate order processing
        String orderId = "ORD-" + System.currentTimeMillis();
        String estimatedDelivery = "30-45 minutes";
        
        response.put("orderId", orderId);
        response.put("status", "confirmed");
        response.put("estimatedDelivery", estimatedDelivery);
        response.put("totalAmount", orderRequest.get("totalAmount"));
        response.put("confirmationCode", "CONF-" + new Random().nextInt(999999));
        response.put("orderTime", LocalDateTime.now());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/orders")
    public ResponseEntity<List<Map<String, Object>>> getOrderHistory() {
        List<Map<String, Object>> orders = Arrays.asList(
            Map.of(
                "id", "ORD-12345",
                "date", LocalDateTime.now().minusDays(1),
                "restaurant", "Healthy Meals Delivery",
                "items", "Mediterranean Salad, Grilled Salmon",
                "total", 31.98,
                "status", "delivered"
            ),
            Map.of(
                "id", "ORD-12344",
                "date", LocalDateTime.now().minusDays(3),
                "restaurant", "Comfort Kitchen",
                "items", "Chicken Soup, Sandwich",
                "total", 18.50,
                "status", "delivered"
            )
        );
        
        return ResponseEntity.ok(orders);
    }
}