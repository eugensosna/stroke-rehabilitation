FROM eclipse-temurin:25-jdk-alpine AS builder
WORKDIR /app

# Copy Gradle wrapper and configuration files first to leverage Docker layer caching
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./

# Make the wrapper executable and download dependencies (cached unless build files change)
RUN chmod +x gradlew
RUN ./gradlew dependencies --no-daemon

# Copy the rest of the application source code
COPY src src

# Build the executable JAR file without running tests
RUN ./gradlew bootJar --no-daemon -x test

# ==========================================
# Stage 2: Runtime Image
# ==========================================
FROM eclipse-temurin:25-jre-alpine

# Run as a non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

WORKDIR /app

# Copy built JAR from the builder stage
COPY --from=builder /app/build/libs/*.jar app.jar

# Expose default Spring Boot port
EXPOSE 8080

# Environment variables for JVM tuning
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
