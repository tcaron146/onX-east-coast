import json
import tifffile
import numpy as np
from affine import Affine

# ------------------------------
# CONFIG
# ------------------------------
DEM_PATH = "n44_w072_1arc_v3.tif"
GEOJSON_PATH = "data/routes.geojson" # input routes
OUTPUT_GEOJSON = "routes_with_elev.geojson"

# ------------------------------
# LOAD DEM + affine transform
# ------------------------------
with tifffile.TiffFile(DEM_PATH) as tif:
    dem = tif.asarray()
    tags = tif.pages[0].tags
    model_tiepoint = tags["ModelTiepointTag"].value
    model_pixel_scale = tags["ModelPixelScaleTag"].value

x0, y0 = model_tiepoint[3], model_tiepoint[4]
px, py = model_pixel_scale[0], model_pixel_scale[1]
transform = Affine(px, 0, x0, 0, -py, y0)

rows, cols = dem.shape

def latlon_to_pixel(lat, lon):
    col, row = ~transform * (lon, lat)
    row = int(np.clip(round(row), 0, rows-1))
    col = int(np.clip(round(col), 0, cols-1))
    return row, col

def get_elev(lat, lon):
    r, c = latlon_to_pixel(lat, lon)
    return float(dem[r, c])

def meters_to_feet(m):
    return m * 3.28084

# ------------------------------
# LOAD ROUTES
# ------------------------------
with open(GEOJSON_PATH, "r") as f:
    routes = json.load(f)

# ------------------------------
# PROCESS ROUTES
# ------------------------------
output = {"type": "FeatureCollection", "features": []}

for feature in routes["features"]:
    props = feature.get("properties", {})
    coords = feature["geometry"]["coordinates"]

    if len(coords) < 2:
        continue

    # Add elevation to each point
    elev_coords = []
    for pt in coords:
        lon, lat = pt[0], pt[1]
        elev_ft = round(meters_to_feet(get_elev(lat, lon)), 1)
        elev_coords.append([lon, lat, elev_ft])

    # Precompute vertical drop: start - end
    vertical_drop = round(elev_coords[0][2] - elev_coords[-1][2], 1)

    output["features"].append({
        "type": "Feature",
        "properties": {
            "id": props.get("id", ""),
            "name": props.get("name", ""),
            "vertical_drop_ft": vertical_drop
        },
        "geometry": {
            "type": "LineString",
            "coordinates": elev_coords
        }
    })

# ------------------------------
# SAVE NEW GEOJSON
# ------------------------------
with open(OUTPUT_GEOJSON, "w") as f:
    json.dump(output, f, indent=2)

print("Enhanced GeoJSON saved as:", OUTPUT_GEOJSON)
