# Stage 1: Build the application using Maven
FROM maven:3.9.4-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Create the final image
FROM eclipse-temurin:17-jdk-alpine
VOLUME /tmp
EXPOSE 10000

# Copy the built jar from the build stage
COPY --from=build /app/target/geriatric-care-app-1.0.0.jar app.jar

# Run the jar file 
ENTRYPOINT ["java","-Djava.security.egd=file:/dev/./urandom","-jar","/app.jar"]
