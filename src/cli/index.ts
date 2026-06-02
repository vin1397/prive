import { Command } from 'commander';
import * as generate from './generate/generateImageCLI';
import * as edit from './edit/editImageCLI';

const program = new Command();

program
  .command('image <prompt>')
  .description('Generate an image using ComfyUI')
  .action(async (prompt: string) => {
    try {
      await generate.generateImageCLI(prompt);
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('An unexpected error occurred');
      }
    }
  });

program
  .command('edit <image>')
  .description('Edit an image using ComfyUI')
  .action(async (imagePath: string) => {
    try {
      await edit.editImageCLI(imagePath);
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('An unexpected error occurred');
      }
    }
  });

program.parse(process.argv);