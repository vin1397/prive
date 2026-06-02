import { edit } from './comfyui';

export async function editImage(imagePath: string, prompt: string): Promise<string> {
  return await edit(imagePath, prompt);
}