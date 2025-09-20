from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List
from model_handler import model_handler
from model_handler import inactivity_model_handler

app = FastAPI()

class DataPayload(BaseModel):
    network_connectivity_state: int
    acc_vs_loc: int
    time_since_last_successful_ping: int
    gps_accuracy: List[float] = Field(..., min_items=5, max_items=5)
    area_risk: str

class PredictionResponse(BaseModel):
    is_anomaly: bool
    risk_level: str

class InactivityPayload(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    motion_state: int = Field(..., ge=0, le=1)
    displacement_m: float
    time_since_last_interaction_min: int
    missed_ping_count: int
    area_risk: str
    battery_level_percent: int = Field(..., ge=0, le=100)
    is_expected_active: int = Field(..., ge=0, le=1)

class InactivityResponse(BaseModel):
    is_anomaly: bool
    risk_level: str

@app.on_event("startup")
async def startup_event():
    model_handler.load_model_and_scaler()
    inactivity_model_handler.load_model_and_scaler()

@app.post("/api/dropoff", response_model=PredictionResponse)
async def predict_dropoff_anomaly(payload: DataPayload):
    try:
        payload_data = {
            'network_connectivity_state': payload.network_connectivity_state,
            'acc_vs_loc': payload.acc_vs_loc,
            'time_since_last_successful_ping': payload.time_since_last_successful_ping,
            'gps_accuracy': payload.gps_accuracy,
            'area_risk': payload.area_risk
        }
        result = model_handler.predict(payload_data)
        
        return PredictionResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/api/inactivity", response_model=InactivityResponse)
async def predict_inactivity_anomaly(payload: InactivityPayload):
    try:
        payload_data = {
            'hour': payload.hour,
            'motion_state': payload.motion_state,
            'displacement_m': payload.displacement_m,
            'time_since_last_interaction_min': payload.time_since_last_interaction_min,
            'missed_ping_count': payload.missed_ping_count,
            'area_risk': payload.area_risk,
            'battery_level_percent': payload.battery_level_percent,
            'is_expected_active': payload.is_expected_active
        }
        
        result = inactivity_model_handler.predict(payload_data)
        return InactivityResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inactivity prediction error: {str(e)}")

class TestPayload(BaseModel):
    message: str

@app.post("/test")
async def test_endpoint(payload: TestPayload):
    print("Received:", payload.message)
    return {"status": "ok", "echo": payload.message}


