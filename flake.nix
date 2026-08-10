{
  inputs = {
    nixpkgs.url = "nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";

    # for legacy nix shell
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        wrg = pkgs.writeScriptBin "wrg" ''
          #!${pkgs.stdenv.shell}

          seenReplace=""

          for arg in "$@"; do
            if test "$arg" == '--replace' -o "$arg" == '-r'; then
              seenReplace='true'
              break
            fi
          done

          if test -z "$seenReplace"; then
            echo 'You must specify the --replace or -r argument!'
            exit 1
          fi

          currentFile=""
          didChange=""

          (
            ${pkgs.ripgrep}/bin/rg \
              --context 999999 \
              --with-filename --heading --null \
              --color=never --no-line-number \
              --max-columns=0 \
              "$@"
            echo -e '\n\0'
          ) |
          {
            while IFS= read -r -d "" part; do
              if test -n "$currentFile"; then
                echo "$currentFile"
                (sed '$d' | sed '$d') <<< "$part" > "$currentFile"
                didChange='true'
              fi
              currentFile="$(tail -n 1 <<< "$part")"
            done

            if test -z "$didChange"; then
              echo "No files were changed."
              exit 1
            fi
          }
        '';


        # webkitgtk is broken to build on MacOS,
        # but MacOS has a System built-in WebKit.
        darwinhacks =
          with pkgs; (if stdenv.isDarwin then [ darwin.apple_sdk.frameworks.WebKit ] else [ webkitgtk ]);

        libraries = with pkgs;[
          # For sheets app, tauri. 
          gtk3
          cairo
          gdk-pixbuf
          glib
          dbus
          openssl_3
          librsvg

          # fixes node-canvas libuuid missing.
          libuuid

          # Not sure - some node stuff, been long-time deps of repo.
          zlib
        ] ++ darwinhacks;


        packages = with pkgs; [
          ## Languages!
          (rust-bin.stable.latest.default.override {
            targets = [ "wasm32-unknown-unknown" ];
          })
          go
          nodejs_18
          nodejs_18.pkgs.pnpm

          # Dependencies for `pnpm bootstrap` in repo
          pixman
          pkg-config
          openssl
          cairo
          pango
          libjpeg
          patchelf # for nixos patching script in asset pipeline

          # For interacting with database & psql command
          postgresql_14

          # For asset pipeline
          imagemagick # for converting videos
          ffmpeg # for converting audio
          sox # also for converting audio
          pngquant # quantize pngs
          freetts # "welcome" and "problem encountered" with `--sound` flag

          # For updating manifests in asset pipeline
          wrg
          jq

          # devtool :)
          google-cloud-sdk

          # for js bindings / game state
          binaryen # for wasm-opt
          wasm-pack # for building bindings
          indent # for formatting code

          # for tauri sheet
          curl
          wget
          openssl_3
          dbus
          gtk3
          libsoup
          librsvg
        ] ++ darwinhacks;
      in
      {
        devShell = pkgs.mkShell {
          buildInputs = packages;

          # as well as providing other libs,
          # fixes texture-compressor bundled `crunch` missing libstdc++
          shellHook =
            ''
              export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH
              export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/"
            '';
        };
      });
}
