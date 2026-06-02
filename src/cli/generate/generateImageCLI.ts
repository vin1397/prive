import { generateImage } from '../../image/generate';

export async function generateImageCLI(prompt: string): Promise<void> {
  try {
    const imagePath = await generateImage(prompt);
    console.log(`Generated image saved to ${imagePath}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('An unexpected error occurred');
    }
  }
}