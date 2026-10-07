import { call } from "./infrai_client.js";

const url = process.env.WEBHOOK_URL;
const secret = process.env.WEBHOOK_SECRET;
if (!url || !secret) throw new Error("Set WEBHOOK_URL and WEBHOOK_SECRET");

call("/v1/account/webhooks/register", {
  url,
  events: ["course.delivered", "learner.submitted"],
  secret,
  idempotency_key: `register-${url}`
}).then(result => console.log(JSON.stringify(result))).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
