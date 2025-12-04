import numpy as np
import tifffile
import os

# directory containing the 4 DEM tiles
dem_dir = "data/dem"

tiles = {
    "n44_w072_1arc_v3.tif": {"lat_start": 44, "lat_end": 45, "lon_start": -72, "lon_end": -71},
    "n44_w071_1arc_v3.tif": {"lat_start": 44, "lat_end": 45, "lon_start": -71, "lon_end": -70},
    "n43_w072_1arc_v3.tif": {"lat_start": 43, "lat_end": 44, "lon_start": -72, "lon_end": -71},
    "n43_w071_1arc_v3.tif": {"lat_start": 43, "lat_end": 44, "lon_start": -71, "lon_end": -70},
}

# Load tiles
loaded = {}
for name in tiles:
    path = os.path.join(dem_dir, name)
    print("Loading", name)
    loaded[name] = tifffile.imread(path)

# All tiles are 3601x3601 for 1 arcsecond DEM
H, W = next(iter(loaded.values())).shape

# Create mosaic
mosaic = np.zeros((2*H, 2*W), dtype=next(iter(loaded.values())).dtype)

# Place tiles in correct position
# Upper-left: n44_w072
mosaic[0:H, 0:W] = loaded["n44_w072_1arc_v3.tif"]

# Upper-right: n44_w071
mosaic[0:H, W:2*W] = loaded["n44_w071_1arc_v3.tif"]

# Lower-left: n43_w072
mosaic[H:2*H, 0:W] = loaded["n43_w072_1arc_v3.tif"]

# Lower-right: n43_w071
mosaic[H:2*H, W:2*W] = loaded["n43_w071_1arc_v3.tif"]

# Save output
tifffile.imwrite("merged_dem.tif", mosaic)
print("Saved merged_dem.tif")
