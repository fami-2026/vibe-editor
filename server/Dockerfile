FROM gradle:8.14-jdk21 AS build

WORKDIR /app
COPY ./settings.gradle .
COPY ./build.gradle .
COPY ./gradle ./gradle
COPY ./src ./src

RUN gradle --no-daemon bootJar

FROM eclipse-temurin:21-jre-jammy

WORKDIR /workspace
COPY --from=build /app/build/libs/vge-server.jar vge-server.jar

CMD ["java", "-jar", "vge-server.jar"]
