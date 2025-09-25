import pandas as pd
import numpy as np
import joblib

def load_model_and_scaler(model_path, scaler_path):
    """
    Loads the trained Isolation Forest model and the scaler object.

    Args:
        model_path (str): Path to the saved model file.
        scaler_path (str): Path to the saved scaler and column info file.

    Returns:
        tuple: A tuple containing the loaded model and the scaler/columns dictionary,
               or (None, None) if files are not found.
    """
    try:
        model = joblib.load(model_path)
        scaler_info = joblib.load(scaler_path)
        return model, scaler_info
    except FileNotFoundError:
        print(f"Error: Model or scaler files not found at '{model_path}' or '{scaler_path}'.")
        print("Please run the 'train_model.py' script first.")
        return None, None

def preprocess_for_inference(df_new, scaler, required_columns):
    """
    Preprocesses new data using the already-fitted scaler and ensures column consistency.

    Args:
        df_new (pd.DataFrame): The new, unseen data to be preprocessed.
        scaler (StandardScaler): The scaler loaded from the training phase.
        required_columns (list): The exact list of columns from the training data.

    Returns:
        np.ndarray: The scaled data ready for prediction.
    """

    if 'hour' in df_new.columns:
        df_processed = df_new.drop('hour', axis=1)

    # Perform the same one-hot encoding
    one_hot_encoded = pd.get_dummies(df_new['area_risk'], prefix='risk')
    df_processed = df_new.drop('area_risk', axis=1)
    df_processed = pd.concat([df_processed, one_hot_encoded], axis=1)

    # Reindex the dataframe to match the training columns.
    # This adds any missing columns (e.g., if a risk category was not in the new data)
    # and fills them with 0. It also ensures the order is identical.
    df_aligned = df_processed.reindex(columns=required_columns, fill_value=0)

    # Use the loaded scaler to transform the new data
    data_scaled = scaler.transform(df_aligned.astype(float))
    
    return data_scaled

def predict_anomalies(model, df_new, scaled_data_new):
    """
    Makes anomaly predictions on new data using the loaded model.

    Args:
        model: The loaded Isolation Forest model.
        df_new (pd.DataFrame): The original new data (for appending results).
        scaled_data_new (np.ndarray): The preprocessed new data.

    Returns:
        pd.DataFrame: The input DataFrame with 'anomaly_score' and 'is_anomaly' columns added.
    """
    # Get the raw anomaly scores from the model
    # Scores < 0 are more likely to be anomalies.
    scores = model.decision_function(scaled_data_new)
    
    # Classify as anomaly if the score is below a threshold (e.g., 0)
    predictions = scores < -0.05
    
    # Add results to the original dataframe
    df_new['anomaly_score'] = scores
    df_new['is_anomaly'] = predictions
    
    return df_new

if __name__ == '__main__':
    MODEL_SAVE_PATH = 'isolation_forest_model.joblib'
    SCALER_SAVE_PATH = 'scaler_and_columns.joblib'

    # --- Load Model and Scaler ---
    model, scaler_info = load_model_and_scaler(MODEL_SAVE_PATH, SCALER_SAVE_PATH)
    
    if model and scaler_info:
        scaler = scaler_info['scaler']
        training_columns = scaler_info['columns']
        
        # --- Create Sample New Data for Inference ---
        # This data includes some potentially normal and anomalous points.
        new_data = pd.DataFrame({
            'hour': [0, 2, 4, 6, 8, 9, 11, 12, 13, 14, 
                    15, 16, 17, 18, 19, 20, 21, 22, 23, 5],
            'hour_sin': [0.0, -0.909, -0.707, -0.5, 0.0, 0.987, 0.866, 0.0, 0.422, 0.965,
                        0.707, -0.276, -0.966, -0.258, 0.5, 0.866, -0.989, -0.707, -0.5, -0.707],
            'hour_cos': [1.0, -0.416, -0.707, 0.866, 1.0, 0.156, 0.5, -1.0, -0.907, -0.258,
                        -0.707, -0.961, -0.259, -0.965, 0.866, 0.5, -0.147, -0.707, -0.866, 0.707],
            'motion_state': [0,0,1,0,1,1,1,0,1,1,
                            0,1,0,1,1,0,0,0,1,0],
            'displacement_m': [20, 7000, 200, 0, 500, 50, 3000, 100, 6000, 15000,
                            100, 50, 0, 450, 2000, 80, 30, 50, 500, 0],
            'time_since_last_interaction_min': [1000, 2500, 60, 30, 200, 800, 15, 500, 20, 40,
                                                1000, 50, 2000, 600, 10, 1500, 120, 900, 5, 1800],
            'missed_ping_count': [0, 8, 0, 0, 1, 0, 0, 2, 0, 0,
                                3, 0, 6, 2, 0, 4, 1, 1, 0, 5],
            'area_risk': ['low','high','low','low','med','med','low','med','low','low',
                        'high','low','high','low','low','med','low','low','low','high'],
            'battery_level_percent': [90, 85, 70, 95, 80, 60, 75, 20, 90, 50,
                                    30, 10, 95, 60, 40, 15, 55, 35, 100, 5],
            'is_expected_active': [0,0,1,0,1,1,1,0,1,1,
                                0,1,0,1,1,0,0,0,1,0]
        })


        print("--- New Data for Inference ---")
        print(new_data)
        print("\n" + "="*30 + "\n")

        # --- Make Predictions ---
        # 1. Preprocess the new data
        scaled_new_data = preprocess_for_inference(new_data, scaler, training_columns)
        
        # 2. Get anomaly predictions
        results_df = predict_anomalies(model, new_data, scaled_new_data)
        
        print("--- Inference Results ---")
        print(results_df)

        # INSERT_YOUR_CODE
        # Output the results to a text file
        results_df.to_csv('inference_results.txt', index=False, sep='\t')
        print("\nResults have been saved to 'inference_results.txt'")
