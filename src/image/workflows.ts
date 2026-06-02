export function createTextToImageWorkflow(prompt: string) {
  return {
    "3": {
      "inputs": {
        "seed": Math.floor(Math.random() * 999999999),
        "steps": 20,
        "cfg": 7,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 1,
        "model": ["1", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler"
    },

    "4": {
      "inputs": {
        "samples": ["3", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEDecode"
    },

    "5": {
      "inputs": {
        "width": 1024,
        "height": 1024,
        "batch_size": 1
      },
      "class_type": "EmptyLatentImage"
    },

    "6": {
      "inputs": {
        "text": prompt,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode"
    },

    "7": {
      "inputs": {
        "text": "",
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode"
    },

    "8": {
      "inputs": {
        "filename_prefix": "Prive",
        "images": ["4", 0]
      },
      "class_type": "SaveImage"
    }
  };
}

export function createImageEditWorkflow(
  imageName: string,
  prompt: string
) {
  return {
    "1": {
      "inputs": {
        "image": imageName
      },
      "class_type": "LoadImage"
    },

    "2": {
      "inputs": {
        "pixels": ["1", 0],
        "vae": ["4", 2]
      },
      "class_type": "VAEEncode"
    },

    "3": {
      "inputs": {
        "seed": Math.floor(Math.random() * 999999999),
        "steps": 20,
        "cfg": 7,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 0.65,
        "model": ["4", 0],
        "positive": ["5", 0],
        "negative": ["6", 0],
        "latent_image": ["2", 0]
      },
      "class_type": "KSampler"
    },

    "5": {
      "inputs": {
        "text": prompt,
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },

    "6": {
      "inputs": {
        "text": "",
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },

    "7": {
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2]
      },
      "class_type": "VAEDecode"
    },

    "8": {
      "inputs": {
        "filename_prefix": "Prive_Edit",
        "images": ["7", 0]
      },
      "class_type": "SaveImage"
    }
  };
}