from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import os

from train_model import train_all_models, save_confirmed_case, RISK_MODEL_PATH, CAUSE_MODEL_PATH

# Create the web app
app = FastAPI(title="Waterborne Disease Risk + Cause Engine")

# Load both trained models when the server starts (so we don't reload them on every single request - that would be slow)
risk_model = None
cause_model = None

if os.path.exists(RISK_MODEL_PATH):
    risk_model = joblib.load(RISK_MODEL_PATH)

if os.path.exists(CAUSE_MODEL_PATH):
    cause_model = joblib.load(CAUSE_MODEL_PATH)

# What to tell the admin to do, per risk tier
ACTIONS = {
    "Green": "No action needed. Keep monitoring.",
    "Yellow": "Test water more often in this ward.",
    "Orange": "Alert health department. Inspect the water source.",
    "Red": "Send a water testing team now. Issue a public warning.",
}

# ENDPOINT 1: /score  -> how risky is this ward? This describes what data we EXPECT to receive
class ScoreInput(BaseModel):
    turbidity: float
    ph: float
    contamination_flag: bool
    case_count: int
    population: int

def rule_based_risk_score(turbidity, ph, contamination_flag, case_rate):
    """Simple point system: add points for each risky sign, then decide tier."""
    points = 0

    if turbidity > 25:
        points += 3
    elif turbidity > 10:
        points += 2
    elif turbidity > 5:
        points += 1

    if ph < 6.0 or ph > 9.0:
        points += 1

    if contamination_flag:
        points += 2

    if case_rate > 1.0:
        points += 3
    elif case_rate > 0.3:
        points += 2
    elif case_rate > 0.1:
        points += 1

    if points >= 6:
        tier = "Red"
    elif points >= 4:
        tier = "Orange"
    elif points >= 2:
        tier = "Yellow"
    else:
        tier = "Green"

    return tier, points

@app.post("/score")
def score_ward(data: ScoreInput, method: str = "rule_based"):
    # Turn raw case count into a rate that accounts for ward size
    case_rate = (data.case_count / data.population) * 1000

    if method == "ml" and risk_model is not None:
        # Ask the trained ML model
        inputs = [[data.turbidity, data.ph, int(data.contamination_flag), case_rate]]
        tier = risk_model.predict(inputs)[0]
        _, points = rule_based_risk_score(data.turbidity, data.ph, data.contamination_flag, case_rate)
    else:
        # Use the simple rule-based method (default, always works)
        tier, points = rule_based_risk_score(data.turbidity, data.ph, data.contamination_flag, case_rate)

    return {
        "risk_tier": tier,
        "risk_score": points,
        "recommended_action": ACTIONS[tier],
        "method": method
    }

# ENDPOINT 2: /predict-cause -> is this likely water-caused?
class CauseInput(BaseModel):
    ward_id: int
    turbidity: float
    contamination_flag: bool
    waterborne_symptom_ratio: float  # example: 0.8 means 80% of symptoms were diarrhea/vomiting/jaundice

@app.post("/predict-cause")
def predict_cause(data: CauseInput, method: str = "rule_based"):
    if method == "ml" and cause_model is not None:
        inputs = [[data.turbidity, int(data.contamination_flag), data.waterborne_symptom_ratio]]
        is_water_caused = bool(cause_model.predict(inputs)[0])
    else:
        # Simple rule: mostly water-linked symptoms + contaminated/turbid water = likely waterborne
        is_water_caused = (data.waterborne_symptom_ratio > 0.6) and (
            data.contamination_flag or data.turbidity > 10
        )
    return {
        "is_waterborne_likely": is_water_caused,
        "method": method
    }

# ENDPOINT 3: /confirm -> admin saves the REAL confirmed answer
class ConfirmInput(BaseModel):
    ward_id: int
    turbidity: float
    ph: float
    contamination_flag: bool
    case_rate_per_1000: float
    waterborne_symptom_ratio: float
    risk_tier: str
    is_waterborne: bool

@app.post("/confirm")
def confirm_case(data: ConfirmInput):
    # Save this admin-confirmed answer so future retraining includes it
    save_confirmed_case(data.dict())
    return {"status": "saved", "message": "Confirmed case stored. Call /retrain to update the models."}

# ENDPOINT 4: /retrain -> re-train both models with all data so far
@app.post("/retrain")
def retrain_models():
    global risk_model, cause_model
    risk_model, cause_model, df = train_all_models(verbose=False)
    return {
        "status": "done",
        "total_rows_used": len(df)
    }

# Simple health check - just confirms the server is alive
@app.get("/")
def health_check():
    return {
        "status": "Server is running",
        "risk_model_loaded": risk_model is not None,
        "cause_model_loaded": cause_model is not None
    }