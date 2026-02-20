import "dotenv/config";
import { OutboxPublisher } from "./publisher.js";

const publisher = new OutboxPublisher();

async function shutdown() {
  console.log("Shutting down…");
  await publisher.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

publisher.start().catch((err) => {
  console.error("Publisher failed:", err);
  process.exit(1);
});
