import { execFile } from "node:child_process"
import { createReadStream } from "node:fs"
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"


import {
    CreateBucketCommand, DeleteObjectsCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3"

import { getEnv } from "./env"

const execFileAsync = promisify(execFile);

let client: S3Client | undefined

let bucketReady = false

function s3(): S3Client {
    if (!client) {
        const env = getEnv();
        client = new S3Client({
            region: env.S3_REGION,
            endpoint: env.S3_ENDPOINT,
            // Required by MinIO — S3 virtual-host style doesn't resolve to loopback.
            forcePathStyle: true,
            credentials: {
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            },
        });
    }
    return client;
}

const snapshotKey = (workspaceId: string) =>
    `workspaces/${workspaceId}/snapshot.tar.gz`;
  
  /** Creates the bucket on first use so compose needs no init container. */
  async function ensureBucket(): Promise<void> {
    if (bucketReady) return;
    const { S3_BUCKET } = getEnv();
    try {
      await s3().send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    } catch {
      await s3().send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    }
    bucketReady = true;
  }
  
  export async function snapshotExists(workspaceId: string): Promise<boolean> {
    await ensureBucket();
    try {
      await s3().send(
        new HeadObjectCommand({
          Bucket: getEnv().S3_BUCKET,
          Key: snapshotKey(workspaceId),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Restores the workspace snapshot into destDir (which already exists).
   * Returns false when there is no snapshot — the caller then falls back to
   * `git clone`, the true cold start.
   */
  export async function restoreSnapshot(
    workspaceId: string,
    destDir: string,
  ): Promise<boolean> {
    if (!(await snapshotExists(workspaceId))) return false;
  
    const tmp = await mkdtemp(join(tmpdir(), "cloudide-restore-"));
    const archive = join(tmp, "snapshot.tar.gz");
    try {
      const res = await s3().send(
        new GetObjectCommand({
          Bucket: getEnv().S3_BUCKET,
          Key: snapshotKey(workspaceId),
        }),
      );
      if (!res.Body) return false;
      // MVP: buffer in memory. Large-repo streaming goes to a write stream
      // once snapshots outgrow comfortable RAM.
      await writeFile(archive, await res.Body.transformToByteArray());
  
      // .git and all hidden files are stored, so extract `.` as-is.
      await execFileAsync("tar", ["-xzf", archive, "-C", destDir], {
        timeout: 5 * 60_000,
      });
      return true;
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
  
  /**
   * Tars sourceDir and overwrites this workspace's snapshot. Called by the
   * BullMQ `upload` job after Stop, while the directory is guaranteed quiet.
   */
  export async function saveSnapshot(
    workspaceId: string,
    sourceDir: string,
  ): Promise<void> {
    await ensureBucket();
  
    // Project may have been cleaned up between Stop and the job running.
    if (!(await stat(sourceDir).catch(() => null))) return;
  
    const tmp = await mkdtemp(join(tmpdir(), "cloudide-upload-"));
    const archive = join(tmp, "snapshot.tar.gz");
    try {
      // node_modules IS included on purpose: correctness first (§4.6).
      await execFileAsync(
        "tar",
        ["-czf", archive, "-C", sourceDir, "."],
        { timeout: 10 * 60_000 },
      );
  
      await s3().send(
        new PutObjectCommand({
          Bucket: getEnv().S3_BUCKET,
          Key: snapshotKey(workspaceId),
          Body: createReadStream(archive),
        }),
      );
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
  
  /** Removes every object under this workspace's prefix (MCP: 1000/key batch). */
  export async function deleteSnapshots(workspaceId: string): Promise<void> {
    await ensureBucket();
    const Bucket = getEnv().S3_BUCKET;
    const prefix = `workspaces/${workspaceId}/`;
  
    let token: string | undefined;
    do {
      const listed = await s3().send(
        new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token }),
      );
      const keys = (listed.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => Boolean(k));
      if (keys.length) {
        await s3().send(
          new DeleteObjectsCommand({
            Bucket,
            Delete: { Objects: keys.map((Key) => ({ Key })) },
          }),
        );
      }
      token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (token);
  }