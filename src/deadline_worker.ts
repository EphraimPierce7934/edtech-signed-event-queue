import { call } from "./infrai_client.js";
import { courseEvent, reportDecision } from "./deadline_policy.js";

type Item = { message_id: string; payload: unknown };
const queue = process.env.INFRAI_QUEUE ?? "course-events";

async function run() {
  const batch = await call<{ items: Item[] }>("/v1/queue/consume", { queue, max_messages: 10, visibility_timeout: 60 });
  for (const item of batch.items) {
    const event = courseEvent.parse(item.payload);
    const report = reportDecision(event);
    // Persist or forward this report in your educator reporting pipeline before acknowledging.
    console.log(JSON.stringify(report));
    await call("/v1/queue/ack", { queue, message_id: item.message_id, idempotency_key: `ack-${item.message_id}` });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
