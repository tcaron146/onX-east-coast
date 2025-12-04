import numpy as np
import tifffile
import json
import csv

# ---------- CONFIG ----------
geo_tiffs = [
    {"path": "n43_w071_1arc_v3.tif", "lon_min": -72.0, "lon_max": -71.0, "lat_min": 43.0, "lat_max": 44.0},
    {"path": "n43_w072_1arc_v3.tif", "lon_min": -73.0, "lon_max": -72.0, "lat_min": 43.0, "lat_max": 44.0},
    {"path": "n44_w071_1arc_v3.tif", "lon_min": -72.0, "lon_max": -71.0, "lat_min": 44.0, "lat_max": 45.0},
    {"path": "n44_w072_1arc_v3.tif", "lon_min": -73.0, "lon_max": -72.0, "lat_min": 44.0, "lat_max": 45.0},
]

geojson_path = "data/routes.geojson"
output_csv = "routes_with_elev.csv"

# ---------- LOAD DEMs ----------
for t in geo_tiffs:
    t["dem"] = tifffile.imread(t["path"])
    t["rows"], t["cols"] = t["dem"].shape

def get_pixel(lat, lon, dem_info):
    """Convert lat/lon to row/col index in DEM array"""
    col = int((lon - dem_info["lon_min"]) / (dem_info["lon_max"] - dem_info["lon_min"]) * (dem_info["cols"] - 1))
    row = int((dem_info["lat_max"] - lat) / (dem_info["lat_max"] - dem_info["lat_min"]) * (dem_info["rows"] - 1))
    row = np.clip(row, 0, dem_info["rows"] - 1)
    col = np.clip(col, 0, dem_info["cols"] - 1)
    return row, col

def get_elevation(lat, lon):
    # Find which DEM contains this point
    for t in geo_tiffs:
        if t["lat_min"] <= lat <= t["lat_max"] and t["lon_min"] <= lon <= t["lon_max"]:
            row, col = get_pixel(lat, lon, t)
            return t["dem"][row, col]
    # fallback if no DEM contains the point
    return np.nan

# ---------- LOAD GEOJSON ----------
with open(geojson_path) as f:
    data = json.load(f)

# ---------- EXTRACT ELEVATIONS ----------
output_lines = []
for feature in data['features']:
    props = feature.get('properties', {})
    coords = feature['geometry']['coordinates']
    elevations = [get_elevation(lat, lon) for lon, lat in coords]  # lon,lat -> lat,lon
    output_lines.append({
        'id': props.get('id', ''),
        'name': props.get('name', ''),
        'coordinates': coords,
        'elevations': elevations
    })

# ---------- SAVE CSV ----------
with open(output_csv, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['id', 'name', 'lon', 'lat', 'elevation'])
    for line in output_lines:
        for (lon, lat), elev in zip(line['coordinates'], line['elevations']):
            writer.writerow([line['id'], line['name'], lon, lat, elev])

print("Done! CSV saved as", output_csv)
