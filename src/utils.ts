import { exec } from 'node:child_process'
import c from 'ansis'
import { sync as commandExists } from 'command-exists'

type lineInsert = 'BEFORE' | 'AFTER'

export function execZsh(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`zsh -ic "${cmd}"`, { shell: '/bin/zsh' }, (error, stdout) => {
      if (error) {
        reject(error)
      } else {
        resolve(stdout)
      }
    })
  })
}

export async function isCmdExists(cmd: string): Promise<boolean> {
  if (commandExists(cmd)) {
    return true
  }

  try {
    await execZsh(cmd)
    return true
  } catch {
    return false
  }
}

export function newSection(name: string, lineSpace: lineInsert[] = ['BEFORE']) {
  if (lineSpace.includes('BEFORE')) {
    console.log('')
  }
  console.log(c.bold.cyan('-----------------------------------------'))
  console.log(c.bold.cyan(name))
  console.log(c.bold.cyan('-----------------------------------------'))
  if (lineSpace.includes('AFTER')) {
    console.log()
  }
}

export function newSubSection(name: string, lineSpace: lineInsert[] = ['BEFORE']) {
  if (lineSpace.includes('BEFORE')) {
    console.log('')
  }
  console.log(c.magentaBright('-----------------------------------------'))
  console.log(c.magentaBright(name))
  console.log(c.magentaBright('-----------------------------------------'))
  if (lineSpace.includes('AFTER')) {
    console.log()
  }
}

export function debugInfo(title: string, content?: any, lineSpace: lineInsert[] = ['BEFORE']) {
  if (lineSpace.includes('BEFORE')) {
    console.log('')
  }
  console.log(c.bold.green(`-- DEBUG: ${c.bold.white(title)} ----------`))
  if (content) {
    console.log(content)
    console.log(c.bold.green('-'.repeat(title.length + 10 + 11)))
  }
  if (lineSpace.includes('AFTER')) {
    console.log()
  }
}
