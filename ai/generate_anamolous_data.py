import pandas as pd
import numpy as np
import random

def generate_normal_sample():
    """Generates a single data sample representing a normal event."""
    
    # High probability of being connected and consistent
    network_connectivity = 1
    acc_vs_loc = 1
    
    # Time since ping follows an exponential distribution with a mean of 15 mins
    time_since_ping = int(np.random.exponential(scale=15))
    
    # Good GPS accuracy, typically between 3 and 20 meters
    gps_accuracies = np.random.uniform(low=3.0, high=20.0, size=5).tolist()
    
    # Area risk is heavily weighted towards 'low'
    area_risk = random.choices(['low', 'med', 'high'], weights=[0.85, 0.13, 0.02], k=1)[0]
    
    is_anomaly = False
    
    return [network_connectivity, acc_vs_loc, time_since_ping] + gps_accuracies + [area_risk, is_anomaly]

def generate_anomalous_sample():
    """
    Generates a single data sample representing an anomalous event.
    Anomalies are created based on several risky scenarios.
    """
    
    # Randomly select an anomaly type to generate diverse threats
    anomaly_type = random.choice(['connectivity_loss', 'movement_inconsistency', 'poor_gps', 'high_ping_time'])
    
    # Default values
    network_connectivity = 1
    acc_vs_loc = 1
    time_since_ping = int(np.random.exponential(scale=15))
    gps_accuracies = np.random.uniform(low=5.0, high=25.0, size=5).tolist()
    area_risk = random.choices(['low', 'med', 'high'], weights=[0.6, 0.3, 0.1], k=1)[0]
    
    if anomaly_type == 'connectivity_loss':
        # Scenario: Device goes offline for a long time
        network_connectivity = 0
        time_since_ping = int(np.random.uniform(low=60, high=240)) # e.g., 1-4 hours
        gps_accuracies = np.random.uniform(low=30.0, high=100.0, size=5).tolist() # GPS likely poor too
        area_risk = random.choices(['low', 'med', 'high'], weights=[0.2, 0.4, 0.4], k=1)[0]

    elif anomaly_type == 'movement_inconsistency':
        # Scenario: Accelerometer and location data are out of sync, especially in a risky area
        acc_vs_loc = 0
        area_risk = random.choices(['med', 'high'], weights=[0.5, 0.5], k=1)[0]

    elif anomaly_type == 'poor_gps':
        # Scenario: Extremely poor or spoofed GPS signal
        gps_accuracies = np.random.uniform(low=80.0, high=200.0, size=5).tolist()

    elif anomaly_type == 'high_ping_time':
        # Scenario: Device is online but hasn't successfully pinged for a very long time
        time_since_ping = int(np.random.uniform(low=75, high=180))
        
    is_anomaly = True
    
    return [network_connectivity, acc_vs_loc, time_since_ping] + gps_accuracies + [area_risk, is_anomaly]


def create_dataset(n_samples=500, anomaly_fraction=0.2):
    """
    Creates a full dataset with a specified number of samples and anomaly fraction.
    
    Args:
        n_samples (int): The total number of data points to generate.
        anomaly_fraction (float): The fraction of data points that should be anomalies.
        
    Returns:
        pandas.DataFrame: The generated dataset.
    """
    
    n_anomalies = int(n_samples * anomaly_fraction)
    n_normal = n_samples - n_anomalies
    
    data = []
    
    # Generate normal samples
    for _ in range(n_normal):
        data.append(generate_normal_sample())
        
    # Generate anomalous samples
    for _ in range(n_anomalies):
        data.append(generate_anomalous_sample())
        
    # Shuffle the dataset
    random.shuffle(data)
    
    # Define column names
    columns = [
        'network_connectivity_state', 'acc_vs_loc', 'time_since_last_successful_ping',
        'gps_accuracy_1', 'gps_accuracy_2', 'gps_accuracy_3', 'gps_accuracy_4', 'gps_accuracy_5',
        'area_risk', 'is_anomaly'
    ]
    
    df = pd.DataFrame(data, columns=columns)
    
    return df

# --- Main Execution ---
if __name__ == "__main__":
    # Generate the dataset
    synthetic_data = create_dataset(n_samples=500, anomaly_fraction=0.20)
    
    # Print the first few rows of the dataset
    print("--- Generated Dataset Head ---")
    print(synthetic_data.head())
    print("\n" + "="*50 + "\n")
    
    # Print dataset information
    print("--- Dataset Info ---")
    synthetic_data.info()
    print("\n" + "="*50 + "\n")
    
    # Print the distribution of normal vs. anomalous data
    print("--- Anomaly Distribution ---")
    print(synthetic_data['is_anomaly'].value_counts())
    
    # Save the dataset to a CSV file
    try:
        synthetic_data.to_csv("tourist_safety_dataset_test.csv", index=False)
        print("\nSuccessfully saved dataset to 'tourist_safety_dataset_test.csv'")
    except Exception as e:
        print(f"\nCould not save the file. Error: {e}")
