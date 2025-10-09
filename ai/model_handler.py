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

#===========================================================

class InactivityModelHandler:
    def __init__(self):
        self.model = None
        self.scaler_info = None
        self.model_path = './isolation_forest_model.joblib'
        self.scaler_path = './scaler_and_columns.joblib'
    
    def load_model_and_scaler(self) -> bool:
        try:
            if not os.path.exists(self.model_path) or not os.path.exists(self.scaler_path):
                raise FileNotFoundError(f"Inactivity model files not found")
            self.model = joblib.load(self.model_path)
            self.scaler_info = joblib.load(self.scaler_path)
            return True
        except Exception as e:
            print(f"Error loading inactivity model: {e}")
            return False
    
    def create_cyclical_time_features(self, hour: int) -> Tuple[float, float]:
        angle = (hour / 24) * 2 * np.pi
        phase_shift = (7 / 24) * 2 * np.pi
        angle_shifted = angle - phase_shift
        
        hour_sin = np.sin(angle_shifted)
        hour_cos = np.cos(angle_shifted)
        
        return hour_sin, hour_cos
    
    def preprocess_data(self, payload_data: dict) -> np.ndarray:
        hour_sin, hour_cos = self.create_cyclical_time_features(payload_data['hour'])
        
        data = {
            'hour_sin': [hour_sin],
            'hour_cos': [hour_cos],
            'motion_state': [payload_data['motion_state']],
            'displacement_m': [payload_data['displacement_m']],
            'time_since_last_interaction_min': [payload_data['time_since_last_interaction_min']],
            'missed_ping_count': [payload_data['missed_ping_count']],
            'area_risk': [payload_data['area_risk']],
            'battery_level_percent': [payload_data['battery_level_percent']],
            'is_expected_active': [payload_data['is_expected_active']]
        }
        
        df = pd.DataFrame(data)
        
        one_hot_encoded = pd.get_dummies(df['area_risk'], prefix='risk')
        df_processed = df.drop('area_risk', axis=1)
        df_processed = pd.concat([df_processed, one_hot_encoded], axis=1)
        required_columns = self.scaler_info['columns']

        df_aligned = df_processed.reindex(columns=required_columns, fill_value=0)

        scaler = self.scaler_info['scaler']
        data_scaled = scaler.transform(df_aligned.astype(float))
        
        return data_scaled
    
    def predict_anomaly(self, scaled_data: np.ndarray) -> Tuple[float, bool]:
        anomaly_score = self.model.decision_function(scaled_data)[0]
        
        is_anomaly = anomaly_score < -0.1
        
        return anomaly_score, is_anomaly
    
    def get_risk_level(self, anomaly_score: float) -> str:
        if anomaly_score < -0.2:
            return "HIGH"
        elif anomaly_score < -0.1:
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

# Global instance
inactivity_model_handler = InactivityModelHandler()
