import { ImageConfig } from '../types';
import fs from 'fs';
import axios from 'axios';

const configPath = './prive.config.json';
const configFileContent = fs.readFileSync(configPath, 'utf8');
const imageConfig: ImageConfig = JSON.parse(configFileContent);

class ComfyUI {
  private host: string;
  private model: string;
  private outputDir: string;

  constructor() {
    this.host = imageConfig.host;
    this.model = imageConfig.model;
    this.outputDir = imageConfig.outputDir;
  }

  async generate(prompt: string): Promise<string> {
    // Implement image generation logic here
    return '';
  }

  async edit(imagePath: string, prompt: string): Promise<string> {
    // Implement image editing logic here
    return '';
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.host}/health`);
      return response.status === 200;
    } catch (error) {
      console.error('ComfyUI is offline');
      return false;
    }
  }
}

export default new ComfyUI();