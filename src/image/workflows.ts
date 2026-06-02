export function createTextToImageWorkflow(prompt: string): any {
  // Implement text-to-image workflow
  return {
    // Example workflow object
    type: 'text-to-image',
    prompt,
    model: 'flux1-dev'
  };
}

export function createImageEditWorkflow(imagePath: string, prompt: string): any {
  // Implement image edit workflow
  return {
    // Example workflow object
    type: 'image-edit',
    imagePath,
    prompt,
    model: 'flux1-dev'
  };
}