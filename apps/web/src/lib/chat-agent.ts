import { ToolLoopAgent, tool, embedMany } from 'ai';
import { z } from 'zod';
import { vectorSearch, getTopicById, getArtifactsByTopic, createJob } from '@research-lab/db';

export const chatAgent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-4.6',
  instructions: `You are a research paper assistant for the AI Research Lab. You help users explore and understand collections of AI research papers.

You can:
1. Search for papers by topic or concept using semantic search
2. Answer questions about findings, trends, and insights from the paper collection
3. Trigger new analysis runs when requested

When answering questions:
- Ground your answers in the actual paper data returned by your tools
- Cite specific papers when making claims
- Be honest about what the data shows vs. your own interpretation
- If the user asks to "analyze" or "refresh" the collection, use the triggerAnalysis tool`,
  tools: {
    searchPapers: tool({
      description: 'Search papers in the collection by semantic similarity. Use this to find relevant papers for a question.',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
        topicId: z.string().describe('Topic collection ID to search within'),
        limit: z.number().optional().default(10).describe('Max results'),
      }),
      execute: async ({ query, topicId, limit }) => {
        const { embeddings } = await embedMany({
          model: 'openai/text-embedding-3-small',
          values: [query],
        });

        const results = await vectorSearch(embeddings[0], { limit, topicId });
        return results.map((r) => ({
          paperId: r.paperId,
          title: r.paper.title,
          content: r.content,
          distance: r.distance,
        }));
      },
    }),
    triggerAnalysis: tool({
      description: 'Trigger a full agent analysis of a paper collection. Creates a job that the worker will process.',
      inputSchema: z.object({
        topicId: z.string().describe('Topic to analyze'),
      }),
      execute: async ({ topicId }) => {
        const topic = await getTopicById(topicId);
        if (!topic) return { error: 'Topic not found' };

        const job = await createJob({ topicId, type: 'analyze' });
        return { jobId: job.id, message: `Analysis job created for "${topic.name}". The worker will process it.` };
      },
    }),
    getCollectionInsights: tool({
      description: 'Get the pre-computed insights and artifacts for a topic collection. Use this to answer questions about the collection overview.',
      inputSchema: z.object({
        topicId: z.string().describe('Topic collection ID'),
      }),
      execute: async ({ topicId }) => {
        const artifacts = await getArtifactsByTopic(topicId);
        return artifacts.map((a) => ({
          agentType: a.agentType,
          tabTarget: a.tabTarget,
          data: a.data,
        }));
      },
    }),
  },
});

export type ChatAgentUIMessage = import('ai').InferAgentUIMessage<typeof chatAgent>;
