# Geriatric Care App (ElderGuard)

A comprehensive healthcare platform for elderly citizens in smart cities.

## 🚀 Live Demo
**[Deploy Link](https://geriatric-care-app.onrender.com)**

## 📖 Overview
The **Geriatric Care App (ElderGuard)** is a robust, scalable, and secure backend application. It is designed to manage healthcare, monitor well-being, and provide real-time alerts (via SMS and Email) for elderly citizens. It's built to integrate seamlessly into a smart city infrastructure.

## 🛠️ Technology Stack
- **Framework**: Spring Boot 3.1.5
- **Language**: Java 17
- **Database**: PostgreSQL (Production) / H2 (Development & Testing)
- **Security**: Spring Security
- **Real-time Communication**: WebSockets
- **Notifications**: Twilio SDK (SMS), Spring Boot Mail (Email)
- **Documentation**: SpringDoc OpenAPI (Swagger UI)
- **Monitoring**: Actuator & Prometheus
- **Containerization**: Docker & Docker Compose

## 🏗️ Architecture & Design
The repository includes several design and architecture diagrams (Draw.io) at the root level:
- `ElderGuard_Architecture.drawio`
- `ElderGuard_Deployment_Diagram.drawio`
- `ElderGuard_ER_Diagram.drawio`
- `ElderGuard_Sequence_Diagram.drawio`
- `ElderGuard_UseCase.drawio`
- `Schema_Diagram.drawio`

## ⚙️ Setup Instructions

### Prerequisites
- Java 17
- Maven
- PostgreSQL (if running locally without Docker)
- Docker & Docker Compose (optional)

### Running Locally
1. Navigate to the backend directory:
   ```bash
   cd geriatric-care-backend/geriatric-care-backend
   ```
2. Build the project using Maven:
   ```bash
   mvn clean install
   ```
3. Run the application:
   ```bash
   mvn spring-boot:run
   ```

### Running with Docker Compose
To easily spin up the backend application alongside a PostgreSQL database, use Docker Compose:
```bash
cd geriatric-care-backend/geriatric-care-backend
docker-compose up -d
```

## 📚 API Documentation
Once the application is running, you can access the interactive API documentation (Swagger UI) via:
`http://localhost:8080/swagger-ui.html` (Assuming default port 8080)
