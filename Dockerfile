FROM rust:1.76 as build
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/target/release/agent-decision-gate /app/agent-decision-gate
COPY config /app/config
ENV BIND_ADDR=0.0.0.0:8080
EXPOSE 8080
CMD ["/app/agent-decision-gate"]
