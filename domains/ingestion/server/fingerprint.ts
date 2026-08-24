import { createHash } from "node:crypto";

import type { IngestEventMutationInput } from '../shared/contracts/ingest-event.js'

const normalizeMessage = (message: string) => {
  return message
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<uuid>")
    .replace(/\b0x[0-9a-f]+\b/gi, "<hex>")
    .replace(/\b\d{4,}\b/g, "<number>")
    .replace(/https?:\/\/[^\s]+/gi, "<url>")
    .replace(/\s+/g, " ")
    .trim();
}

export const fingerprintEvent = (input: IngestEventMutationInput) => {
  const components = input.customFingerprint?.length
    ? ["custom", ...input.customFingerprint]
    : [
        input.exceptionType ?? "",
        normalizeMessage(input.message ?? ""),
        ...input.stacktrace
          .filter((frame) => frame.inApp !== false)
          .slice(-3)
          .flatMap((frame) => [frame.filename ?? "", frame.function ?? ""]),
      ];

  return createHash("sha256").update(JSON.stringify(components)).digest("hex");
}
