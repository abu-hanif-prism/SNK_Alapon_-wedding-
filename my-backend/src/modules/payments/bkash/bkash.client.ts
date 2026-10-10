import { env } from "../../../config/env";
import { liveBkashClient } from "./bkash.live";
import { mockBkashClient } from "./bkash.mock";
import type { BkashClient } from "./bkash.types";

export const bkash: BkashClient = env.BKASH_MODE === "live" ? liveBkashClient : mockBkashClient;
