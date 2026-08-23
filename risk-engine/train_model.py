import json
import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "dataset.json")
CONFIRMED_PATH = os.path.join(os.path.dirname(__file__), "confirmed_cases.json")
LIVE_REPORTS_PATH = os.path.join(os.path.dirname(__file__), "live_reports.json")
CITIZEN_REPORTS_PATH = os.path.join(os.path.dirname(__file__), "citizen_reports.json")
RISK_MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
CAUSE_MODEL_PATH = os.path.join(os.path.dirname(__file__), "cause_model.pkl")

RISK_FEATURES = ["turbidity", "ph", "contamination_flag", "case_rate_per_1000"]
CAUSE_FEATURES = ["turbidity", "contamination_flag", "waterborne_symptom_ratio"]

WATERBORNE_SYMPTOMS = {"diarrhea", "vomiting", "jaundice"}

# ==================================================================
# RISK ENGINE 1: FIELD CASE REPORT (Green/Yellow ONLY)

WATER_SOURCES = ["Borewell", "Public Tap", "Tanker Supply", "Handpump", "Open Well", "Other"]

RISK_FACTOR_POINTS = {
    "waterlogging": 2,          # stagnant water breeds contamination + mosquitoes
    "mosquitoes": 2,             # vector/hygiene indicator
    "dirty_muddy_water": 2,      # visible proxy for high turbidity
    "family_members_ill": 3,     # most direct signal - someone is actually sick
}


def citizen_quick_score(dirty_muddy_water, mosquitoes, family_members_ill, waterlogging):
    """
    Takes the 4 checkbox answers exactly as named on the form, returns
    (tier, points, reasons). Tier is CAPPED at Yellow - this engine can
    never produce Orange or Red, by design (see explanation above).
    """
    points = 0
    reasons = []

    if waterlogging:
        points += RISK_FACTOR_POINTS["waterlogging"]
        reasons.append("Waterlogging observed nearby")
    if mosquitoes:
        points += RISK_FACTOR_POINTS["mosquitoes"]
        reasons.append("Mosquitoes observed")
    if dirty_muddy_water:
        points += RISK_FACTOR_POINTS["dirty_muddy_water"]
        reasons.append("Water source appears dirty/muddy")
    if family_members_ill:
        points += RISK_FACTOR_POINTS["family_members_ill"]
        reasons.append("Family member(s) reported ill")

    # Capped at Yellow - any points at all means Yellow, zero means Green.
    tier = "Yellow" if points > 0 else "Green"

    if not reasons:
        reasons.append("No risk factors observed")

    return tier, points, reasons


def load_citizen_reports():
    if os.path.exists(CITIZEN_REPORTS_PATH):
        with open(CITIZEN_REPORTS_PATH, "r") as f:
            return json.load(f)
    return []


def save_citizen_report(record):
    reports = load_citizen_reports()
    reports.append(record)
    with open(CITIZEN_REPORTS_PATH, "w") as f:
        json.dump(reports, f, indent=2)


# ==================================================================
# RISK ENGINE 2: TECHNICAL SCORING (all 4 tiers - Green/Yellow/Orange/Red) measurements: turbidity, ph, contamination_flag, case_rate.
def rule_based_risk_tier(turbidity, ph, contamination_flag, case_rate_per_1000):
    points = 0
    if turbidity > 25: points += 3
    elif turbidity > 10: points += 2
    elif turbidity > 5: points += 1
    if ph < 6.0 or ph > 9.0: points += 1
    if contamination_flag: points += 2
    if case_rate_per_1000 > 1.0: points += 3
    elif case_rate_per_1000 > 0.3: points += 2
    elif case_rate_per_1000 > 0.1: points += 1

    if points >= 6: return "Red"
    elif points >= 4: return "Orange"
    elif points >= 2: return "Yellow"
    else: return "Green"


def rule_based_cause(turbidity, contamination_flag, waterborne_symptom_ratio):
    return (waterborne_symptom_ratio > 0.6) and (contamination_flag or turbidity > 10)

# Load raw data + any admin-confirmed cases added since
def load_confirmed_cases():
    """Confirmed cases start empty. Admin confirmations get appended here."""
    if os.path.exists(CONFIRMED_PATH):
        with open(CONFIRMED_PATH, "r") as f:
            return json.load(f)
    return []


def save_confirmed_case(record):
    cases = load_confirmed_cases()
    cases.append(record)
    with open(CONFIRMED_PATH, "w") as f:
        json.dump(cases, f, indent=2)


def confirm_and_retrain(confirmed_record):
    """
    Combines the two steps that used to be separate endpoints:
    1. Save the admin's confirmed answer as new ground truth
    2. Immediately retrain both models using that updated data

    Returns everything main.py needs to build one response covering
    both what was saved AND what the retrain produced.
    """
    save_confirmed_case(confirmed_record)
    risk_model, cause_model, df = train_all_models(verbose=False)
    return risk_model, cause_model, df


# ------------------------------------------------------------
# Live reports: what USERS actually submit. A user only ever sends: which ward, how many people affected,and what symptom. They never send turbidity, ph, or a risk tier -the system computes risk, the user just reports what they see.
def load_live_reports():
    if os.path.exists(LIVE_REPORTS_PATH):
        with open(LIVE_REPORTS_PATH, "r") as f:
            return json.load(f)
    return []


def save_live_report(ward_id, symptom, people_affected):
    reports = load_live_reports()
    reports.append({
        "ward_id": ward_id,
        "symptom": symptom,
        "case_count": people_affected
    })
    with open(LIVE_REPORTS_PATH, "w") as f:
        json.dump(reports, f, indent=2)


# ------------------------------------------------------------
# Build the feature table from dataset.json (wards, water_readings, reports)
# PLUS any live_reports.json entries submitted by users since then.
# ------------------------------------------------------------
def build_feature_table():
    with open(DATASET_PATH, "r") as f:
        data = json.load(f)

    wards_df = pd.DataFrame(data["wards"])
    water_df = pd.DataFrame(data["water_readings"])

    # Combine dataset's original reports with new live user-submitted reports
    all_reports = data["reports"] + load_live_reports()
    reports_df = pd.DataFrame(all_reports)

    # --- water summary per ward ---
    water_summary = water_df.groupby("ward_id").agg(
        ph=("ph", "mean"),
        contamination_flag=("contamination_flag", "max")
    ).reset_index()

    # --- symptom breakdown per ward (this is new - uses "reports") ---
    # total_reported_cases now reflects ALL reports: original dataset
    # reports PLUS any new ones users submitted through /report-symptom.
    # This is what actually drives case_rate below - so a new user
    # report genuinely moves the risk tier, not just a static number.
    if len(reports_df) > 0:
        reports_df["is_waterborne_symptom"] = reports_df["symptom"].isin(WATERBORNE_SYMPTOMS)
        symptom_summary = reports_df.groupby("ward_id").apply(
            lambda g: pd.Series({
                "total_reported_cases": g["case_count"].sum(),
                "waterborne_symptom_cases": g.loc[g["is_waterborne_symptom"], "case_count"].sum()
            })
        ).reset_index()
        symptom_summary["waterborne_symptom_ratio"] = (
            symptom_summary["waterborne_symptom_cases"] / symptom_summary["total_reported_cases"]
        ).fillna(0)
    else:
        symptom_summary = pd.DataFrame(columns=["ward_id", "total_reported_cases", "waterborne_symptom_ratio"])

    # --- merge everything into one table, one row per ward ---
    df = wards_df.merge(water_summary, left_on="id", right_on="ward_id", how="left")
    df = df.merge(
        symptom_summary[["ward_id", "total_reported_cases", "waterborne_symptom_ratio"]],
        on="ward_id", how="left"
    )
    df["waterborne_symptom_ratio"] = df["waterborne_symptom_ratio"].fillna(0)
    df["contamination_flag"] = df["contamination_flag"].fillna(False).astype(int)

    # Use actual reported cases if any exist, otherwise fall back to
    # the dataset's original case_count (covers wards with zero reports)
    df["total_reported_cases"] = df["total_reported_cases"].fillna(df["case_count"])
    df["case_rate_per_1000"] = (df["total_reported_cases"] / df["population"]) * 1000

    # --- derive the cause label using a simple rule (our "ground truth" for now) ---
    # Water-plausible if most reported symptoms are GI/water-linked AND
    # (water was flagged contaminated OR turbidity is elevated)
    df["is_waterborne"] = (
        (df["waterborne_symptom_ratio"] > 0.6) &
        ((df["contamination_flag"] == 1) | (df["turbidity"] > 10))
    )

    return df


def merge_confirmed_cases(df):
    """Add any admin-confirmed cases as extra training rows."""
    confirmed = load_confirmed_cases()
    if not confirmed:
        return df
    confirmed_df = pd.DataFrame(confirmed)
    return pd.concat([df, confirmed_df], ignore_index=True)


# ------------------------------------------------------------
# Train both models and save them
def train_all_models(verbose=True):
    df = build_feature_table()
    df = merge_confirmed_cases(df)

    # --- Model 1: risk tier ---
    X_risk = df[RISK_FEATURES]
    y_risk = df["risk_tier"]
    risk_model = RandomForestClassifier(n_estimators=50, max_depth=4, random_state=42)
    risk_model.fit(X_risk, y_risk)
    joblib.dump(risk_model, RISK_MODEL_PATH)

    # --- Model 2: is this waterborne? ---
    X_cause = df[CAUSE_FEATURES]
    y_cause = df["is_waterborne"]
    cause_model = RandomForestClassifier(n_estimators=50, max_depth=4, random_state=42)
    cause_model.fit(X_cause, y_cause)
    joblib.dump(cause_model, CAUSE_MODEL_PATH)

    if verbose:
        print(f"Trained on {len(df)} rows ({len(load_confirmed_cases())} admin-confirmed).")
        print("\nRisk tier feature importance:")
        print(pd.Series(risk_model.feature_importances_, index=RISK_FEATURES).sort_values(ascending=False))
        print("\nWaterborne-cause feature importance:")
        print(pd.Series(cause_model.feature_importances_, index=CAUSE_FEATURES).sort_values(ascending=False))

    return risk_model, cause_model, df


# ------------------------------------------------------------
# Batch scoring: risk tier + cause prediction for EVERY ward at once.
# This is what the dashboard should call - not one ward at a time.
# ------------------------------------------------------------
def score_all_wards(risk_model, cause_model, use_ml=False):
    df = build_feature_table()
    results = []

    for _, row in df.iterrows():
        if use_ml and risk_model is not None:
            risk_tier = risk_model.predict([[
                row["turbidity"], row["ph"], row["contamination_flag"], row["case_rate_per_1000"]
            ]])[0]
        else:
            # Recalculate live from current data (dataset + any new
            # user reports) - NOT the dataset's old static value.
            risk_tier = rule_based_risk_tier(
                row["turbidity"], row["ph"], row["contamination_flag"], row["case_rate_per_1000"]
            )

        if use_ml and cause_model is not None:
            is_waterborne = bool(cause_model.predict([[
                row["turbidity"], row["contamination_flag"], row["waterborne_symptom_ratio"]
            ]])[0])
        else:
            is_waterborne = rule_based_cause(
                row["turbidity"], row["contamination_flag"], row["waterborne_symptom_ratio"]
            )

        results.append({
            "ward_id": int(row["id"]),
            "name": row["name"],
            "risk_tier": risk_tier,
            "total_reported_cases": int(row["total_reported_cases"]),
            "case_rate_per_1000": round(row["case_rate_per_1000"], 3),
            "turbidity": row["turbidity"],
            "is_waterborne_likely": is_waterborne,
            "recommended_action": RECOMMENDED_ACTIONS_LOOKUP.get(risk_tier, "Review manually.")
        })

    return results


RECOMMENDED_ACTIONS_LOOKUP = {
    "Green": "No action needed. Continue routine monitoring.",
    "Yellow": "Increase water testing frequency in this ward.",
    "Orange": "Alert health department. Schedule water source inspection.",
    "Red": "Deploy water testing team immediately. Issue public advisory.",
}


if __name__ == "__main__":
    train_all_models()