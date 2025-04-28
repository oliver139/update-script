import { execZsh } from '@/utils'

export async function omzUpdate(): Promise<void> {
  await execZsh('omz update')
}
