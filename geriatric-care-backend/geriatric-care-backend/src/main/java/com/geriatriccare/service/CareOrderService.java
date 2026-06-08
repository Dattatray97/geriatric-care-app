package com.geriatriccare.service;

import com.geriatriccare.model.CareOrder;
import com.geriatriccare.repository.CareOrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.lang.NonNull;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CareOrderService {

    private static final Logger logger = LoggerFactory.getLogger(CareOrderService.class);

    @Autowired
    private CareOrderRepository careOrderRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public CareOrder createOrder(@NonNull CareOrder order) {
        CareOrder savedOrder = careOrderRepository.save(order);
        logger.info("Care order saved to PostgreSQL: {}", savedOrder);

        // Broadcast via WebSocket for live updates
        Map<String, Object> wsMessage = new HashMap<>();
        wsMessage.put("type", "new_care_order");
        wsMessage.put("order", savedOrder);
        wsMessage.put("message", "New care order: " + savedOrder.getOrderType() + " for " + savedOrder.getPatientName());
        messagingTemplate.convertAndSend("/topic/care-orders", wsMessage);

        logger.info("WebSocket broadcast sent for care order: {}", savedOrder.getId());
        return savedOrder;
    }

    public List<CareOrder> getAllOrders() {
        return careOrderRepository.findAllByOrderByCreatedAtDesc();
    }

    public CareOrder getOrderById(@NonNull Long id) {
        return careOrderRepository.findById(id).orElse(null);
    }

    public CareOrder updateOrderStatus(@NonNull Long id, String status) {
        CareOrder order = careOrderRepository.findById(id).orElse(null);
        if (order != null) {
            order.setStatus(status);
            CareOrder updated = careOrderRepository.save(order);

            // Broadcast status update via WebSocket
            Map<String, Object> wsMessage = new HashMap<>();
            wsMessage.put("type", "order_status_update");
            wsMessage.put("order", updated);
            wsMessage.put("message", "Order #" + updated.getId() + " status changed to: " + status);
            messagingTemplate.convertAndSend("/topic/care-orders", wsMessage);

            return updated;
        }
        return null;
    }

    public CareOrder updateOrder(@NonNull Long id, CareOrder orderData) {
        CareOrder order = careOrderRepository.findById(id).orElse(null);
        if (order != null) {
            if (orderData.getPatientName() != null) order.setPatientName(orderData.getPatientName());
            if (orderData.getOrderType() != null) order.setOrderType(orderData.getOrderType());
            if (orderData.getDescription() != null) order.setDescription(orderData.getDescription());
            if (orderData.getStatus() != null) order.setStatus(orderData.getStatus());
            if (orderData.getPriority() != null) order.setPriority(orderData.getPriority());
            CareOrder updated = careOrderRepository.save(order);

            // Broadcast update via WebSocket
            Map<String, Object> wsMessage = new HashMap<>();
            wsMessage.put("type", "order_updated");
            wsMessage.put("order", updated);
            wsMessage.put("message", "Order #" + updated.getId() + " updated");
            messagingTemplate.convertAndSend("/topic/care-orders", wsMessage);

            return updated;
        }
        return null;
    }

    public void deleteOrder(@NonNull Long id) {
        careOrderRepository.deleteById(id);

        // Broadcast deletion via WebSocket
        Map<String, Object> wsMessage = new HashMap<>();
        wsMessage.put("type", "order_deleted");
        wsMessage.put("orderId", id);
        messagingTemplate.convertAndSend("/topic/care-orders", wsMessage);
    }

    public List<CareOrder> getOrdersByStatus(String status) {
        return careOrderRepository.findByStatus(status);
    }
}
