import { asyncHandler } from "../utils/asyncHandler.js";
import { trainEnvironmentalModel } from "../services/environmentalModelTrainingService.js";

export const retrainEnvironmentalModel = asyncHandler(async (_req, res) => {
  const model = await trainEnvironmentalModel();

  res.json({
    message: "Environmental model retrained successfully.",
    model,
  });
});
