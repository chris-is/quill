# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quill is a browser-based data analysis and visualization application. Users upload CSV/JSON/Parquet files, which are converted to Apache Arrow format by the Go backend, then loaded into DuckDB WASM for client-side SQL querying. Results are visualized through a draggable widget dashboard.

## Development Commands

### Frontend (from `frontend/`)
```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + production build
npm run lint         # ESLint with zero warnings tolerance
npm run test         # Run Vitest tests
npm run test:ui      # Interactive test UI
```

### Backend (from `backend/`)
```bash
go run ./cmd/server  # Start server on :8080
go test ./...        # Run all Go tests
```

## Architecture

### Frontend (React 18 + TypeScript + Vite)
- **Three views:** Upload → Dashboard (widget grid) → SQL query interface
- **DuckDB WASM:** All SQL queries execute client-side via `DuckDBContext.tsx` provider
- **Chakra UI v3:** Component library (migrated from MUI) - use MCP tools for component examples
- **Monaco Editor:** SQL editor via `@sqlrooms/sql-editor`
- **react-grid-layout:** Draggable/resizable dashboard widgets

### Backend (Go + Gin)
- **POST /upload:** Converts uploaded files to Apache Arrow IPC stream format
- **Parquet support:** Uses `parquet-go` with Arrow schema preservation
- Serves on port 8080 with CORS enabled

### Data Flow
```
File Upload → Go Backend (Arrow conversion) → Frontend (DuckDB load) → SQL Query → Chart/Table Widget
```

## Key Files

- `frontend/src/lib/DuckDBContext.tsx` - DuckDB WASM initialization and query execution
- `frontend/src/components/SQLQueryInterface.tsx` - Monaco SQL editor with query history
- `frontend/src/components/DashboardGrid.tsx` - Widget layout management
- `backend/internal/server/server.go` - File upload handlers and Arrow serialization

## Technical Notes

- **WASM Headers:** Vite config includes COEP/COOP headers required for DuckDB WASM SharedArrayBuffer
- **TypeScript:** Strict mode with `noUnusedLocals` and `noUnusedParameters` enabled
- **Chakra UI v3:** Settings allow MCP tools (`list_components`, `get_component_example`, `get_component_props`) for component guidance