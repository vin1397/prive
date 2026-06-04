import axios from "axios";

const COMFY_URL = "http://127.0.0.1:8188";

export async function queueWorkflow(workflow: object) {
  const response = await axios.post(
    `${COMFY_URL}/prompt`,
    { prompt: workflow }
  );

  return response.data;
}