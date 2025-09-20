import pandas as pd
import numpy as np
import joblib
import os
from typing import Tuple, Optional

class DropoffModelHandler:
    def __init__(self):
        self.model = None
        self.scaler_info = None
        self.model_path = './isolation_forest_model_dropoff.joblib'
        self.scaler_path = './scaler_and_columns_dropoff.joblib'
    
    def load_model_and_scaler(self) -> bool:
        try:
            if not os.path.exists(self.model_path) or not os.path.exists(self.scaler_path):
                raise FileNotFoundError(f"Model files not found")
            
            self.model = joblib.load(self.model_path)
            self.scaler_info = joblib.load(self.scaler_path)
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def preprocess_data(self, payload_data: dict) -> np.ndarray:
        data = {
            'network_connectivity_state': [payload_data['network_connectivity_state']],
            'acc_vs_loc': [payload_data['acc_vs_loc']],
            'time_since_last_successful_ping': [payload_data['time_since_last_successful_ping']],
            'gps_accuracy_1': [payload_data['gps_accuracy'][0]],
            'gps_accuracy_2': [payload_data['gps_accuracy'][1]],
            'gps_accuracy_3': [payload_data['gps_accuracy'][2]],
            'gps_accuracy_4': [payload_data['gps_accuracy'][3]],
            'gps_accuracy_5': [payload_data['gps_accuracy'][4]],
            'area_risk': [payload_data['area_risk']]
        }
        
        df = pd.DataFrame(data)
        
        one_hot_encoded = pd.get_dummies(df['area_risk'], prefix='area_risk')
        df_processed = df.drop('area_risk', axis=1)
        df_processed = pd.concat([df_processed, one_hot_encoded], axis=1)
        required_columns = self.scaler_info['columns']
        
        df_aligned = df_processed.reindex(columns=required_columns, fill_value=0)
        
        scaler = self.scaler_info['scaler']
        data_scaled = scaler.transform(df_aligned.astype(float))
        
        return data_scaled
    
    def predict_anomaly(self, scaled_data: np.ndarray) -> Tuple[float, bool]:
        anomaly_score = self.model.decision_function(scaled_data)[0]
        is_anomaly = anomaly_score < -0.15
        
        return anomaly_score, is_anomaly
    
    def get_risk_level(self, anomaly_score: float) -> str:
        if anomaly_score < -0.3:
            return "HIGH"
        elif anomaly_score < -0.15:
            return "MEDIUM"
        else:
            return "LOW"
    
    def predict(self, payload_data: dict) -> dict:
        
        scaled_data = self.preprocess_data(payload_data)
        anomaly_score, is_anomaly = self.predict_anomaly(scaled_data)
        risk_level = self.get_risk_level(anomaly_score)
        
        return {
            "is_anomaly": bool(is_anomaly),
            "risk_level": risk_level
        }

model_handler = DropoffModelHandler()