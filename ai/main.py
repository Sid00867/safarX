from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List

app = FastAPI()

class DataPayload(BaseModel):
    network_connectivity_state: int
    acc_vs_loc: int
    time_since_last_successful_ping: int
    gps_accuracy: List[float] = Field(..., min_items=5, max_items=5)
    area_risk: str

@app.post("/api/dropoff")
async def receive_data(payload: DataPayload):
    print("Received Data:", payload)
    return {"message": "Data received successfully"}



class InactivityPayload(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    motion_state: int = Field(..., ge=0, le=1)
    displacement_m: float
    time_since_last_interaction_min: int
    missed_ping_count: int
    area_risk: str
    battery_level_percent: int = Field(..., ge=0, le=100)
    is_expected_active: int = Field(..., ge=0, le=1)

@app.post("/api/inactivity")
async def receive_inactivity(payload: InactivityPayload):
    print("Received inactivity payload:", payload)
    return {"message": "Inactivity data received"}



class TestPayload(BaseModel):
    message: str

@app.post("/test")
async def test_endpoint(payload: TestPayload):
    print("Received:", payload.message)
    return {"status": "ok", "echo": payload.message}
