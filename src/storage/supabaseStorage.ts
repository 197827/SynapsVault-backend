import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

// Create client with realtime disabled — avoids WebSocket requirement on Node 20
// Storage operations (upload/download/delete) do not need realtime subscriptions
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: {
    params: { eventsPerSecond: -1 },
  },
});

const bucket = config.SUPABASE_STORAGE_BUCKET;

export class StorageNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "STORAGE_NOT_FOUND";

  constructor(storagePath: string) {
    super(`Object not found in storage: ${storagePath}`);
    this.name = "StorageNotFoundError";
  }
}

export async function uploadFile(
  resourceId: string,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const storagePath = `${resourceId}/${filename}`;
  const { error } = await supabase.storage.from(bucket).upload(storagePath, fileBuffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return storagePath;
}

export async function downloadFile(
  storagePath: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error) {
    const statusCode = (error as { statusCode?: number | string }).statusCode;
    const isNotFound =
      String(statusCode) === "404" ||
      /not\s*found/i.test(error.message ?? "");
    if (isNotFound) throw new StorageNotFoundError(storagePath);
    throw new Error(`Download failed: ${error.message}`);
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const mimeType = data.type || "application/octet-stream";
  return { buffer, mimeType };
}

export async function deleteFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
