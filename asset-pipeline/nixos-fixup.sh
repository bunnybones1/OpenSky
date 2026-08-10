#!/usr/bin/env bash
if ! type "patchelf" &>/dev/null; then
  # "no patchelf in path! We must not be in nix-shell, bailing on NixOS patch."
  exit 0
fi
if ! type "nix-build" &>/dev/null; then
  # "no nix-build in path! We must not be in nix-compatible environment, bailing on NixOS patch."
  exit 0
fi

uname_result="$(uname -a)"

unset LD_LIBRARY_PATH

if [[ "$uname_result" = *"NixOS"* ]]; then
  echo "Running on NixOS!"
  echo "Patching crunch binary..."
  patchelf --set-interpreter "$(cat $(echo $(nix-build --no-out-link -E 'with import <nixpkgs> {}; pkgs.stdenv.cc')/nix-support/dynamic-linker))" ./node_modules/@arilotter/texture-compressor/bin/linux/crunch
  patchelf --set-rpath "$(echo $(nix-build --no-out-link -E 'with import <nixpkgs> {}; pkgs.stdenv.cc.cc.lib')/lib)" ./node_modules/@arilotter/texture-compressor/bin/linux/crunch

  echo "Patching astcenc binary..."
  patchelf --set-interpreter "$(cat $(echo $(nix-build --no-out-link -E 'with import <nixpkgs> {}; pkgs.stdenv.cc')/nix-support/dynamic-linker))" ./node_modules/@arilotter/texture-compressor/bin/linux/astcenc
  patchelf --set-rpath "$(echo $(nix-build --no-out-link -E 'with import <nixpkgs> {}; pkgs.stdenv.cc.cc.lib')/lib)" ./node_modules/@arilotter/texture-compressor/bin/linux/astcenc
fi
