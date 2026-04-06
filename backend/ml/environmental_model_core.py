import json
import math
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "environmental_risk_model.json")
TRAINING_DATA_PATH = os.path.join(BASE_DIR, "data", "bootstrap_environmental_training_data.json")
DEFAULT_MODEL_VERSION = "fg-env-baseline-v2"

FEATURE_NAMES = [
    "rainfall_pressure",
    "humidity_pressure",
    "heat_pressure",
    "vegetation_stress",
    "soil_stress",
    "report_density",
    "evidence_bonus",
    "interaction_pressure",
    "livestock_pressure",
    "crop_pressure",
    "environmental_pressure",
]

FEATURE_META = {
    "rainfall_pressure": {"code": "RAINFALL_PRESSURE", "label": "Rainfall and moisture pressure"},
    "humidity_pressure": {"code": "HUMIDITY_PRESSURE", "label": "Humidity-supported spread risk"},
    "heat_pressure": {"code": "HEAT_STRESS", "label": "Heat stress conditions"},
    "vegetation_stress": {"code": "VEGETATION_STRESS", "label": "Vegetation and pasture stress"},
    "soil_stress": {"code": "SOIL_STRESS", "label": "Soil moisture imbalance"},
    "report_density": {"code": "REPORT_PRESSURE", "label": "Recent outbreak reports"},
    "evidence_bonus": {"code": "SIGNAL_CONFIDENCE", "label": "Multi-source environmental evidence"},
    "interaction_pressure": {"code": "COMBINED_PRESSURE", "label": "Compound environmental pressure"},
    "livestock_pressure": {"code": "LIVESTOCK_SIGNAL", "label": "Livestock-specific pressure"},
    "crop_pressure": {"code": "CROP_SIGNAL", "label": "Crop-specific pressure"},
    "environmental_pressure": {"code": "ENVIRONMENT_SIGNAL", "label": "Environmental incident pressure"},
}


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def safe_number(value, fallback=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(fallback)


def sigmoid(value):
    return 1.0 / (1.0 + math.exp(-value))


def ensure_parent_dir(path_value):
    os.makedirs(os.path.dirname(path_value), exist_ok=True)


def build_band(score):
    if score >= 10:
        return "CRITICAL"
    if score >= 6.5:
        return "HIGH"
    if score >= 3.5:
        return "MEDIUM"
    return "LOW"


def normalize_inputs(county_payload):
    environmental = county_payload.get("environmental") or {}
    report_pressure = county_payload.get("reportPressure") or {}

    normalized_environmental = {
        "rainfallMm": safe_number(environmental.get("rainfallMm")),
        "humidityPct": safe_number(environmental.get("humidityPct")),
        "temperatureC": safe_number(environmental.get("temperatureC")),
        "vegetationIndex": safe_number(environmental.get("vegetationIndex"), 50.0),
        "soilMoisturePct": safe_number(environmental.get("soilMoisturePct"), 50.0),
    }
    normalized_report_pressure = {
        "totalReports": safe_number(report_pressure.get("totalReports")),
        "highRiskReports": safe_number(report_pressure.get("highRiskReports")),
        "verifiedReports": safe_number(report_pressure.get("verifiedReports")),
        "livestockReports": safe_number(report_pressure.get("livestockReports")),
        "cropReports": safe_number(report_pressure.get("cropReports")),
        "environmentReports": safe_number(report_pressure.get("environmentReports")),
    }

    signal_count = safe_number(county_payload.get("signalCount"))
    source_types = county_payload.get("sourceTypes") or []
    source_count = float(len(source_types))

    return normalized_environmental, normalized_report_pressure, signal_count, source_count


def build_feature_map(county_payload):
    environmental, report_pressure, signal_count, source_count = normalize_inputs(county_payload)

    rainfall_pressure = clamp(environmental["rainfallMm"] / 95.0, 0.0, 1.45)
    humidity_pressure = clamp((environmental["humidityPct"] - 55.0) / 30.0, 0.0, 1.35)
    heat_pressure = clamp((environmental["temperatureC"] - 27.0) / 8.0, 0.0, 1.4)
    vegetation_stress = clamp((58.0 - environmental["vegetationIndex"]) / 28.0, 0.0, 1.65)
    soil_stress = max(
        clamp((30.0 - environmental["soilMoisturePct"]) / 24.0, 0.0, 1.2),
        clamp((environmental["soilMoisturePct"] - 76.0) / 20.0, 0.0, 0.9),
    )
    report_density = (
        report_pressure["totalReports"] * 0.34
        + report_pressure["highRiskReports"] * 0.62
        + report_pressure["verifiedReports"] * 0.16
    )
    evidence_bonus = min(signal_count * 0.08 + source_count * 0.12, 0.8)
    interaction_pressure = rainfall_pressure * humidity_pressure * 0.36 + vegetation_stress * heat_pressure * 0.24
    livestock_pressure = (
        report_pressure["livestockReports"] * 0.36
        + (1.0 if environmental["humidityPct"] >= 70 else 0.0)
        + (1.0 if environmental["rainfallMm"] >= 45 else 0.0)
    )
    crop_pressure = (
        report_pressure["cropReports"] * 0.36
        + (1.1 if environmental["vegetationIndex"] <= 45 else 0.0)
        + (0.8 if environmental["temperatureC"] >= 30 else 0.0)
    )
    environmental_pressure = (
        report_pressure["environmentReports"] * 0.36
        + (0.9 if environmental["rainfallMm"] >= 60 else 0.0)
        + (0.7 if environmental["soilMoisturePct"] >= 80 else 0.0)
    )

    return {
        "rainfall_pressure": rainfall_pressure,
        "humidity_pressure": humidity_pressure,
        "heat_pressure": heat_pressure,
        "vegetation_stress": vegetation_stress,
        "soil_stress": soil_stress,
        "report_density": report_density,
        "evidence_bonus": evidence_bonus,
        "interaction_pressure": interaction_pressure,
        "livestock_pressure": livestock_pressure,
        "crop_pressure": crop_pressure,
        "environmental_pressure": environmental_pressure,
    }, environmental, report_pressure, signal_count, source_count


def build_feature_vector(feature_map):
    return [safe_number(feature_map.get(name)) for name in FEATURE_NAMES]


def default_model():
    return {
        "modelVersion": DEFAULT_MODEL_VERSION,
        "trained": False,
        "trainedAt": None,
        "trainingSamples": 0,
        "featureNames": FEATURE_NAMES,
        "featureMeans": [0.0 for _ in FEATURE_NAMES],
        "featureStds": [1.0 for _ in FEATURE_NAMES],
        "weights": [0.98, 0.84, 0.71, 1.14, 0.62, 1.08, 0.56, 0.67, 0.19, 0.24, 0.18],
        "intercept": -1.82,
        "metrics": {
            "source": "baseline",
            "accuracy": None,
            "loss": None,
        },
    }


def load_model(model_path=MODEL_PATH):
    if not os.path.exists(model_path):
        return default_model()

    try:
        with open(model_path, "r", encoding="utf-8") as file_handle:
            payload = json.load(file_handle)
    except (OSError, json.JSONDecodeError):
        return default_model()

    if not payload.get("featureNames") or not payload.get("weights"):
        return default_model()

    return payload


def standardize_feature_vector(feature_vector, means, stds):
    standardized = []

    for value, mean, std in zip(feature_vector, means, stds):
        safe_std = std if abs(std) > 1e-8 else 1.0
        standardized.append((value - mean) / safe_std)

    return standardized


def score_with_model(feature_vector, model):
    means = model.get("featureMeans") or [0.0 for _ in FEATURE_NAMES]
    stds = model.get("featureStds") or [1.0 for _ in FEATURE_NAMES]
    standardized_vector = standardize_feature_vector(feature_vector, means, stds)
    intercept = safe_number(model.get("intercept"))
    weights = model.get("weights") or []
    raw_logit = intercept

    for weight, value in zip(weights, standardized_vector):
        raw_logit += safe_number(weight) * value

    probability_pct = clamp(round(sigmoid(raw_logit) * 100.0, 1), 1.0, 99.0)
    return raw_logit, probability_pct, standardized_vector


def build_feature_contributions(feature_vector, standardized_vector, model):
    weights = model.get("weights") or []
    contributions = []

    for index, feature_name in enumerate(FEATURE_NAMES):
        weight = safe_number(weights[index] if index < len(weights) else 0.0)
        impact = abs(weight * standardized_vector[index]) * 16.0
        meta = FEATURE_META[feature_name]
        contributions.append(
            {
                "code": meta["code"],
                "label": meta["label"],
                "impact": round(impact, 1),
                "value": round(feature_vector[index], 3),
            }
        )

    contributions.sort(key=lambda item: item["impact"], reverse=True)
    return contributions
