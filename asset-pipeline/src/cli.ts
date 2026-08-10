import { program } from 'commander'

program.option('--lib <type>', 'use card library config: prod|design', 'prod')
program.option(
  '--task <task>',
  'run a specific task (or comma seperated list)',
  (value: string) => value.split(',')
)
program.option('--force', 'ignore cache and force task(s) to run')
program.option('--pretend', 'pretend to run tasks')
program.option('--list', 'lists all tasks')
program.option('--log-level <logLevel>', 'set log level', '3')
program.option(
  '--skip-commands',
  'only update command block hashes, without running commands.'
)
program.option('--direct', 'only run task, skip prerequisite tasks.')
program.option(
  '--check',
  'only check if task needs to be run, without running commands.\nreturns a non-zero exit code if any (specified or dependency) task needs to be run.'
)
program.option('--sound', 'enable extremely loud british man sound alerts')
program.option('--moresound', 'make the british man tell you more things')
program.option(
  '--interactive-check',
  'ask for each file/task, if it should be run.'
)

program.parse(process.argv)
