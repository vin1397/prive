import { editImage } from '../image/edit';

export async function editImageCLI(imagePath: string): Promise<void> {
  try {
    const editedImagePath = await editImage(imagePath, 'Edit this image');
    console.log(`Edited image saved to ${editedImagePath}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('An unexpected error occurred');
    }
  }
}