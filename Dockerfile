FROM rust:1.76 as build
WORKDIR /app
COPY . .
RUN cargo build --release --locked

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 appuser
WORKDIR /app
COPY --from=build /app/target/release/agent-decision-gate /app/agent-decision-gate
COPY config /app/config
RUN mkdir -p /app/data && chown -R appuser:appuser /app
ENV BIND_ADDR=0.0.0.0:8080
ENV RUST_LOG=info
EXPOSE 8080
USER appuser
CMD ["/app/agent-decision-gate"]
