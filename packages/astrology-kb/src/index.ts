import { z } from "zod";

export const citationSchema = z.object({
  source_id: z.string(),
  title: z.string(),
  locator: z.string(),
  confidence: z.number().min(0).max(1),
});

export const kundliFactSchema = z.object({
  ayanamsha: z.string().default("Lahiri"),
  varga_used: z.array(z.string()),
  panchang: z.object({
    tithi: z.string(),
    nakshatra: z.string(),
    yoga: z.string(),
    karana: z.string(),
    vara: z.string(),
  }),
});

export const vaastuRuleSchema = z.object({
  rule_id: z.string(),
  section: z.string(),
  guidance: z.string(),
  safety_note: z.string(),
});

export const vaastuRules = [
  {
    rule_id: "vaastu-entry-01",
    section: "entrance",
    guidance: "Maintain clear entry circulation and natural light where feasible.",
    safety_note: "Avoid structural changes without licensed professional review.",
  },
  {
    rule_id: "vaastu-room-use-01",
    section: "room-usage",
    guidance: "Match room use with ventilation and practical movement patterns.",
    safety_note: "Prioritize occupant comfort and building safety over rigid rules.",
  },
] satisfies z.infer<typeof vaastuRuleSchema>[];
