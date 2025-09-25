import numpy as np
import pandas as pd

N_SAMPLES = 1000

network_connectivity_state = np.random.choice(
    [1, 0],
    size=N_SAMPLES,
    p=[0.95, 0.05]
)

acc_vs_loc = np.random.choice(
    [1, 0],
    size=N_SAMPLES,
    p=[0.2, 0.8]
)

AREA_RISK_PROBS = [0.92, 0.07, 0.01] 
area_risk = np.random.choice(
    ['low', 'med', 'high'],
    size=N_SAMPLES,
    p=AREA_RISK_PROBS
)

ping_time_scale = 15  # mean time in minutes

time_since_last_successful_ping = np.random.exponential(
    scale=ping_time_scale, size=N_SAMPLES
)
time_since_last_successful_ping = np.clip(time_since_last_successful_ping, 0, 1800).astype(int)

gps_accuracy = []
for _ in range(N_SAMPLES):
    readings = np.random.normal(loc=8, scale=3, size=5)  # mean 8m, std 3m
    readings = np.clip(readings, 3, 50)  # min 3m, max 50m
    gps_accuracy.append(readings.tolist())


df = pd.DataFrame({
    'network_connectivity_state': network_connectivity_state,
    'acc_vs_loc': acc_vs_loc,
    'area_risk': area_risk,
    'time_since_last_successful_ping': time_since_last_successful_ping,
    **{f'gps_accuracy_{i+1}': [reading[i] for reading in gps_accuracy] for i in range(5)}
})


df.to_csv('dropoff_data.csv', index=False)


