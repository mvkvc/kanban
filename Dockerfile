FROM oven/bun:1 AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/bun.lock ./

RUN bun install --frozen-lockfile

COPY frontend/ ./

RUN bun run build

FROM rust:1.88 AS rust-builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Cargo.toml Cargo.lock ./

COPY src/ ./src/
COPY migrations/ ./migrations/
COPY diesel.toml ./

COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 appuser

WORKDIR /app

COPY --from=rust-builder /app/target/release/kanban /app/kanban

COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

ENV RUST_LOG=info

CMD ["./kanban"]
