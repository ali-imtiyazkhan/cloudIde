import IORedis from "ioredis";

import { Queue, Worker, type Job } from "bullmq";
import { getEnv } from "./env";

const env = getEnv();

const newConnection = () => new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const SNAPSHOT_QUEUE = 'workspace-snapshots';

export type SnapshotJob =
    | { type: "upload"; workspaceId: string; storagePrefix: string }
    | { type: "restore"; workspaceId: string; storagePrefix: string }
    | { type: "delete"; workspaceId: string; storagePrefix: string };

let queue: Queue<SnapshotJob> | undefined;

export function getSnapshotQueue(): Queue<SnapshotJob> {
    queue ??= new Queue<SnapshotJob>(SNAPSHOT_QUEUE, {
        connection: newConnection(),
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 5_000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 500 },
        },
    });
    return queue;
}

export function enqueueSnapJob(job: SnapshotJob, opts?: {
    jobId?: string
}): Promise<Job<SnapshotJob>> {
    // No default jobId, on purpose: BullMQ dedupes by jobId against ANY
    // existing job record — including completed ones kept by
    // `removeOnComplete: { count }`. A fixed id like `upload:projects/x`
    // would therefore run once and silently block every later enqueue of
    // that type for the same prefix.
    return getSnapshotQueue().add(job.type, job, {
        ...(opts?.jobId ? { jobId: opts.jobId } : {}),
    });
}


export function startSnapshotWorker(
    handler: (job: Job<SnapshotJob>) => Promise<void>,
): Worker<SnapshotJob> {
    const worker = new Worker<SnapshotJob>(SNAPSHOT_QUEUE, handler, {
        connection: newConnection(),
        concurrency: 2,
    });
    worker.on("completed", (job) =>
        console.log(`snapshot ${job.id} (${job.name}) completed`),
    );
    worker.on("failed", (job, err) =>
        console.error(`snapshot ${job?.id} failed:`, err),
    );
    worker.on("error", (err) => console.error("snapshot worker:", err));
    return worker;
}

export async function closeQueue(): Promise<void> {
    await queue?.close();
    queue = undefined;
};