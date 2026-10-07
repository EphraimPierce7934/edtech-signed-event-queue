import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { ZodError } from "zod";
import { courseEvent } from "./deadline_policy.js";
import { call, InfraiError } from "./infrai_client.js";

export function validSignature(raw: Buffer, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(raw).digest();
  const supplied = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/events") {
    response.writeHead(404).end();
    return;
  }
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) { response.writeHead(500).end("Configure WEBHOOK_SECRET"); return; }
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks);
  const signature = request.headers["x-infrai-signature"];
  if (typeof signature !== "string" || !validSignature(raw, signature, secret)) {
    response.writeHead(401).end("Invalid signature");
    return;
  }
  try {
    const event = courseEvent.parse(JSON.parse(raw.toString("utf8")));
    await call("/v1/queue/publish", {
      queue: process.env.INFRAI_QUEUE ?? "course-events",
      payload: event,
      idempotency_key: event.event_id
    });
    response.writeHead(202, { "Content-Type": "application/json" }).end(JSON.stringify({ accepted: event.event_id }));
  } catch (error) {
    const status = error instanceof ZodError || error instanceof SyntaxError ? 400 :
      error instanceof InfraiError && error.status >= 400 && error.status < 500 ? error.status : 503;
    response.writeHead(status).end(error instanceof Error ? error.message : "Request rejected");
  }
});

if (process.env.NODE_ENV !== "test") server.listen(Number(process.env.PORT ?? 3000));
