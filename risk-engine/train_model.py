from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

app = FastAPI(title="JalRakshak Risk Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "model.pkl"
DATA_STORE_PATH = "admin_confirmations.csv"

# Global Model Initializer
model = None

def load_or_train_initial_model():
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
    else:
        # Seed initial dataset for training baseline model
        np.random.seed(42)
        X_dummy = np.random.rand(100, 4)
        X_dummy[:, 0] *= 15   # Turbidity (0-15 NTU)
        X_dummy[:, 1] = 6 + X_dummy[:, 1] * 3.5 # pH (6.0-9.5)
        X_dummy[:, 2] *= 5    # Case rate per 1000
        X_dummy[:, 3] *= 1    # Waterborne symptom ratio (0.0-1.0)
        
        # Rule for initial targets: Turbidity > 5 or high case rate -> risk class 1
        y_dummy = ((X_dummy[:, 0] > 5.0) | (X_dummy[:, 2] > 2.0)).astype(int)
        
        model = RandomForestClassifier(n_estimators=50, random_state=42)
        model.fit(X_dummy, y_dummy)
        joblib.dump(model, MODEL_PATH)

load_or_train_initial_model()

# --- Request / Response Models ---
class ScoreRequest(BaseModel):
    ward_id: str
    turbidity: float = Field(..., ge=0.0)
    ph: float = Field(..., ge=0.0, le=14.0)
    population: int = Field(..., gt=0)
    case_count: int = Field(..., ge=0)
    contamination_flag: bool = False

class ConfirmRequest(BaseModel):
    ward_id: int
    turbidity: float
    ph: float
    contamination_flag: bool
    case_rate_per_1000: float
    waterborne_symptom_ratio: float
    risk_tier: str
    is_waterborne: bool

@app.get("/")
def health_check():
    return {"status": "ok", "engine": "JalRakshak ML Risk Service"}

@app.post("/score")
def calculate_score(data: ScoreRequest):
    case_rate = (data.case_count / data.population) * 1000
    
    # Rule-Based Risk Points Setup
    score = 0
    if data.turbidity > 5.0: score += 35
    if data.ph < 6.5 or data.ph > 8.5: score += 20
    if case_rate > 1.5: score += 30
    if data.contamination_flag: score += 15

    # Assign Risk Tier
    if score >= 70:
        tier = "Red"
        action = "Issue immediate boil-water advisory and dispatch emergency response team."
    elif score >= 45:
        tier = "Orange"
        action = "Inspect local water pipelines and intensify field testing."
    elif score >= 20:
        tier = "Yellow"
        action = "Monitor ward water samples daily for potential degradation."
    else:
        tier = "Green"
        action = "Routine monitoring; water quality parameters within normal thresholds."

    return {
        "ward_id": data.ward_id,
        "risk_score": score,
        "risk_tier": tier,
        "recommended_action": action
    }

@app.post("/confirm")
def save_confirmation(data: ConfirmRequest):
    file_exists = os.path.exists(DATA_STORE_PATH)
    df = pd.DataFrame([{
        "ward_id": data.ward_id,
        "turbidity": data.turbidity,
        "ph": data.ph,
        "case_rate_per_1000": data.case_rate_per_1000,
        "waterborne_symptom_ratio": data.waterborne_symptom_ratio,
        "risk_tier": data.risk_tier,
        "is_waterborne": int(data.is_waterborne)
    }])
    
    df.to_csv(DATA_STORE_PATH, mode='a', header=not file_exists, index=False)
    return {"status": "success", "message": f"Confirmation logged for Ward {data.ward_id}."}

@app.post("/retrain")
def retrain_model():
    global model
    if not os.path.exists(DATA_STORE_PATH):
        raise HTTPException(status_code=400, detail="No feedback data available for retraining.")
    
    df = pd.read_csv(DATA_STORE_PATH)
    if len(df) < 2:
        raise HTTPException(status_code=400, detail="Insufficient records for model retraining (minimum 2 needed).")
    
    X = df[["turbidity", "ph", "case_rate_per_1000", "waterborne_symptom_ratio"]]
    y = df["is_waterborne"]
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)
    
    return {"status": "success", "total_rows_used": len(df)}

@app.get("/wards/risk-summary")
def get_ward_risk_summary(method: str = "ml"):
    # Simulated Ward Summary Output
    sample_wards = [
        {"ward_id": "7", "name": "Ward 7 - Kalwa", "turbidity": 12.5, "ph": 7.2, "total_reported_cases": 18, "risk_tier": "Red", "lat": 19.1982, "lng": 72.9924},
        {"ward_id": "12", "name": "Ward 12 - Mumbra", "turbidity": 8.1, "ph": 6.8, "total_reported_cases": 12, "risk_tier": "Orange", "lat": 19.1909, "lng": 73.0227},
        {"ward_id": "15", "name": "Ward 15 - Vartak Nagar", "turbidity": 3.4, "ph": 7.4, "total_reported_cases": 4, "risk_tier": "Yellow", "lat": 19.2155, "lng": 72.9644},
        {"ward_id": "4", "name": "Ward 4 - Naupada", "turbidity": 1.2, "ph": 7.1, "total_reported_cases": 1, "risk_tier": "Green", "lat": 19.1868, "lng": 72.9734},
    ]
    return {"method": method, "wards": sample_wards}