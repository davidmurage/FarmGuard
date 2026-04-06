import json
import math
from datetime import datetime

from environmental_model_core import (
    FEATURE_NAMES,
    MODEL_PATH,
    TRAINING_DATA_PATH,
    build_feature_map,
    build_feature_vector,
    ensure_parent_dir,
    safe_number,
    sigmoid,
)

EPOCHS = 2600
LEARNING_RATE = 0.14
L2_REGULARIZATION = 0.015


def load_training_samples():
    with open(TRAINING_DATA_PATH, "r", encoding="utf-8") as file_handle:
        return json.load(file_handle)


def build_dataset(samples):
    dataset = []

    for sample in samples:
        county_payload = {
            "environmental": {
                "rainfallMm": sample.get("rainfallMm"),
                "humidityPct": sample.get("humidityPct"),
                "temperatureC": sample.get("temperatureC"),
                "vegetationIndex": sample.get("vegetationIndex"),
                "soilMoisturePct": sample.get("soilMoisturePct"),
            },
            "reportPressure": {
                "totalReports": sample.get("totalReports"),
                "highRiskReports": sample.get("highRiskReports"),
                "verifiedReports": sample.get("verifiedReports"),
                "livestockReports": sample.get("livestockReports"),
                "cropReports": sample.get("cropReports"),
                "environmentReports": sample.get("environmentReports"),
            },
            "signalCount": sample.get("signalCount"),
            "sourceTypes": [f"SOURCE_{index}" for index in range(int(safe_number(sample.get("sourceCount"))))],
        }
        feature_map, _, _, _, _ = build_feature_map(county_payload)
        dataset.append(
            {
                "county": sample.get("county", "Unknown"),
                "features": build_feature_vector(feature_map),
                "target": 1.0 if safe_number(sample.get("outbreakOccurred")) >= 1 else 0.0,
            }
        )

    return dataset


def compute_normalization(vectors):
    feature_count = len(FEATURE_NAMES)
    sample_count = len(vectors)
    means = []
    stds = []

    for index in range(feature_count):
        values = [vector[index] for vector in vectors]
        mean = sum(values) / sample_count
        variance = sum((value - mean) ** 2 for value in values) / sample_count
        std = math.sqrt(variance) or 1.0
        means.append(round(mean, 8))
        stds.append(round(std, 8))

    return means, stds


def standardize_vectors(vectors, means, stds):
    standardized = []

    for vector in vectors:
        standardized.append(
            [
                (value - means[index]) / (stds[index] if abs(stds[index]) > 1e-8 else 1.0)
                for index, value in enumerate(vector)
            ]
        )

    return standardized


def train_logistic_regression(vectors, targets):
    feature_count = len(FEATURE_NAMES)
    weights = [0.0 for _ in range(feature_count)]
    intercept = 0.0
    sample_count = len(vectors)

    for _ in range(EPOCHS):
        gradients = [0.0 for _ in range(feature_count)]
        intercept_gradient = 0.0

        for vector, target in zip(vectors, targets):
            linear_output = intercept + sum(weight * value for weight, value in zip(weights, vector))
            prediction = sigmoid(linear_output)
            error = prediction - target
            intercept_gradient += error

            for index in range(feature_count):
                gradients[index] += error * vector[index]

        intercept -= LEARNING_RATE * (intercept_gradient / sample_count)

        for index in range(feature_count):
            regularized_gradient = gradients[index] / sample_count + (L2_REGULARIZATION * weights[index] / sample_count)
            weights[index] -= LEARNING_RATE * regularized_gradient

    return weights, intercept


def evaluate_model(vectors, targets, weights, intercept):
    losses = []
    correct = 0

    for vector, target in zip(vectors, targets):
        probability = sigmoid(intercept + sum(weight * value for weight, value in zip(weights, vector)))
        probability = min(max(probability, 1e-8), 1 - 1e-8)
        losses.append(-(target * math.log(probability) + (1 - target) * math.log(1 - probability)))
        prediction = 1.0 if probability >= 0.5 else 0.0
        correct += 1 if prediction == target else 0

    return {
        "accuracy": round(correct / len(vectors), 4),
        "loss": round(sum(losses) / len(losses), 4),
        "positiveRate": round(sum(targets) / len(targets), 4),
    }


def main():
    samples = load_training_samples()
    dataset = build_dataset(samples)
    feature_vectors = [entry["features"] for entry in dataset]
    targets = [entry["target"] for entry in dataset]
    means, stds = compute_normalization(feature_vectors)
    standardized_vectors = standardize_vectors(feature_vectors, means, stds)
    weights, intercept = train_logistic_regression(standardized_vectors, targets)
    metrics = evaluate_model(standardized_vectors, targets, weights, intercept)
    trained_at = datetime.utcnow().isoformat() + "Z"

    model_payload = {
        "modelVersion": f"fg-env-trained-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "trained": True,
        "trainedAt": trained_at,
        "trainingSamples": len(dataset),
        "featureNames": FEATURE_NAMES,
        "featureMeans": means,
        "featureStds": stds,
        "weights": [round(weight, 8) for weight in weights],
        "intercept": round(intercept, 8),
        "metrics": metrics,
    }

    ensure_parent_dir(MODEL_PATH)

    with open(MODEL_PATH, "w", encoding="utf-8") as file_handle:
        json.dump(model_payload, file_handle, indent=2)

    print(json.dumps(model_payload))


if __name__ == "__main__":
    main()
