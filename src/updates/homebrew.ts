import { execZsh } from '@/utils'

export async function homebrewUpdate(): Promise<void> {
  await execZsh('brew update')
}
