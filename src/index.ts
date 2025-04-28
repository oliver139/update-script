#!/usr/bin/env node
import { exit } from 'node:process'
import { Command } from '@commander-js/extra-typings'
import c from 'ansis'
import logUpdate from 'log-update'
import yesno from 'yesno'
import { version } from '../package.json'
import { homebrewUpdate, omzUpdate, pnpmUpdate } from './updates'
import { isCmdExists, newSection } from './utils'

// #region : Read the command
const program = new Command()
  .name('my-update')
  .option('-y, --yes', 'Skip confirmation')
  // .option('-d, --debug', 'Enable debug mode')
  .version(version, '-v, --version', 'Show version')
  .helpOption('-h, --help', 'Show help')
  .showHelpAfterError()
program.parse()
// #endregion

const options = program.opts()

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
function updatingMsg() {
  const frame = frames[index = ++index % frames.length]
  logUpdate(Object.entries(cmds).map(([cmdName, { state }]) => {
    return `Updating ${cmdName.padEnd(maxCmdLength + 3, '.')} ${state === undefined ? frame : state ? c.green`Done ✅` : c.red`Fail ❌`}`
  }).join('\n'))
}
const updateLogId = setInterval(updatingMsg, 250)
let successResCount = 0
updatingMsg()
await Promise.allSettled(Object.values(cmds).map(({ update: updateCmd }, index) => updateCmd().then(() => {
  successResCount++
  Object.values(cmds)[index].state = true
}).catch(() => {
  Object.values(cmds)[index].state = false
})))
clearInterval(updateLogId)
updatingMsg()
logUpdate.done()
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
// #endregion
