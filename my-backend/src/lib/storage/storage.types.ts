export type PresignedUpload = {
  url: string;
  method: "PUT";
  // The client must send exactly these headers (plus the file as the body).
  headers: Record<string, string>;
};

export type StoredObjectInfo = {
  size: number;
  contentType: string | null;
};

export interface Storage {
  // A short-lived URL the browser PUTs the file to. The size and type are baked into the signature,
  // so a client cannot upload something bigger or of another type than it declared.
  presignUpload(input: { key: string; contentType: string; byteSize: number }): Promise<PresignedUpload>;

  // A short-lived URL for reading. With `downloadName` the browser saves it as a file.
  presignDownload(input: { key: string; downloadName?: string; expiresInSeconds?: number }): Promise<string>;

  // null when the object does not exist.
  head(key: string): Promise<StoredObjectInfo | null>;

  getObject(key: string): Promise<Buffer>;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
}
