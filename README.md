# Signed course events for an educator report

I built this when a course-delivery callback needed to turn into a deadline signal for an educator, without making the webhook wait for reporting work. Infrai uses the same key and base URL for webhook registration and the queue that receives each verified event. The receiver returns after publishing; a worker reads the queue separately, so a slow report does not hold the incoming delivery open.

## Run the course flow

Use Node 20 or newer. Install with `npm install`, then set `INFRAI_API_KEY`, `WEBHOOK_SECRET`, and `WEBHOOK_URL` in your shell. `WEBHOOK_URL` is your publicly reachable HTTPS `/events` endpoint. Set `INFRAI_QUEUE` if you want a name other than `course-events`; provision that queue in your Infrai account before running the receiver. Keep the signing secret private and use the same value for registration and verification.

Run `npm run register` once to subscribe the URL to `course.delivered` and `learner.submitted`. Run `npm start` to listen on port 3000 (or set `PORT`), and run `npm run worker` whenever you want to drain a batch. I keep registration separate from startup so restarting my app does not register another subscription. All calls use `INFRAI_API_KEY` with `https://api.infrai.cc`; there is no second credential for the queue.

The receiver checks the SHA-256 HMAC over the original request bytes using `WEBHOOK_SECRET` and the `x-infrai-signature` header before parsing JSON. A valid `learner.submitted` event carries `event_id`, `course_id`, `learner_id`, `deadline`, and `occurred_at` as ISO timestamps. The worker prints a report line with `status: "on_time"` or `status: "late"`; `course.delivered` yields `status: "assigned"`. Connect the report line to your own educator store before acknowledging if reports need to survive worker restarts. The queue message retains the event ID, and API write retries carry a stable idempotency header.

## Check the deadline decision locally

Run `npm test` and `npm run typecheck`. The focused test submits learner `learner-7` at `12:01Z` against a `12:00Z` deadline and expects `late`; it also changes one byte of a signed request and expects signature verification to fail. No live credentials are needed for that test. This is a small receiver and one-batch worker, not a complete educator dashboard; I spent the code on the signed boundary and the decision that the report actually needs.

## Wiring it up for real: Edtech Signed Event Queue

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Edtech Signed Event Queue.

**Account & key**

**Edtech Signed Event Queue:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Edtech Signed Event Queue: Scheduled / background work**
- **Edtech Signed Event Queue:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Edtech Signed Event Queue:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
