export interface ImageConfig {
  provider: string;
  host: string;
  model: string;
  outputDir: string;
}

export { createTextToImageWorkflow, createImageEditWorkflow } from './image/workflows';