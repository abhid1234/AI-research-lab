import { eq, and, sql } from 'drizzle-orm';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { db } from '../client.js';
import { artifacts } from '../schema.js';

export type Artifact = InferSelectModel<typeof artifacts>;
export type NewArtifact = InferInsertModel<typeof artifacts>;

export async function writeArtifact(data: {
  topicId: string;
  jobId: string;
  agentType: string;
  tabTarget: string;
  data: unknown;
}): Promise<Artifact> {
  // Find the current max version for this topicId + agentType
  const [existing] = await db
    .select({ version: artifacts.version })
    .from(artifacts)
    .where(
      and(
        eq(artifacts.topicId, data.topicId),
        eq(artifacts.agentType, data.agentType),
      ),
    )
    .orderBy(sql`${artifacts.version} DESC`)
    .limit(1);

  const nextVersion = existing ? existing.version + 1 : 1;

  const [artifact] = await db
    .insert(artifacts)
    .values({
      topicId: data.topicId,
      jobId: data.jobId,
      agentType: data.agentType,
      tabTarget: data.tabTarget,
      data: data.data,
      version: nextVersion,
    })
    .returning();

  return artifact;
}

export async function getArtifactsByTopic(topicId: string): Promise<Artifact[]> {
  // Return the latest version of each agentType for this topic
  // Use a subquery to get max version per agentType, then join back
  const latestVersions = db
    .select({
      agentType: artifacts.agentType,
      maxVersion: sql<number>`MAX(${artifacts.version})`.as('max_version'),
    })
    .from(artifacts)
    .where(eq(artifacts.topicId, topicId))
    .groupBy(artifacts.agentType)
    .as('latest_versions');

  const rows = await db
    .select({ artifact: artifacts })
    .from(artifacts)
    .innerJoin(
      latestVersions,
      and(
        eq(artifacts.agentType, latestVersions.agentType),
        eq(artifacts.version, latestVersions.maxVersion),
      ),
    )
    .where(eq(artifacts.topicId, topicId));

  return rows.map((r) => r.artifact);
}

export async function getArtifactByTab(
  topicId: string,
  tabTarget: string,
): Promise<Artifact[]> {
  return db
    .select()
    .from(artifacts)
    .where(
      and(eq(artifacts.topicId, topicId), eq(artifacts.tabTarget, tabTarget)),
    )
    .orderBy(sql`${artifacts.version} DESC`);
}
