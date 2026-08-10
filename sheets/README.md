# Design Data Sheets App

# Github Permissions needed:
OpenSky Repo
card-movement-simulator
arcadeum-state

# Running

## Windows

Double-click the `run.bat` file.

## MacOS

0. Install Nix - `curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install` . Optionally, also install `direnv`. That'll remove the need to run `nix-shell` manually.
1. `$ nix-shell` in the root of the OpenSky repo to enter a Nix shell with all required deps.
2. `$ pnpm dev` in the `sheets` directory to run the app.

## NixOS

0. Optionally, install `direnv` - That'll remove the need to run `nix-shell` manually.
1. `$ nix-shell` in the root of the OpenSky repo to enter a Nix shell with all required deps.
2. `$ pnpm dev` in the `sheets` directory to run the app.

## Linux (non-nixos)

0. Install Nix - https://nixos.org/download#nix-install-linux . Optionally, also install `direnv`. That'll remove the need to run `nix-shell` manually.
1. `$ nix-shell` in the root of the OpenSky repo to enter a Nix shell with all required deps.
2. `$ pnpm dev` in the `sheets` directory to run the app.
