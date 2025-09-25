import pandas as pd
import numpy as np
import joblib

def load_model_and_scaler(model_path, scaler_path):
    try:
        model = joblib.load(model_path)
        scaler_info = joblib.load(scaler_path)
        return model, scaler_info
    except FileNotFoundError:
        print(f"Error: Model or scaler files not found at '{model_path}' or '{scaler_path}'.")
        print("Please run the 'train_model.py' script first.")
        return None, None

def preprocess_for_inference(df_new, scaler, required_columns):
    one_hot_encoded = pd.get_dummies(df_new['area_risk'], prefix='risk')
    df_processed = df_new.drop('area_risk', axis=1)
    df_processed = pd.concat([df_processed, one_hot_encoded], axis=1)

    df_aligned = df_processed.reindex(columns=required_columns, fill_value=0)

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
    scores = model.decision_function(scaled_data_new)
    
    predictions = scores < -0.15
    
    df_new['anomaly_score'] = scores
    df_new['is_anomaly'] = predictions
    
    return df_new

if __name__ == '__main__':
    MODEL_SAVE_PATH = 'isolation_forest_model_dropoff.joblib'
    SCALER_SAVE_PATH = 'scaler_and_columns_dropoff.joblib'

    model, scaler_info = load_model_and_scaler(MODEL_SAVE_PATH, SCALER_SAVE_PATH)
    
    if model and scaler_info:
        scaler = scaler_info['scaler']
        training_columns = scaler_info['columns']
        
        # --- Create Sample New Data for Inference ---
        # This data includes some potentially normal and anomalous points.
        # new_data = pd.DataFrame([
        #         [1, 1, 12, 8.5, 9.2, 11.1, 7.8, 10.4, 'low'], # False
        #         [1, 1, 5, 14.2, 13.1, 12.5, 15.0, 11.9, 'low'], # False
        #         [0, 1, 95, 45.1, 52.8, 39.4, 61.2, 48.5, 'med'], # True
        #         [1, 1, 22, 9.1, 8.8, 10.5, 12.3, 9.7, 'low'], # False
        #         [1, 0, 18, 15.6, 17.2, 19.1, 22.4, 25.0, 'med'], # True
        #         [1, 1, 2, 6.7, 5.9, 8.2, 7.5, 6.1, 'low'], # False
        #         [1, 1, 31, 11.3, 13.4, 10.8, 14.1, 12.5, 'low'], # False
        #         [0, 0, 121, 78.4, 85.2, 69.1, 92.5, 81.3, 'high'], # True
        #         [1, 1, 8, 25.1, 22.8, 29.3, 31.4, 27.6, 'low'], # False
        #         [1, 1, 14, 10.1, 9.5, 11.8, 10.9, 12.2, 'med'], # False
        #         [1, 1, 4, 7.2, 8.1, 6.9, 7.7, 8.5, 'low'], # False
        #         [1, 0, 25, 18.2, 21.5, 19.9, 23.1, 20.4, 'high'], # True
        #         [1, 1, 19, 13.7, 14.8, 12.9, 15.2, 13.3, 'low'], # False
        #         [0, 1, 65, 33.1, 35.8, 40.2, 38.6, 36.4, 'low'], # True
        #         [1, 1, 7, 8.9, 9.4, 8.1, 9.8, 10.3, 'low'], # False
        #         [1, 1, 1, 5.5, 6.3, 4.9, 5.8, 6.1, 'low'], # False
        #         [1, 1, 41, 16.2, 18.9, 17.5, 19.3, 20.1, 'low'], # False
        #         [1, 1, 98, 12.1, 14.2, 13.5, 11.9, 15.0, 'low'], # True
        #         [1, 1, 11, 10.8, 11.5, 9.9, 12.1, 11.2, 'med'], # False
        #         [0, 1, 88, 25.4, 29.1, 33.2, 30.5, 28.8, 'med'], # True
        #         [1, 1, 16, 9.3, 10.1, 8.7, 11.0, 9.6, 'low'], # False
        #         [1, 1, 3, 7.8, 8.5, 7.2, 8.9, 7.5, 'low'], # False
        #         [1, 1, 24, 14.5, 15.9, 13.8, 16.1, 14.2, 'low'], # False
        #         [1, 1, 6, 8.2, 9.0, 7.8, 9.5, 8.4, 'low'], # False
        #         [1, 0, 5, 10.2, 11.1, 9.8, 10.5, 11.9, 'med'], # True
        #         [1, 1, 13, 11.9, 12.8, 11.2, 13.1, 12.4, 'low'], # False
        #         [1, 1, 28, 15.1, 16.8, 14.9, 17.2, 15.5, 'low'], # False
        #         [1, 1, 5, 8.0, 8.8, 7.5, 9.2, 8.1, 'low'], # False
        #         [0, 0, 150, 55.2, 63.1, 49.8, 70.4, 61.9, 'high'], # True
        #         [1, 1, 17, 12.4, 13.6, 11.8, 14.0, 12.9, 'med'], # False
        #         [1, 1, 1, 99.1, 110.4, 85.2, 121.6, 105.3, 'low'], # True
        #         [1, 1, 9, 9.7, 10.6, 9.1, 11.2, 10.0, 'low'], # False
        #         [1, 1, 21, 13.1, 14.4, 12.5, 15.0, 13.4, 'low'], # False
        #         [1, 1, 35, 18.8, 20.1, 19.2, 21.3, 19.9, 'med'], # False
        #         [0, 1, 72, 41.3, 44.9, 38.7, 47.2, 42.5, 'med'], # True
        #         [1, 1, 2, 6.1, 7.0, 5.8, 6.5, 6.9, 'low'], # False
        #         [1, 0, 15, 12.2, 13.9, 11.7, 14.1, 13.0, 'low'], # False
        #         [1, 1, 10, 10.4, 11.2, 9.8, 11.9, 10.7, 'low'], # False
        #         [1, 1, 29, 14.8, 16.2, 14.1, 16.9, 15.3, 'low'], # False
        #         [1, 1, 8, 8.6, 9.5, 8.2, 10.1, 8.9, 'med'], # False
        #         [0, 1, 180, 22.5, 25.1, 21.9, 27.3, 24.8, 'low'], # True
        #         [1, 1, 15, 11.6, 12.9, 10.9, 13.5, 11.9, 'low'], # False
        #         [1, 1, 4, 7.4, 8.3, 6.9, 8.0, 7.8, 'low'], # False
        #         [1, 0, 44, 21.0, 23.5, 20.1, 25.2, 22.8, 'high'], # True
        #         [1, 1, 23, 13.9, 15.1, 13.2, 15.8, 14.3, 'low'], # False
        #         [1, 1, 1, 5.2, 6.0, 4.8, 5.5, 5.9, 'low'], # False
        #         [1, 1, 58, 19.5, 22.1, 18.9, 24.3, 21.8, 'low'], # True
        #         [1, 1, 18, 12.8, 14.0, 12.1, 14.6, 13.1, 'med'], # False
        #         [1, 1, 33, 17.1, 19.0, 16.8, 20.2, 18.5, 'low'], # False
        #         [0, 0, 92, 35.6, 39.2, 33.8, 42.1, 37.9, 'med'] # True
        # ], columns=[
        #     'network_connectivity_state',
        #     'acc_vs_loc',
        #     'time_since_last_successful_ping',
        #     'gps_accuracy_1',
        #     'gps_accuracy_2',
        #     'gps_accuracy_3',
        #     'gps_accuracy_4',
        #     'gps_accuracy_5',
        #     'area_risk'
        # ])


        new_data = pd.read_csv('tourist_safety_dataset_test.csv')

        print("--- New Data for Inference ---")
        print(new_data)
        print("\n" + "="*30 + "\n")

        scaled_new_data = preprocess_for_inference(new_data, scaler, training_columns)
        
        results_df = predict_anomalies(model, new_data, scaled_new_data)
        
        print("--- Inference Results ---")
        print(results_df)

        results_df.to_csv('inference_results.txt', index=False, sep='\t')
        print("\nResults have been saved to 'inference_results.txt'")
