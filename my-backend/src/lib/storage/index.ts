import { env } from "../../config/env";
import { mockStorage } from "./mock.storage";
import { s3Storage } from "./s3.storage";
import type { Storage } from "./storage.types";

export const storage: Storage = env.STORAGE_MODE === "live" ? s3Storage : mockStorage;

export type { Storage } from "./storage.types";
