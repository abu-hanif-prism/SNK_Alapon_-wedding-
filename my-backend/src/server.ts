import { env } from "./config/env";
import app from "./app";
import { startJobs } from "./jobs";

const server = app.listen(env.PORT, () => {
  console.log(`Server running at http://localhost:${env.PORT}`);
});

const stopJobs = env.JOBS_ENABLED ? startJobs() : null;

function shutdown() {
  stopJobs?.();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
