import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

def load_and_preprocess_data(filepath):
    """
    Loads and preprocesses the training data. It fits a StandardScaler and returns it
    along with the scaled data and the final column order.

    Args:
        filepath (str): The path to the training CSV file.

    Returns:
        tuple: A tuple containing:
            - np.ndarray: The preprocessed and scaled data ready for training.
            - StandardScaler: The fitted scaler object to be saved for inference.
            - list: The list of column names after preprocessing.
    """
    df = pd.read_csv(filepath)
    df_processed = df.copy()

    # Drop the 'hour' column from the dataframe
    if 'hour' in df_processed.columns:
        df_processed = df_processed.drop('hour', axis=1)

    # --- Preprocessing ---
    # 1. One-hot encode the 'area_risk' feature
    one_hot_encoded = pd.get_dummies(df_processed['area_risk'], prefix='risk')
    df_processed = df_processed.drop('area_risk', axis=1)
    df_processed = pd.concat([df_processed, one_hot_encoded], axis=1)
    
    # Capture the column order after all manipulations
    processed_columns = df_processed.columns.tolist()

    # 2. Fit a scaler on the training data
    scaler = StandardScaler()
    data_scaled = scaler.fit_transform(df_processed.astype(float))
    
    return data_scaled, scaler, processed_columns

def train_and_save_model(data_scaled, scaler, columns, model_path, scaler_path):
    """
    Trains an Isolation Forest model and saves it, the scaler, and column order to files.

    Args:
        data_scaled (np.ndarray): The preprocessed and scaled feature data.
        scaler (StandardScaler): The fitted StandardScaler object.
        columns (list): The list of column names after preprocessing.
        model_path (str): Filepath to save the trained model.
        scaler_path (str): Filepath to save the scaler and column info.
    """
    # Since we are training on a "clean" dataset, contamination can be set to a very small
    # value, or 'auto'. The real thresholding will happen during inference.
    model = IsolationForest(n_estimators=100, contamination='auto', random_state=42)
    
    print("Training the Isolation Forest model...")
    model.fit(data_scaled)
    print("Model training complete.")
    
    # Save the trained model
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")
    
    # Save the scaler and the column order in a single file for convenience
    scaler_and_columns = {
        'scaler': scaler,
        'columns': columns
    }
    joblib.dump(scaler_and_columns, scaler_path)
    print(f"Scaler and column info saved to {scaler_path}")


if __name__ == '__main__':
    TRAINING_DATA_FILE = 'user_activity_data.csv'
    MODEL_SAVE_PATH = 'isolation_forest_model.joblib'
    SCALER_SAVE_PATH = 'scaler_and_columns.joblib'
    
    try:
        # Step 1: Load and preprocess the data
        print(f"Loading data from {TRAINING_DATA_FILE}...")
        scaled_data, fitted_scaler, processed_cols = load_and_preprocess_data(TRAINING_DATA_FILE)
        
        # Step 2: Train the model and save it along with the scaler
        train_and_save_model(scaled_data, fitted_scaler, processed_cols, MODEL_SAVE_PATH, SCALER_SAVE_PATH)

    except FileNotFoundError:
        print(f"Error: The training file '{TRAINING_DATA_FILE}' was not found.")
        print("Please ensure the CSV file is in the correct directory.")
    except Exception as e:
        print(f"An error occurred: {e}")
