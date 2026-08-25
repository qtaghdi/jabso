# Source map artifacts

Jabso Phase 3 stores private source map artifacts by project, release, and optional dist. It uses an exact normalized artifact path match and never falls back to another project, release, or dist.

## Configuration

Set a long random administrator token. The public Sentry DSN key cannot upload or retry source maps.

```dotenv
JABSO_ADMIN_TOKEN=replace-with-a-long-random-token
```

Dashboard source-map context is workspace-scoped. The separate administrator token remains required for artifact upload and retry operations; project-scoped agent tokens are a Phase 4 decision.

## Upload

Upload an uncompressed source map as `application/octet-stream`. `artifact_path` is the deployed generated JavaScript path plus `.map`; the release and dist must match the SDK event.

```bash
curl --request PUT \
  --header "Authorization: Bearer $JABSO_ADMIN_TOKEN" \
  --header "Content-Type: application/octet-stream" \
  --data-binary @app.min.js.map \
  "http://localhost:4000/api/1/releases/web%401.2.3/artifacts?dist=browser&artifact_path=%2Fassets%2Fapp.min.js.map"
```

Uploading the same release/path replaces the artifact idempotently by checksum and starts a bounded backfill. A release is also created automatically when an event with a new release/dist arrives.

## Retry

Events remain persisted when a map is missing or cannot be processed. Retry up to 100 pending, missing, or failed events after fixing an artifact:

```bash
curl --request POST \
  --header "Authorization: Bearer $JABSO_ADMIN_TOKEN" \
  "http://localhost:4000/api/1/releases/web%401.2.3/symbolicate?dist=browser&limit=100"
```

## Limits and matching

- 5 MiB maximum uncompressed artifact body
- 50 artifacts per release/dist
- 2,000 characters per artifact path
- 200 stack frames per event
- 100 events per upload/retry backfill batch
- exact project + release + normalized dist + normalized generated path match
- no gzip upload, Debug ID matching, fuzzy path lookup, external queue, or public artifact download

Generated frame `https://cdn.example.com/assets/app.min.js?build=7` looks for `/assets/app.min.js.map`. Query strings and origins are removed before matching. Traversal segments and backslashes are rejected.

## Privacy and retention

Source maps may contain the complete application source in `sourcesContent`. Jabso therefore treats the entire artifact as private source code:

- PostgreSQL stores bounded artifact bytes, checksum, size, and path behind the release store.
- UI, logs, diagnostics, read APIs, and future MCP tools never return raw map bytes or `sourcesContent`.
- Symbolicated events store only file, function, line, column, and `inApp`; local home directory names in source paths are scrubbed.
- Original and symbolicated frames follow event retention. Artifact bytes follow release retention and are cascade-deleted with the release.
- There is no release deletion API yet. Until retention automation exists, deletion is an explicit database administration operation.
