import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns



N_SAMPLES = 1000
HOURS_IN_DAY = 24


# [DATA IS GENERATED WITH THE ASSUMPTION THAT DATA WILL BE COLLECTED OVER A 15MINS WINDOW AND THE THE SERVER WILL BE PINGED AT THE END OF EVERY WINDOW]


HOURLY_ACTIVITY_PROB = np.array([
    0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.02, 0.04, 0.06, 0.08, 0.09, 0.09,
    0.08, 0.07, 0.07, 0.06, 0.05, 0.05, 0.05, 0.04, 0.03, 0.02, 0.02, 0.01
])

HOURLY_ACTIVITY_PROB /= HOURLY_ACTIVITY_PROB.sum()


MIN_MOVEMENT_M = 5          # Base movement during sleep or inactivity (meters).
MAX_BASE_MOVEMENT_M = 600   # Average movement during the most active hour (meters).
SPORADIC_EVENT_RATE = 0.4   # Average number of sporadic movement events per hour.
SPORADIC_EVENT_SIZE_M = 75  # Average displacement per sporadic event (meters).


VEHICLE_BASE_MULTIPLIER = 25.0       # Multiplier for base movement when in a vehicle.
VEHICLE_SPORADIC_MULTIPLIER = 12.0   # Multiplier for sporadic events when in a vehicle.
VEHICLE_NOISE_STD_M = 3000           # Increased random noise when in a vehicle (meters).


AREA_RISK_PROBS = [0.92, 0.07, 0.01] # Probabilities for [low, medium, high] risk.


def generate_active_hours(n_samples):

    return np.random.choice(
        np.arange(HOURS_IN_DAY),
        size=n_samples,
        p=HOURLY_ACTIVITY_PROB
    )

def create_cyclical_time_features(active_hours):

    angle = (active_hours / HOURS_IN_DAY) * 2 * np.pi
    phase_shift = (7 / 24) * 2 * np.pi
    angle_shifted = angle - phase_shift

    hour_sin = np.sin(angle_shifted)
    hour_cos = np.cos(angle_shifted)
    
    # Model circadian rhythm as a normalized sine wave (scaled from 0 to 1)
    circadian_rhythm = (hour_sin + 1) / 2
    
    return hour_sin, hour_cos, circadian_rhythm

def generate_motion_state(circadian_rhythm):

    motion_prob = 0.35 * circadian_rhythm
    return np.random.binomial(1, motion_prob)

def generate_displacement(circadian_rhythm, motion_state):
    base_displacement = MIN_MOVEMENT_M + (MAX_BASE_MOVEMENT_M - MIN_MOVEMENT_M) * circadian_rhythm

    num_sporadic_events = np.random.poisson(SPORADIC_EVENT_RATE, N_SAMPLES)
    size_of_events = np.random.exponential(SPORADIC_EVENT_SIZE_M, N_SAMPLES)
    sporadic_displacement = num_sporadic_events * size_of_events

    noise = np.random.normal(0, 10, N_SAMPLES)

    is_in_vehicle = (motion_state == 1)
    base_displacement[is_in_vehicle] *= VEHICLE_BASE_MULTIPLIER
    sporadic_displacement[is_in_vehicle] *= VEHICLE_SPORADIC_MULTIPLIER
    noise[is_in_vehicle] = np.random.normal(0, VEHICLE_NOISE_STD_M, is_in_vehicle.sum())

    total_displacement = base_displacement + sporadic_displacement + noise

    total_displacement = np.maximum(total_displacement, 0)
    total_displacement = np.round(total_displacement, 2)
    
    return total_displacement

def generate_time_since_last_interaction(circadian_rhythm):
    """
    Simulates the time since the last interaction, inversely related to circadian rhythm.

    Args:
        circadian_rhythm (np.ndarray): The user's activity level (0 to 1).

    Returns:
        np.ndarray: The time since last interaction in minutes.
    """
    # Mean time is lower during active hours and higher during inactive hours.
    since_mean_minutes = 1000 - 900 * circadian_rhythm
    # Standard deviation also varies slightly with activity.
    since_std_minutes = 150 + 50 * (1 - circadian_rhythm)

    time_since_last = np.random.normal(since_mean_minutes, since_std_minutes)
    
    # Clip to a realistic range [0, 1700] minutes.
    return np.clip(time_since_last, 0, 1700).astype(int)

def generate_missed_ping_count(active_hours, circadian_rhythm):
    """
    Simulates the number of missed pings, with a small chance of occurring,
    biased by the circadian rhythm.

    Args:
        active_hours (np.ndarray): Array of hours for each sample.
        circadian_rhythm (np.ndarray): The user's activity level (0 to 1).

    Returns:
        np.ndarray: The count of missed pings (0-5).
    """
    missed_ping_count = np.zeros_like(active_hours)
    n_samples = len(active_hours)
    
    # 10% of samples will have at least one missed ping.
    n_missed = int(0.1 * n_samples)
    missed_indices = np.random.choice(n_samples, n_missed, replace=False)

    # For these samples, the number of missed pings (1-5) is biased by inactivity.
    # Higher inactivity (1 - circadian_rhythm) increases the chance of more missed pings.
    rhythm_weights = 1 - circadian_rhythm[missed_indices]
    rand_vals = np.random.rand(n_missed)
    
    missed_values = 1 + (rand_vals * rhythm_weights * 4).astype(int)
    missed_values = np.clip(missed_values, 1, 5)

    missed_ping_count[missed_indices] = missed_values
    return missed_ping_count

def generate_area_risk_labels(n_samples):
    """
    Assigns a categorical risk label to each sample based on fixed probabilities.

    Args:
        n_samples (int): The number of data samples to generate.

    Returns:
        np.ndarray: An array of strings ('low', 'med', 'high').
    """
    return np.random.choice(
        ['low', 'med', 'high'],
        size=n_samples,
        p=AREA_RISK_PROBS
    )

def generate_battery_level(active_hours):
    """
    Simulates phone battery level, peaking in the morning and decreasing through the day.

    Args:
        active_hours (np.ndarray): Array of hours for each sample.

    Returns:
        np.ndarray: The battery level percentage (5-100).
    """
    # Convert hour to a sine wave that peaks at 7 AM.
    hour_radians = (active_hours / HOURS_IN_DAY) * 2 * np.pi
    phase_shift = (7 / 24) * 2 * np.pi
    battery_base = 60 + 25 * np.sin(hour_radians - phase_shift)

    # Add random noise to simulate usage variations.
    battery_noise = np.random.normal(0, 7, size=len(active_hours))
    battery_level = battery_base + battery_noise
    
    # Clip to a realistic range [5, 100] percent.
    return np.clip(battery_level, 5, 100).astype(int)

def generate_expected_activity(circadian_rhythm, total_displacement):
    """
    Generates a binary flag indicating if the user is expected to be active.
    This is based on circadian rhythm and boosted by high displacement.

    Args:
        circadian_rhythm (np.ndarray): The user's activity level (0 to 1).
        total_displacement (np.ndarray): The total displacement in meters.

    Returns:
        np.ndarray: A binary array (0 = inactive, 1 = active).
    """
    # Scale circadian rhythm to a probability range of [0.05, 0.75].
    expected_active_prob = 0.05 + circadian_rhythm * (0.75 - 0.05)

    # Boost the probability if displacement is high (e.g., > 1000m).
    displacement_boost = np.where(total_displacement > 1000, 0.35, 0.0)
    expected_active_prob_biased = np.clip(expected_active_prob + displacement_boost, 0, 1)

    # Add noise to the final probability before generating the binary outcome.
    prob_noisy = np.clip(expected_active_prob_biased + np.random.normal(0, 0.05, size=len(expected_active_prob_biased)), 0, 1)
    
    return np.random.binomial(1, prob_noisy)
    

def assemble_dataset(features, save_path=None):
    """
    Assembles the generated features into a pandas DataFrame and optionally saves it to a CSV file.

    Args:
        features (dict): A dictionary where keys are column names and values are the feature arrays.
        save_path (str, optional): The file path to save the CSV file. If None, the file is not saved.
                                   Defaults to None.

    Returns:
        pd.DataFrame: The assembled DataFrame.
    """
    user_activity_df = pd.DataFrame(features)
    
    if save_path:
        try:
            user_activity_df.to_csv(save_path, index=False)
            print(f"Dataset successfully saved to {save_path}")
        except Exception as e:
            print(f"Error saving dataset to {save_path}: {e}")
            
    return user_activity_df


def plot_feature_vs_hour(df, feature_name, title, y_label):
    """Generic function to plot a feature against the hour of the day."""
    plt.figure(figsize=(12, 6))
    sns.scatterplot(data=df, x='hour', y=feature_name, alpha=0.3, label='Individual Samples')
    
    hourly_avg = df.groupby('hour')[feature_name].mean().reset_index()
    sns.lineplot(data=hourly_avg, x='hour', y=feature_name, color='red', marker='o', label='Hourly Average')
    
    plt.title(title, fontsize=16)
    plt.xlabel('Hour of Day', fontsize=12)
    plt.ylabel(y_label, fontsize=12)
    plt.xticks(np.arange(0, 24, 2))
    plt.legend()
    plt.show()

def main():
    """
    Main function to generate the full dataset and create visualizations.
    """
    # --- 2. Generate Feature Data ---
    active_hours = generate_active_hours(N_SAMPLES)
    hour_sin, hour_cos, circadian_rhythm = create_cyclical_time_features(active_hours)
    motion_state = generate_motion_state(circadian_rhythm)
    displacement_m = generate_displacement(circadian_rhythm, motion_state)
    time_since_last_interaction_min = generate_time_since_last_interaction(circadian_rhythm)
    missed_ping_count = generate_missed_ping_count(active_hours, circadian_rhythm)
    area_risk = generate_area_risk_labels(N_SAMPLES)
    battery_level_percent = generate_battery_level(active_hours)
    is_expected_active = generate_expected_activity(circadian_rhythm, displacement_m)

    # --- 3. Create DataFrame for Analysis ---
    features_dict = {
        'hour': active_hours,
        'hour_sin': hour_sin,
        'hour_cos': hour_cos,
        'motion_state': motion_state,
        'displacement_m': displacement_m,
        'time_since_last_interaction_min': time_since_last_interaction_min,
        'missed_ping_count': missed_ping_count,
        'area_risk': area_risk,
        'battery_level_percent': battery_level_percent,
        'is_expected_active': is_expected_active
    }
    # Assemble the dataset and save it to a CSV file.
    # To avoid saving, simply call: assemble_dataset(features_dict)
    user_activity_df = assemble_dataset(features_dict, save_path="user_activity_data.csv")


    print("--- Generated User Activity Data (First 5 Rows) ---")
    print(user_activity_df.head())
    print("\n--- Description of Generated Displacement ---")
    print(user_activity_df['displacement_m'].describe())

    # --- 4. Visualization ---
    plt.style.use('seaborn-v0_8-whitegrid')

    # Plot Displacement
    plot_feature_vs_hour(
        user_activity_df,
        'displacement_m',
        'Simulated Hourly Movement vs. Time of Day',
        'Displacement (meters)'
    )

    # Plot Time Since Last Interaction
    plot_feature_vs_hour(
        user_activity_df,
        'time_since_last_interaction_min',
        'Time Since Last Interaction vs. Hour of Day',
        'Time Since Last Interaction (minutes)'
    )

    # Plot Missed Ping Count
    plot_feature_vs_hour(
        user_activity_df,
        'missed_ping_count',
        'Missed Ping Count vs. Hour of Day',
        'Missed Ping Count'
    )
    
    # Plot Battery Level
    plot_feature_vs_hour(
        user_activity_df,
        'battery_level_percent',
        'Phone Battery Level vs. Hour of Day',
        'Battery Level (%)'
    )

    # Plot Area Risk Distribution
    plt.figure(figsize=(6, 4))
    sns.countplot(x='area_risk', data=user_activity_df, order=['low', 'med', 'high'], palette='Set2')
    plt.title('Area Risk Label Distribution', fontsize=14)
    plt.xlabel('Area Risk Label', fontsize=12)
    plt.ylabel('Count', fontsize=12)
    plt.show()

    # Plot Expected Active Probability by Hour
    plt.figure(figsize=(10, 5))
    hourly_expected_active_prob = user_activity_df.groupby('hour')['is_expected_active'].mean()
    sns.barplot(x=hourly_expected_active_prob.index, y=hourly_expected_active_prob.values, palette='Blues')
    plt.title('Expected Active Probability by Hour of Day', fontsize=15)
    plt.xlabel('Hour of Day', fontsize=12)
    plt.ylabel('Probability of Being Active', fontsize=12)
    plt.ylim(0, 1)
    plt.show()

    # Plot Displacement vs. Expected Active State
    plt.figure(figsize=(8, 5))
    sns.stripplot(x='is_expected_active', y='displacement_m', data=user_activity_df, alpha=0.3, jitter=0.25)
    sns.boxplot(
        x='is_expected_active', y='displacement_m', data=user_activity_df,
        showcaps=True, boxprops={'facecolor':'None'},
        showfliers=False, whiskerprops={'linewidth':2}
    )
    plt.title('Total Displacement vs. Expected Active State', fontsize=15)
    plt.xlabel('Expected Active State', fontsize=12)
    plt.ylabel('Total Displacement (meters)', fontsize=12)
    plt.xticks([0, 1], ['Inactive', 'Active'])
    plt.show()

if __name__ == '__main__':
    main()

