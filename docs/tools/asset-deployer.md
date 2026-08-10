# Asset Deployer

Normally run after running the [Asset Pipeline](./asset-pipeline.md).

Deploying assets is done via a make script which does the following:
- locally generates an MD5 hash for every asset
- Stores every file path, and the MD5 hash of its contents, in a map, in a JSON file.
- uploads every file with the first 8 characters of its MD5 hash as a prefixed path
- for the webapp, and the game, compresses a subset of the MD5 map as a tree with in-place encoding, so that you can query the MD5 hash of any asset without needing to store the decompressed map in memory.
- saves a copy of the game and webapp manifest trees with an MD5 Hash of themselves in their filenames.

Once assets are uploaded and manifests are ready, take note of the MD5 hashes in the manifest filenames and update the respective hashes in the game and webapp config files.

## Usage
```
cd OpenSky-assets
make deploy
```

## Design rationale

- We have a lot of assets
- Users have large caches of our assets on their devices
- We update a small percentage of our assets, frequently

For this reason, on average, each month, only about 5 to 10 percent of our assets are changed or new.

By uploading every version of every asset with a hash prefix, and maintaining manifests which reflect unique combinations of assets, we allow users to maintain and use their caches assets efficiently.