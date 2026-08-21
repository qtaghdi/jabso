# Session Replay spike

This directory preserves the original experiment that accepted Sentry Replay envelopes, decoded zlib-compressed rrweb segments, and replayed them with `rrweb-player`.

It is intentionally excluded from the current build. The code disables text and input masking for protocol inspection and must not be used with real user data.

The production roadmap defers Session Replay until error ingestion, issue grouping, source maps, and read-only MCP are working.
