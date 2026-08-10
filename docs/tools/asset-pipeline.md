# The Asset Pipeline Tool

This is a CLI tool that turns high quality assets into webapp/game/third-party specific assets, at various formats and compressions, for use by end-users.

It's implemented in Typescript.

It is largely a framework that allows us to define tasks, and define the hierarchy of those tasks, so that any task that needs to run before any other task, does so automatically.

Tasks, in general, have an output, and one or more inputs.

Due to the sheer amount of assets that we have, the tool uses two layers of hash-caching to avoid unnecessary work.

For any asset, there is a command with inputs that produces it. The command, and the inputs, are hashed together. An asset will only (re)generate if the command hash is different than the last time it ran for that asset.

Outputs from earlier commands can be inputs for later commands.

Commandline tools make ideal commands because
- They generally run in their own thread, great for parallelism
- They are usually a string with paths to files as the input arguments

Though command-line tools are preferred, custom jobs/tools/functions executed from inside node are supported as well.
- Puppeteer can be used to load a copy of the game engine to generate images and even videos!

The pipeline can be run entirely, for a single task (with prerequisites automatically), or for a single task skipping prerequisites.

The results of a successful run are written to `OpenSky-assets`:
- the assets
- the results hashes
- the command hashes

Usually followed up by running the [asset deployer](./asset-deployer.md)

Note:
- Today the pipeline is run with direct inputs in `OpenSky-assets`.
- If the community later adopts a separate asset-master/source repo again, this tool can still be used as long as it produces the same output structure in `OpenSky-assets`.
