import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

async function main() {
  console.log('Testing Gemini structured output...');

  // Simple schema first
  const SimpleSchema = z.object({
    summary: z.string(),
    keyPoints: z.array(z.string()),
  });

  try {
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      output: Output.object({ schema: SimpleSchema }),
      maxOutputTokens: 2048,
      prompt: 'Summarize this: Transformers are a neural network architecture introduced in 2017 that revolutionized NLP by replacing RNNs with self-attention mechanisms.',
    });
    console.log('Simple output worked:', JSON.stringify(result.output, null, 2));
  } catch (e) {
    console.error('Simple test failed:', (e as Error).message);
    console.error('Full error:', e);
    return;
  }

  // Check if raw response is useful
  console.log('\n--- Testing raw text generation ---');
  try {
    const raw = await generateText({
      model: google('gemini-2.5-flash'),
      maxOutputTokens: 500,
      prompt: 'Return a JSON object with keys "topic" and "papers" (array of strings). About: AI agents.',
    });
    console.log('Raw text:', raw.text);
    console.log('Finish reason:', raw.finishReason);
  } catch (e) {
    console.error('Raw test failed:', (e as Error).message);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
