import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { courseEvent, reportDecision } from "./deadline_policy.js";
import { validSignature } from "./course_receiver.js";

test("a submission after its deadline is late, and a modified signed body is rejected", () => {
  const event = courseEvent.parse({
    event_id: "evt-42", type: "learner.submitted", course_id: "math-1", learner_id: "learner-7",
    deadline: "2026-09-20T12:00:00.000Z", occurred_at: "2026-09-20T12:01:00.000Z"
  });
  assert.equal(reportDecision(event).status, "late");
  const raw = Buffer.from(JSON.stringify(event));
  const signature = createHmac("sha256", "test-secret").update(raw).digest("hex");
  assert.equal(validSignature(raw, signature, "test-secret"), true);
  assert.equal(validSignature(Buffer.from(raw.toString().replace("12:01", "11:01")), signature, "test-secret"), false);
});
