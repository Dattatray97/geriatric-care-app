package com.geriatriccare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GeriatricCareApplication {

    public static void main(String[] args) {
        SpringApplication.run(GeriatricCareApplication.class, args);
        System.out.println("============================================================");
        System.out.println("  🏥 Geriatric Care Application Started Successfully!");
        System.out.println("  🗄️  Database: PostgreSQL (geriatric_care_db)");
        System.out.println("  📱 Dashboard: http://localhost:8088/index.html");
        System.out.println("  🔗 API: http://localhost:8088/api/v1/health");
        System.out.println("  📋 Care Orders API: http://localhost:8088/api/v1/care-orders");
        System.out.println("  ✅ Tasks API: http://localhost:8088/api/v1/tasks");
        System.out.println("  🔌 WebSocket: ws://localhost:8088/ws");
        System.out.println("============================================================");
    }
}