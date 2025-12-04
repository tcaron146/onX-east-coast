import csv
import json

input_csv = "routes_with_elev.csv"
output_geojson = "routes_with_elev.geojson"

features = []

with open(input_csv) as f:
    reader = csv.DictReader(f)
    current_id = None
    coords = []
    props = {}

    for row in reader:
        if row['id'] != current_id and current_id is not None:
            # save previous line
            features.append({
                "type": "Feature",
                "properties": props,
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                }
            })
            coords = []

        current_id = row['id']
        props = {"id": row['id'], "name": row['name']}
        coords.append([float(row['lon']), float(row['lat']), float(row['elevation'])])

    # add last line
    if coords:
        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            }
        })

geojson = {"type": "FeatureCollection", "features": features}

with open(output_geojson, "w") as f:
    json.dump(geojson, f, indent=2)

print("Done! GeoJSON saved as", output_geojson)
