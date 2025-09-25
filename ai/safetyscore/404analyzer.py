# INSERT_YOUR_CODE

import pandas as pd
import numpy as np

def haversine(lat1, lon1, lat2, lon2):
    """
    Compute the Haversine distance (in km) between two points.
    """
    R = 6371.0  # Earth radius in km
    lat1 = np.radians(lat1)
    lon1 = np.radians(lon1)
    lat2 = np.radians(lat2)
    lon2 = np.radians(lon2)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2.0)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2.0)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    return R * c

# Load the cell tower data
df = pd.read_csv('./cell tower coverage/404.csv')

# Take only lat/long columns, drop duplicates if any
coords = df[['lat', 'long']].drop_duplicates().reset_index(drop=True)

# Sample 500 points (or all if less than 500)
sample_size = min(50000, len(coords))
coords_sample = coords.sample(n=sample_size, random_state=42).reset_index(drop=True)

# Prepare to store metrics for each point
radii = [0.5, 1, 5, 15]  # km
all_metrics = []

# Precompute all pairwise distances (efficiently)
lat_arr = coords_sample['lat'].values
lon_arr = coords_sample['long'].values

for i in range(sample_size):
    lat0 = lat_arr[i]
    lon0 = lon_arr[i]
    # Compute distances from this point to all others
    dists = haversine(lat0, lon0, lat_arr, lon_arr)
    # Remove self-distance (should be zero)
    dists = dists[dists > 0]
    # Remove distances > 100 km
    dists = dists[dists <= 100]
    metrics = {}
    for r in radii:
        mask = dists <= r
        count = np.sum(mask)
        density = count / (np.pi * r**2)  # towers per km²
        metrics[f'count_{r}km'] = count
        metrics[f'density_{r}km'] = density
    # Optionally, add more statistics
    # if len(dists) > 0:
    #     metrics['mean_dist_km'] = np.mean(dists)
    #     metrics['median_dist_km'] = np.median(dists)
    #     metrics['min_dist_km'] = np.min(dists)
    #     metrics['max_dist_km'] = np.max(dists)
    #     metrics['std_dist_km'] = np.std(dists)
    # else:
    #     metrics['mean_dist_km'] = np.nan
    #     metrics['median_dist_km'] = np.nan
    #     metrics['min_dist_km'] = np.nan
    #     metrics['max_dist_km'] = np.nan
    #     metrics['std_dist_km'] = np.nan
    all_metrics.append(metrics)

# Convert to DataFrame for easy aggregation
metrics_df = pd.DataFrame(all_metrics)

# Show average and other statistics for each metric
summary = metrics_df.agg(['mean', 'std', 'min', 'max', 'median'])
print("=== Aggregated Metrics for 500 Random Cell Tower Locations ===")
print(summary.T)

# Optionally, print a few sample rows
# print("\nSample of per-point metrics:")
# print(metrics_df.head())
