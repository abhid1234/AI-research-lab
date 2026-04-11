import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

interface WorkflowConfig {
  name: string;
  model: 'fast' | 'strong';
  maxOutputTokens: number;
  description: string;
  prompt: string; // The markdown body (system prompt)
}

export function loadWorkflow(agentName: string): WorkflowConfig {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const workflowPath = join(
    __dirname,
    '..',
    'agents',
    'workflows',
    `${agentName}.md`,
  );
  const content = readFileSync(workflowPath, 'utf-8');

  // Parse YAML front matter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) throw new Error(`Invalid workflow file: ${workflowPath}`);

  const yamlStr = fmMatch[1];
  const prompt = fmMatch[2].trim();

  // Simple YAML parsing (no dependency needed for flat key-value)
  const config: Record<string, string> = {};
  for (const line of yamlStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      config[key] = value;
    }
  }

  return {
    name: config.name ?? agentName,
    model: (config.model as 'fast' | 'strong') ?? 'fast',
    maxOutputTokens: parseInt(config.maxOutputTokens ?? '8192', 10),
    description: config.description ?? '',
    prompt,
  };
}
