import numpy as np
import tifffile
from PIL import Image

DEM_PATH = "n44_w072_1arc_v3.tif"      # your DEM
OUT_PNG = "hillshade_n44_w072.png"     # output hillshade

# Simple parameters for lighting
AZIMUTH_DEG = 315.0   # light from NW
ALTITUDE_DEG = 45.0   # sun height

print("Loading DEM...")
dem = tifffile.imread(DEM_PATH).astype("float32")

# Treat nodata (if present) – optional: clamp huge negatives
dem[dem < -1000] = np.nan

# Cellsize: 1 arcsec (~30m); exact value doesn't matter for visual
cellsize = 1.0

# Gradients
print("Computing gradients...")
dy, dx = np.gradient(dem, cellsize)

# Slope and aspect (GDAL-like approach)
print("Computing slope and aspect...")
slope = np.pi / 2.0 - np.arctan(np.sqrt(dx * dx + dy * dy))
aspect = np.arctan2(-dx, dy)

az = np.deg2rad(AZIMUTH_DEG)
alt = np.deg2rad(ALTITUDE_DEG)

# Lambertian hillshade
print("Computing hillshade brightness...")
hs = (np.sin(alt) * np.sin(slope) +
      np.cos(alt) * np.cos(slope) * np.cos(az - aspect))

# Normalize to 0–255
hs = np.clip(hs, 0, 1)
hs = (hs * 255).astype("uint8")

# Handle NaNs as black
hs[np.isnan(dem)] = 0

print("Saving PNG...")
img = Image.fromarray(hs, mode="L")
img.save(OUT_PNG)

print("Done →", OUT_PNG)
