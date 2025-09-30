// scripts/ping-sheets.ts
import 'dotenv/config';
import { writeHeartbeat } from '../src/tracker/tracker.js';

(async () => {
  try {
    const rng = await writeHeartbeat();
    console.log('HEARTBEAT OK:', rng);
  } catch (e) {
    console.error('HEARTBEAT FAIL:', e);
    process.exit(1);
  }
})();
