from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import os

from train_model import (
    train_all_models,
    confirm_and_retrain,
    save_live_report,
    score_all_wards,
    citizen_quick_score,
    save_citizen_report,
    RISK_MODEL_PATH,
    CAUSE_MODEL_PATH,
)

app = FastAPI(title="Waterborne Disease Risk + Cause Engine")

risk_model = joblib.load(RISK_MODEL_PATH) if os.path.exists(RISK_MODEL_PATH) else None
cause_model = joblib.load(CAUSE_MODEL_PATH) if os.path.exists(CAUSE_MODEL_PATH) else None

RECOMMENDED_ACTIONS = {
    "Green": "No action needed. Continue routine monitoring.",
    "Yellow": "Increase water testing frequency in this ward.",
    "Orange": "Alert health department. Schedule water source inspection.",
    "Red": "Deploy water testing team immediately. Issue public advisory.",
}


# ==============================================================
# 1. RISK TIER SCORING 
class ScoreRequest(BaseModel):
    turbidity: float
    ph: float
    contamination_flag: bool
    case_count: int
    population: int


class ScoreResponse(BaseModel):
    risk_tier: str
    risk_score: int
    recommended_action: str
    method: str


def rule_based_risk(turbidity, ph, contamination_flag, case_rate_per_1000):
    score = 0
    if turbidity > 25: score += 3
    elif turbidity > 10: score += 2
    elif turbidity > 5: score += 1
    if ph < 6.0 or ph > 9.0: score += 1
    if contamination_flag: score += 2
    if case_rate_per_1000 > 1.0: score += 3
    elif case_rate_per_1000 > 0.3: score += 2
    elif case_rate_per_1000 > 0.1: score += 1

    if score >= 6: tier = "Red"
    elif score >= 4: tier = "Orange"
    elif score >= 2: tier = "Yellow"
    else: tier = "Green"
    return tier, score


@app.post("/score", response_model=ScoreResponse)
def score_ward(data: ScoreRequest, method: str = "rule_based"):
    case_rate_per_1000 = (data.case_count / data.population) * 1000

    if method == "ml" and risk_model is not None:
        features = [[data.turbidity, data.ph, int(data.contamination_flag), case_rate_per_1000]]
        tier = risk_model.predict(features)[0]
        _, score = rule_based_risk(data.turbidity, data.ph, data.contamination_flag, case_rate_per_1000)
        used_method = "ml"
    else:
        tier, score = rule_based_risk(data.turbidity, data.ph, data.contamination_flag, case_rate_per_1000)
        used_method = "rule_based"

    return ScoreResponse(
        risk_tier=tier,
        risk_score=score,
        recommended_action=RECOMMENDED_ACTIONS[tier],
        method=used_method,
    )


# ==============================================================
# 2. BATCH SCORING - risk tier + cause prediction for EVERY ward.
@app.get("/wards/risk-summary")
def wards_risk_summary(method: str = "rule_based"):
    use_ml = (method == "ml")
    results = score_all_wards(risk_model, cause_model, use_ml=use_ml)
    return {"method": method, "wards": results}


# ==============================================================
# 3. FIELD CASE REPORT 
class FieldCaseReportRequest(BaseModel):
    ward_id: int
    water_source: str           # "Borewell", "Public Tap", "Tanker Supply", etc.
    dirty_muddy_water: bool
    mosquitoes: bool
    family_members_ill: bool
    waterlogging: bool
    symptom: str = None         # optional: what symptom, if family_members_ill is true


class FieldCaseReportResponse(BaseModel):
    report_id: str
    risk_tier: str                # only ever "Green" or "Yellow" from this engine
    status: str                    # "Suspected" until admin confirms
    reasons: list[str]             # plain-English explanation, not just a label
    message: str


_report_counter = [1043]  # matches the #RPT-1043 style seen in the table

@app.post("/citizen-report", response_model=FieldCaseReportResponse)
def citizen_report(data: FieldCaseReportRequest):
    """
    RISK ENGINE 1 - field/citizen observations only.
    This can NEVER return Orange/Red and NEVER triggers a confirmed
    alert by itself - it's a soft early "Suspected" signal only.
    The actual confirmed alert only ever comes from Risk Engine 2
    (turbidity/ph based), via /wards/risk-summary or /score.
    """
    tier, points, reasons = citizen_quick_score(
        data.dirty_muddy_water, data.mosquitoes, data.family_members_ill, data.waterlogging
    )

    _report_counter[0] += 1
    report_id = f"RPT-{_report_counter[0]}"

    # Save every report (not just risky ones) - this feeds future retraining once confirmed cases build up a real pattern.
    save_citizen_report({
        "report_id": report_id,
        "ward_id": data.ward_id,
        "water_source": data.water_source,
        "dirty_muddy_water": data.dirty_muddy_water,
        "mosquitoes": data.mosquitoes,
        "family_members_ill": data.family_members_ill,
        "waterlogging": data.waterlogging,
        "symptom": data.symptom,
        "risk_tier": tier,
        "points": points,
        "status": "Suspected",
    })

    # If they mentioned illness, also count it toward that ward's case rate - this can push Risk Engine 2's tier up over time.
    if data.family_members_ill and data.symptom:
        save_live_report(data.ward_id, data.symptom, 1)

    return FieldCaseReportResponse(
        report_id=report_id,
        risk_tier=tier,
        status="Suspected",
        reasons=reasons,
        message="Report submitted and marked as Suspected. It will be reviewed by the health department."
    )

# ==============================================================
# 4. ADMIN CONFIRMS + MODEL RETRAINS - combined into ONE step.Admin manually checked the water, confirms yes/no -> this saves that as new ground truth AND immediately retrains both models in the same call. No separate button needed for "update the model."==============================================================
class ConfirmRequest(BaseModel):
    ward_id: int
    turbidity: float
    ph: float
    contamination_flag: bool
    case_rate_per_1000: float
    waterborne_symptom_ratio: float
    risk_tier: str          # admin/health dept's final call on risk tier
    is_waterborne: bool     # admin's final confirmed yes/no on cause


@app.post("/confirm")
def confirm_case(data: ConfirmRequest):
    """
    Admin has manually verified this case (checked the water in person).
    This single call: saves the confirmed answer AND retrains both
    models right away, using dataset.json + all confirmed cases so far -
    including the one just submitted.
    """
    global risk_model, cause_model
    risk_model, cause_model, df = confirm_and_retrain(data.dict())
    return {
        "status": "confirmed_and_retrained",
        "message": "Case confirmed and both models updated using the new data.",
        "total_rows_used": len(df)
    }

@app.get("/")
def health_check():
    return {
        "status": "Risk + cause engine running",
        "risk_model_loaded": risk_model is not None,
        "cause_model_loaded": cause_model is not None,
    }
