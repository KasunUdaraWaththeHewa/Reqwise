## Reqwise

Reqwise is a local-first API client inspired by Postman, built with React + Vite + Zustand.

## What is implemented now

### Core request workflow
- HTTP methods: GET, POST, PUT, DELETE, PATCH
- URL editor, query params editor, headers editor, body editor (none/json/text)
- Send requests and view response status, headers, response body, size, and time
- Multiple open tabs for requests
- Collection sidebar with quick create/open/delete/duplicate request actions

### UX and productivity improvements
- **Keyboard shortcuts**
  - `Cmd/Ctrl + K`: quick request search palette
  - `Cmd/Ctrl + Enter`: send active request
  - `Cmd/Ctrl + S`: save hint (auto-save is always enabled)
- **Clipboard-first editing**
  - Copy/Paste headers as tab-separated rows
  - Copy/Paste query params as tab-separated rows
- **Body helpers**
  - JSON body formatter button
- **Search improvements**
  - Keyboard navigation in command palette (Up/Down + Enter)
- **Auth helpers**
  - One-click add common auth headers (Bearer, Basic, API key)
- **Load testing**
  - Configure iterations, concurrency, and delay per request
  - Run parallelized request bursts and review throughput + latency percentiles (P50/P95/P99)
  - Persist load test summary into history for quick comparisons
- **Response helpers**
  - Copy response body
  - Copy all response headers
  - Download response as JSON
  - Local request history view with clear action
- **Persistence**
  - Workspace state is persisted locally via Zustand persist middleware

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
