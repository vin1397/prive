import { generate } from './comfyui';

export async function generateImage(prompt: string): Promise<string> {
  return await generate(prompt);
}