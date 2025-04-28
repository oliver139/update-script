import { execZsh } from '@/utils'

export async function pnpmUpdate(): Promise<void> {
  // Fetching global dependencies
  const output = JSON.parse(await execZsh(`pnpm list -g --json`)) as Record<string, unknown>[]
  const deps = Object.keys(output[0].dependencies as Record<string, Record<string, string>>)

  // Performing pnpm self-update and adding global dependencies
  await execZsh(`pnpm self-update && pnpm add -g ${deps.join(' ')}`)
}
