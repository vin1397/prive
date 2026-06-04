import { queueWorkflow } from "./comfyui";
import { createTextToImageWorkflow } from "./workflows";

export async function generateImage(prompt: string) {
  const workflow = createTextToImageWorkflow(prompt);

  const result = await queueWorkflow(workflow);

  return result;
}