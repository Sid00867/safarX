import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

df = pd.read_csv('./dropoff_data.csv')

df = pd.get_dummies(df, columns=['area_risk'])


feature_cols = [
    'network_connectivity_state',
    'acc_vs_loc',
    'time_since_last_successful_ping',
    'gps_accuracy_1',
    'gps_accuracy_2',
    'gps_accuracy_3',
    'gps_accuracy_4',
    'gps_accuracy_5',
    'area_risk_low',
    'area_risk_med',
    'area_risk_high'
]

# Select features
X = df[feature_cols]

scaler = StandardScaler()
columns = feature_cols
X_scaled = scaler.fit_transform(X)

model = IsolationForest(n_estimators=100, contamination='auto', random_state=42)
model.fit(X_scaled)


model_path = 'isolation_forest_model_dropoff.joblib'
scaler_path = 'scaler_and_columns_dropoff.joblib'

joblib.dump(model, model_path)
print(f"Model saved to {model_path}")

scaler_and_columns = {
    'scaler': scaler,
    'columns': columns
}
joblib.dump(scaler_and_columns, scaler_path)
print(f"Scaler and column info saved to {scaler_path}")
