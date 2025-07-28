{
  inputs = {
    nixpkgs.url     = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, fenix, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ fenix.overlays.default ];
        };
      in
      {
        devShells.default = with pkgs; mkShell {
          buildInputs = [
            (fenix.packages.${system}.stable.withComponents [
              "cargo"
              "clippy"
              "rust-src"
              "rustc"
              "rustfmt"
            ])
            fenix.packages.${system}.rust-analyzer
            pkg-config
            openssl
            postgresql
            sqlite
            bun
          ];
          shellHook = ''
            export TMPDIR="/tmp"
            export LD_LIBRARY_PATH=${pkgs.postgresql.lib}/lib:${pkgs.sqlite.out}/lib:$LD_LIBRARY_PATH
          '';
        };
      }
    );
}
