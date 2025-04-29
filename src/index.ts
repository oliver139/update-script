#!/usr/bin/env node
import fs from 'node:fs'
import { join as pathJoin } from 'node:path'
import { env, exit } from 'node:process'
import c from 'ansis'
import cac from 'cac'
import logUpdate from 'log-update'
import yesno from 'yesno'
import { version } from '../package.json'
import { homebrewUpdate, omzUpdate, pnpmUpdate } from './updates'
import { isCmdExists, newSection } from './utils'

// #region : Read the command
const cli = cac('my-update')
cli
  .option('-y, --yes', 'Skip confirmation')
  .option('-l, --log [dir]', 'Log the update result to a file inside <dir>')
  .option('-p, --prefix <string>', 'The prefix of the file name', { default: 'update_' })
  .version(version)
  .help()

const result = cli.parse()

const options = result.options
if (options.v || options.h) {
  exit(0)
}
// #endregion

// #region : Header
console.log(c.bold.blueBright(`\nupdate-script v${version}`))
console.log(c.bold.blueBright('========================================='))

// #endregion

// #region : Check for commands availability
newSection('Check for commands availability')

interface cmdInfo {
  check: string
  update: () => Promise<void>
  state?: boolean
}
const cmds: Record<string, cmdInfo> = {
  'oh-my-zsh': { check: 'omz version', update: omzUpdate },
  'homebrew': { check: 'brew', update: homebrewUpdate },
  'pnpm': { check: 'pnpm', update: pnpmUpdate },
}

const cmdsCount = Object.keys(cmds).length
const maxCmdLength: number = Object.keys(cmds).reduce<number>((result, cmd) => Math.max(result, cmd.length), 0)

const checkResult = await Promise.allSettled(Object.values(cmds).map(({ check }) => isCmdExists(check)))

const availableCmds: string[] = []
checkResult.forEach((result, index) => {
  const cmd = Object.keys(cmds)[index]
  if (result.status === 'fulfilled' && result.value) {
    console.log(`${cmd.padStart(maxCmdLength)}: ${c.green`Available`} ✅`)
    availableCmds.push(cmd)
  } else {
    console.log(`${cmd.padStart(maxCmdLength)}: ${c.red`Not available`} ❌`)
  }
})
// #endregion

// #region : Confirmation
newSection('Update Confirmation')
console.log('The following command(s) will be updated:')
availableCmds.forEach((cmd) => {
  console.log(`${c.yellow`-`} ${cmd}`)
})

if (!options.yes) {
  await yesno({
    question: `${c.bold.yellow(`\nIs that OK?`)} (${c.underline`Y`}/n)`,
    yesValues: ['yes', 'y'],
    noValues: [],
    defaultValue: true,
    invalid: () => {
      newSection('Aborted')
      exit()
    },
  })
}
// #endregion

// #region : Start update
newSection('Start Update')
const frames = ['-', '\\', '|', '/']
let index = 0
const logResult: string[] = []
function updatingMsg() {
  const frame = frames[index = ++index % frames.length]
  logUpdate(Object.entries(cmds).map(([cmdName, { state }]) => {
    return `Updating ${cmdName.padEnd(maxCmdLength + 3, '.')} ${state === undefined ? frame : state ? c.green`Done ✅` : c.red`Fail ❌`}`
  }).join('\n'))
}
const updateLogId = setInterval(updatingMsg, 250)
let successResCount = 0
updatingMsg()
await Promise.allSettled(Object.entries(cmds).map(([cmdName, { update: updateCmd }], index) => updateCmd().then(() => {
  successResCount++
  Object.values(cmds)[index].state = true
  logResult.push(`Update ${cmdName} - OK`)
}).catch(() => {
  Object.values(cmds)[index].state = false
  logResult.push(`Update ${cmdName} - Fail`)
})))
clearInterval(updateLogId)
updatingMsg()
logUpdate.done()
// #endregion

// #region : Log to file if needed
if (options.log) {
  const date = (new Date()).toISOString().split('T')[0].replaceAll('-', '')
  const dir = options.log === true ? `${env.HOME}/my-update-log/` : options.log
  const fileName = `${options.prefix}${date}.txt`
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(pathJoin(dir, fileName), logResult.join('\n'))
}
// #endregion

// #region : Update Done
if (successResCount === 0) {
  console.log(c.bold.red('\n-----------------------------------------'))
  console.log(c.bold.red`Update Fail`)
  console.log(c.bold.red('-----------------------------------------'))
} else if (successResCount === cmdsCount) {
  console.log(c.bold.green('\n-----------------------------------------'))
  console.log(c.bold.green`Update Success`)
  console.log(c.bold.green('-----------------------------------------'))
} else {
  console.log(c.bold.yellow('\n-----------------------------------------'))
  console.log(c.bold.yellow`Update Partly Success`)
  console.log(c.bold.yellow('-----------------------------------------'))
}

exit(0)
// #endregion
