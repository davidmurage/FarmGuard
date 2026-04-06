import json
import sys
from datetime import datetime

from environmental_model_core import (
    build_band,
    build_feature_contributions,
    build_feature_map,
    build_feature_vector,
    load_model,
    safe_number,
    score_with_model,
)


def build_dominant_risk(environmental, report_pressure):
    livestock_score = (
        (1.45 if environmental["rainfallMm"] >= 45 else 0.0)
        + (1.25 if environmental["humidityPct"] >= 70 else 0.0)
        + report_pressure["livestockReports"] * 0.72
    )
    crop_score = (
        (1.85 if environmental["vegetationIndex"] <= 45 else 0.0)
        + (1.15 if environmental["temperatureC"] >= 30 else 0.0)
        + (1.1 if environmental["soilMoisturePct"] <= 25 else 0.0)
        + report_pressure["cropReports"] * 0.72
    )
    environmental_score = (
        (1.55 if environmental["rainfallMm"] >= 60 else 0.0)
        + (1.05 if environmental["soilMoisturePct"] >= 80 else 0.0)
        + report_pressure["environmentReports"] * 0.72
    )

    ranked = [
        ("LIVESTOCK", livestock_score),
        ("CROP", crop_score),
        ("ENVIRONMENT", environmental_score),
    ]
    ranked.sort(key=lambda item: item[1], reverse=True)
    return ranked[0][0]


def compute_county_score(county_payload, model):
    feature_map, environmental, report_pressure, signal_count, source_count = build_feature_map(county_payload)
    feature_vector = build_feature_vector(feature_map)
    _, risk_probability_pct, standardized_vector = score_with_model(feature_vector, model)
    heuristic = county_payload.get("heuristic") or {}
    evidence_bonus = feature_map["evidence_bonus"]
    heuristic_score = safe_number(heuristic.get("combinedRiskScore"))
    model_score = min(max((risk_probability_pct / 100.0) * 12.0 + evidence_bonus, 0.6), 12.0)
    combined_risk_score = round(min(max(model_score * 0.76 + heuristic_score * 0.24, 0.5), 12.0), 2)
    band = build_band(combined_risk_score)
    confidence_pct = round(
        min(max(54.0 + signal_count * 6.0 + source_count * 5.0 + report_pressure["totalReports"] * 2.5, 50.0), 98.0),
        1,
    )
    dominant_risk = build_dominant_risk(environmental, report_pressure)
    contributions = build_feature_contributions(feature_vector, standardized_vector, model)
    top_drivers = [
        {"code": item["code"], "label": item["label"]}
        for item in contributions
        if item["impact"] >= 7.0
    ][:3]
    driver_labels = [driver["label"].lower() for driver in top_drivers[:2]]

    if report_pressure["totalReports"] > 0:
        narrative = (
            f'{county_payload.get("county", "This county")} shows {band.lower()} model risk with '
            f'{risk_probability_pct:.1f}% outbreak likelihood because {" and ".join(driver_labels) or "multi-factor pressure"} '
            f'is overlapping with recent field reports.'
        )
    else:
        narrative = (
            f'{county_payload.get("county", "This county")} shows {band.lower()} model risk with '
            f'{risk_probability_pct:.1f}% outbreak likelihood because FarmGuard is seeing '
            f'{" and ".join(driver_labels) or "multi-factor environmental pressure"} before report volumes rise.'
        )

    return {
        "county": county_payload.get("county"),
        "combinedRiskScore": combined_risk_score,
        "riskProbabilityPct": risk_probability_pct,
        "confidencePct": confidence_pct,
        "band": band,
        "dominantRisk": dominant_risk,
        "modelDrivers": top_drivers,
        "modelNarrative": narrative,
        "contributions": contributions[:4],
    }


def main():
    raw_payload = sys.stdin.read().strip()
    payload = json.loads(raw_payload) if raw_payload else {}
    counties = payload.get("counties") or []
    model = load_model()
    scored_counties = [compute_county_score(county, model) for county in counties]
    model_version = model.get("modelVersion", "fg-env-baseline-v2")
    trained = bool(model.get("trained"))
    training_samples = model.get("trainingSamples", 0)
    metrics = model.get("metrics") or {}

    if trained:
        message = f"Python trained model scoring is active using {training_samples} baseline historical samples."
        label = "Python trained model"
    else:
        message = "Python baseline model scoring is active. Retrain with outbreak data to improve the learned weights."
        label = "Python baseline model"

    response = {
        "scoring": {
            "engine": "PYTHON_ML",
            "label": label,
            "status": "online",
            "modelVersion": model_version,
            "message": message,
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "trained": trained,
            "trainedAt": model.get("trainedAt"),
            "trainingSamples": training_samples,
            "metrics": metrics,
        },
        "counties": scored_counties,
    }
    print(json.dumps(response))


if __name__ == "__main__":
    main()
