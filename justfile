mod frontend

help:
    @just --list

deps:
    just frontend deps
    cargo fetch

build: deps
    just frontend build
    cargo build

dev:
    docker-compose up --build

run:
    just frontend build
    RUST_LOG=debug cargo run

clean:
    just frontend clean
    cargo clean
