import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function start(): Promise<void> {
  await connectDatabase();
  app.listen(env.port, () => console.log(`TripBoard listening on http://localhost:${env.port}`));
}

start().catch((error: unknown) => {
  console.error('Could not start TripBoard:', error);
  process.exit(1);
});
