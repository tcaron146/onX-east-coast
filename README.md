# onX-east-coast

# onX Presidential Prototype — East Coast Backcountry Routes

Purpose: Small prototype showing how Presidential Range ski routes (King Ravine, Castle Ravine, Jefferson Ravine, Great Gulf) can be modeled, previewed, and served for an ingestion-ready pipeline.

Important: This repo uses **original** route descriptions and **placeholder geometries**. Replace with field-collected GPX or licensed data before publishing. Do not reuse copyrighted guidebook text without permission.

## What's included
- `data/routes.geojson` — sample GeoJSON with 4 routes (placeholders).
- `data/metadata.json` — per-route metadata (difficulty, approach, hazards).
- `frontend/` — Mapbox preview (index.html + map.js).
- `scripts/gpx_to_geojson.js` — Node script to convert GPX -> GeoJSON.
- `backend/main.go` — minimal Go server exposing `/routes` and `/routes/:id`.
- `proposal.md` — 1-page proposal to attach to outreach.

## Quick start (local demo)
1. Clone repository.
2. Replace `MAPBOX_ACCESS_TOKEN` in `frontend/map.js` with your Mapbox token.
3. Start backend (Go required):
   - `cd backend`
   - `go run main.go`
   - API available at `http://localhost:8080/routes`
4. Serve frontend (from repo root):
   - `npx http-server frontend`  (or open `frontend/index.html` directly)
5. View the map and click routes to see metadata.

## How to use for outreach
- Link to the GitHub repo in your pitch.
- Attach `proposal.md` and the demo link / GIF screenshot.
- Offer a 15-minute demo showing the frontend and `GET /routes` payload.

## Next steps for production
- Replace placeholder LineStrings with real GPX converted to GeoJSON.
- Ingest into PostGIS, run slope-angle checks, and QA with local guides.
- Coordinate licensing for any guidebook-derived text or GPX files.
