package com.geriatriccare.controller;

import com.geriatriccare.model.DailyTask;
import com.geriatriccare.repository.DailyTaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.lang.NonNull;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tasks")
@CrossOrigin(origins = "*")
public class TaskController {

    @Autowired
    private DailyTaskRepository taskRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping
    public ResponseEntity<DailyTask> createTask(@RequestBody Map<String, String> body) {
        String text = body.get("text");
        String patientName = body.get("patientName");
        DailyTask task = new DailyTask(text, patientName);
        DailyTask saved = taskRepository.save(task);

        // Broadcast via WebSocket
        Map<String, Object> wsMessage = new HashMap<>();
        wsMessage.put("type", "new_task");
        wsMessage.put("task", saved);
        messagingTemplate.convertAndSend("/topic/tasks", wsMessage);

        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<DailyTask>> getAllTasks() {
        return ResponseEntity.ok(taskRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/patient/{patientName}")
    public ResponseEntity<List<DailyTask>> getTasksByPatient(@PathVariable String patientName) {
        return ResponseEntity.ok(taskRepository.findByPatientNameOrderByCreatedAtDesc(patientName));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteTask(@PathVariable @NonNull Long id) {
        taskRepository.deleteById(id);

        // Broadcast deletion
        Map<String, Object> wsMessage = new HashMap<>();
        wsMessage.put("type", "task_deleted");
        wsMessage.put("taskId", id);
        messagingTemplate.convertAndSend("/topic/tasks", wsMessage);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Task deleted");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<DailyTask> toggleTask(@PathVariable @NonNull Long id) {
        DailyTask task = taskRepository.findById(id).orElse(null);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }
        task.setCompleted(!task.getCompleted());
        DailyTask updated = taskRepository.save(task);

        // Broadcast update
        Map<String, Object> wsMessage = new HashMap<>();
        wsMessage.put("type", "task_updated");
        wsMessage.put("task", updated);
        messagingTemplate.convertAndSend("/topic/tasks", wsMessage);

        return ResponseEntity.ok(updated);
    }
}

