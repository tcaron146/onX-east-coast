import csv

input_csv = "routes_with_elev.csv"
output_csv = "routes_with_elev_stats.csv"

routes = {}

# Read elevations from CSV
with open(input_csv) as f:
    reader = csv.DictReader(f)
    for row in reader:
        route_id = row['id']
        elev = float(row['elevation'])
        if route_id not in routes:
            routes[route_id] = []
        routes[route_id].append(elev)

# Calculate stats
with open(output_csv, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['id', 'min_elev', 'max_elev', 'total_gain', 'total_loss'])
    
    for route_id, elevs in routes.items():
        min_elev = min(elevs)
        max_elev = max(elevs)
        gain = sum(max(0, elevs[i+1]-elevs[i]) for i in range(len(elevs)-1))
        loss = sum(max(0, elevs[i]-elevs[i+1]) for i in range(len(elevs)-1))
        writer.writerow([route_id, min_elev, max_elev, gain, loss])

print("Done! Stats saved in", output_csv)
