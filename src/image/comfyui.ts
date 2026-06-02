import axios from 'axios';
import { ImageConfig } from '../types';
import { createTextToImageWorkflow, createImageEditWorkflow } from './workflows';

const config: ImageConfig = {
  provider: 'comfyui',
  host: 'http://127.0.0.1:8188',
  model: 'flux1-dev',
  outputDir: './generated/images'
};

async function healthCheck(): Promise<boolean> {
  try {
    const response = await axios.get(`${config.host}/health`);
    return response.status === 200;
  } catch (error) {
    console.error('ComfyUI is offline');
    return false;
  }
}

async function generate(prompt: string): Promise<string> {
  if (!(await healthCheck())) {
    throw new Error('ComfyUI is offline');
  }

  try {
    const workflow = createTextToImageWorkflow(prompt);
    const response = await axios.post(`${config.host}/prompt`, workflow);
    // Assuming the response contains the image path
    return `${config.outputDir}/${response.data.imagePath}`;
  } catch (error) {
    console.error('Image generation failed');
    throw error;
  }
}

async function edit(imagePath: string, prompt: string): Promise<string> {
  if (!(await healthCheck())) {
    throw new Error('ComfyUI is offline');
  }

  try {
    const workflow = createImageEditWorkflow(imagePath, prompt);
    const response = await axios.post(`${config.host}/prompt`, workflow);
    // Assuming the response contains the edited image path
    return `${config.outputDir}/${response.data.imagePath}`;
  } catch (error) {
    console.error('Image editing failed');
    throw error;
  }
}

export { generate, edit, healthCheck };