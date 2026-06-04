export function createTextToImageWorkflow(prompt: string) {
  return {
    "6": {
      inputs: {
        text: prompt,
        clip: ["11", 0]
      },
      class_type: "CLIPTextEncode"
    },

    "8": {
      inputs: {
        samples: ["13", 0],
        vae: ["10", 0]
      },
      class_type: "VAEDecode"
    },

    "9": {
      inputs: {
        filename_prefix: "prive",
        images: ["8", 0]
      },
      class_type: "SaveImage"
    },

    "10": {
      inputs: {
        vae_name: "ae.safetensors"
      },
      class_type: "VAELoader"
    },

    "11": {
      inputs: {
        clip_name: "qwen_3_4b.safetensors"
      },
      class_type: "CLIPLoader"
    },

    "12": {
      inputs: {
        model_name: "z_image_turbo_bf16.safetensors"
      },
      class_type: "UNETLoader"
    },

    "13": {
      inputs: {
        seed: Math.floor(Math.random() * 999999999),
        steps: 8,
        cfg: 1,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1,
        model: ["12", 0],
        positive: ["6", 0]
      },
      class_type: "KSampler"
    }
  };
}