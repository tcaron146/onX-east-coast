import json

# Load your metadata JSON
with open("./data/metadata.json") as f:
    metadata = json.load(f)

# Load your GeoJSON
with open("./data/routes.geojson") as f:
    geojson = json.load(f)

# Create a lookup from GeoJSON id -> vertical_drop_ft
drop_lookup = {feature["properties"]["id"]: feature["properties"]["vertical_drop_ft"]
               for feature in geojson["features"]}

# Update metadata JSON
for entry in metadata:
    route_id = entry["id"]
    if route_id in drop_lookup:
        entry["vertical drop"] = drop_lookup[route_id]

# Save updated JSON
with open("metadata_updated.json", "w") as f:
    json.dump(metadata, f, indent=2)
