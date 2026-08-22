import json
import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

# File paths (all files live in the same folder as this script)
FOLDER=os.path.dirname(__file__)
DATASET_PATH=os.path.join(FOLDER,"..","database","dataset.json")
CONFIRMED_PATH=os.path.join(FOLDER,"confirmed_cases.json")
RISK_MODEL_PATH=os.path.join(FOLDER,"model.pkl")
CAUSE_MODEL_PATH=os.path.join(FOLDER,"cause_model.pkl")

# These symptoms are the ones typically linked to waterborne disease
WATER_SYMPTOMS = ["diarrhea","cholera","vomiting","jaundice"]

# STEP 1: Load confirmed cases (admin-verified data added over time)
def load_confirmed_cases():
    #Returns a list of confirmed cases. Empty list if none exist yet.
    if os.path.exists(CONFIRMED_PATH):
        with open(CONFIRMED_PATH, "r") as file:
            return json.load(file)
    return []

def save_confirmed_case(new_case):
    #Adds one new confirmed case to confirmed_cases.json
    all_cases = load_confirmed_cases()
    all_cases.append(new_case)
    with open(CONFIRMED_PATH, "w") as file:
        json.dump(all_cases, file, indent=2)

# STEP 2: Turn raw dataset.json into one clean row per ward
def build_feature_table():
    # Load the raw JSON file
    with open(DATASET_PATH, "r") as file:
        data = json.load(file)

    wards = data["wards"]
    water_readings = data["water_readings"]
    reports = data["reports"]

    table_rows = []  # we will fill this with one dictionary per ward

    for ward in wards:
        ward_id = ward["id"]

        #  Find all water readings for this ward 
        ph_values = []
        was_contaminated = False
        for reading in water_readings:
            if reading["ward_id"] == ward_id:
                ph_values.append(reading["ph"])
                if reading["contamination_flag"]:
                    was_contaminated = True

        # Average pH (if no readings exist, just use a neutral default)
        if len(ph_values) > 0:
            avg_ph = sum(ph_values) / len(ph_values)
        else:
            avg_ph = 7.0

        #  Find all symptom reports for this ward
        total_cases = 0
        water_symptom_cases = 0
        for report in reports:
            if report["ward_id"] == ward_id:
                total_cases += report["case_count"]
                if report["symptom"] in WATER_SYMPTOMS:
                    water_symptom_cases += report["case_count"]

        # What fraction of symptoms look water-related?
        if total_cases > 0:
            water_symptom_ratio = water_symptom_cases / total_cases
        else:
            water_symptom_ratio = 0.0

        # Case rate per 1000 people (normalizes for ward size) 
        case_rate_per_1000 = (ward["case_count"] / ward["population"]) * 1000

        #  Simple rule to decide if this LOOKS waterborne (this becomes our training label since we don't have real confirmed labels yet - admin confirmations will improve this later)
        is_waterborne = (water_symptom_ratio > 0.6) and (was_contaminated or ward["turbidity"] > 10)

        #  Put everything together as one row 
        table_rows.append({
            "ward_id": ward_id,
            "turbidity": ward["turbidity"],
            "ph": avg_ph,
            "contamination_flag": int(was_contaminated),
            "case_rate_per_1000": case_rate_per_1000,
            "waterborne_symptom_ratio": water_symptom_ratio,
            "risk_tier": ward["risk_tier"],
            "is_waterborne": is_waterborne
        })

    # Turn our list of dictionaries into a pandas table (DataFrame)
    return pd.DataFrame(table_rows)


def add_confirmed_cases_to_table(df):
    #Adds any admin-confirmed rows on top of the original dataset.
    confirmed = load_confirmed_cases()
    if len(confirmed) == 0:
        return df  # nothing new to add
    confirmed_df = pd.DataFrame(confirmed)
    combined = pd.concat([df, confirmed_df], ignore_index=True)
    return combined

# STEP 3: Train both models and save them
def train_all_models(verbose=True):
    df = build_feature_table()
    df = add_confirmed_cases_to_table(df)

    #  Model 1: predicts risk_tier (Green/Yellow/Orange/Red) 
    risk_features = ["turbidity", "ph", "contamination_flag", "case_rate_per_1000"]
    X1 = df[risk_features]
    y1 = df["risk_tier"]

    risk_model = RandomForestClassifier(n_estimators=50, max_depth=4, random_state=42)
    risk_model.fit(X1, y1)
    joblib.dump(risk_model, RISK_MODEL_PATH)

    #  Model 2: predicts is_waterborne (True/False) 
    cause_features = ["turbidity", "contamination_flag", "waterborne_symptom_ratio"]
    X2 = df[cause_features]
    y2 = df["is_waterborne"]

    cause_model = RandomForestClassifier(n_estimators=50, max_depth=4, random_state=42)
    cause_model.fit(X2, y2)
    joblib.dump(cause_model, CAUSE_MODEL_PATH)

    if verbose:
        print(f"Trained on {len(df)} total rows ({len(load_confirmed_cases())} confirmed by admin).")
        print("\nRisk model was trained using these features:", risk_features)
        print("Cause model was trained using these features:", cause_features)

    return risk_model, cause_model, df


# # Run this file directly to train + save both models
# if __name__ == "__main__":
#     train_all_models()
    
if __name__ == "__main__":
    train_all_models(verbose=True)