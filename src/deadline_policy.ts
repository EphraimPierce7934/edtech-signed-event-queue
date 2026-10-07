import { z } from "zod";

export const courseEvent = z.object({
  event_id: z.string().min(1),
  type: z.enum(["course.delivered", "learner.submitted"]),
  course_id: z.string().min(1),
  learner_id: z.string().min(1),
  deadline: z.string().datetime(),
  occurred_at: z.string().datetime()
});

export type CourseEvent = z.infer<typeof courseEvent>;

export function reportDecision(event: CourseEvent) {
  return {
    event_id: event.event_id,
    course_id: event.course_id,
    learner_id: event.learner_id,
    status: event.type === "course.delivered" ? "assigned" :
      Date.parse(event.occurred_at) <= Date.parse(event.deadline) ? "on_time" : "late"
  } as const;
}
