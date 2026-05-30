import { Prompt } from './prompt';
import { Ollama } from '../../ai/ollama';

async function main() {
  const prompt = new Prompt();
  const ollama = new Ollama();
  
  console.log('⚡ Prive v0.1');
  console.log('🤖 Model: qwen3');
  console.log('📂 Current Project');
  
  while (true) {
    const input = await prompt.ask('prive> ');
    
    if (input.toLowerCase() === 'exit') {
      break;
    }
    
    const response = await ollama.sendMessage(input);
    console.log('\n' + response);
  }
}

main().catch(console.error);