import Alert from "../models/Alert.js";
import KnowledgeArticle, { KNOWLEDGE_CATEGORIES } from "../models/KnowledgeArticle.js";
import Report, { REPORT_TYPES } from "../models/Report.js";
import { ROLES } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializeKnowledgeArticle } from "../utils/serializers.js";
import { buildUniqueKnowledgeSlug, ensureKnowledgeBaseSeeded } from "../services/knowledgeBaseService.js";

function parseListParam(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function buildAudienceFilter(role) {
  return { $in: [role, "ALL"] };
}

function normalizeRoleVisibilityFilter(role) {
  return {
    isPublished: true,
    audienceRoles: buildAudienceFilter(role),
  };
}

function buildRecommendationContext({ role, reports, alerts }) {
  const reportTypeCounts = {};
  const countyCounts = {};

  for (const report of reports) {
    reportTypeCounts[report.reportType] = (reportTypeCounts[report.reportType] || 0) + 1;

    const county = report.location?.county?.trim();
    if (county) {
      countyCounts[county] = (countyCounts[county] || 0) + 1;
    }
  }

  const focusReportTypes = Object.entries(reportTypeCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([type]) => type);

  const focusCounties = Object.entries(countyCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([county]) => county);

  return {
    role,
    focusReportTypes,
    focusCounties,
    activeAlertCount: alerts.length,
  };
}

function scoreArticle(article, context) {
  let score = article.featured ? 5 : 0;

  if (article.audienceRoles.includes(context.role)) {
    score += 4;
  }

  if (article.audienceRoles.includes("ALL")) {
    score += 2;
  }

  const matchingTypes = article.reportTypes.filter((type) => context.focusReportTypes.includes(type)).length;
  score += matchingTypes * 3;

  if (!context.focusReportTypes.length && article.featured) {
    score += 2;
  }

  if (context.activeAlertCount && article.category === "FIELD_RESPONSE") {
    score += 2;
  }

  return score;
}

export const listKnowledgeArticles = asyncHandler(async (req, res) => {
  await ensureKnowledgeBaseSeeded();

  const filters = req.user.role === "ADMIN" && req.query.includeAll === "true"
    ? {}
    : normalizeRoleVisibilityFilter(req.user.role);

  if (KNOWLEDGE_CATEGORIES.includes(req.query.category)) {
    filters.category = req.query.category;
  }

  if (REPORT_TYPES.includes(req.query.reportType)) {
    filters.reportTypes = req.query.reportType;
  }

  const search = req.query.search?.trim();
  if (search) {
    const expression = new RegExp(search, "i");
    filters.$or = [
      { title: expression },
      { summary: expression },
      { tags: expression },
      { "bodySections.heading": expression },
      { "bodySections.content": expression },
    ];
  }

  const limit = Math.min(Number(req.query.limit) || 12, 30);
  const articles = await KnowledgeArticle.find(filters)
    .sort({ featured: -1, updatedAt: -1, title: 1 })
    .limit(limit)
    .populate("publishedBy", "name email role");

  res.json({
    articles: articles.map(serializeKnowledgeArticle),
    total: articles.length,
  });
});

export const getRecommendedKnowledgeArticles = asyncHandler(async (req, res) => {
  await ensureKnowledgeBaseSeeded();

  const reportFilters = req.user.role === "FARMER"
    ? { reporter: req.user.id }
    : { status: { $in: ["SUBMITTED", "UNDER_REVIEW", "VERIFIED"] } };

  const [recentReports, activeAlerts, articles] = await Promise.all([
    Report.find({
      ...reportFilters,
      createdAt: { $gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(12)
      .select("reportType severity location"),
    Alert.find({
      isActive: true,
      targetRoles: buildAudienceFilter(req.user.role),
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .select("category riskLevel"),
    KnowledgeArticle.find(normalizeRoleVisibilityFilter(req.user.role))
      .sort({ featured: -1, updatedAt: -1 })
      .limit(25),
  ]);

  const context = buildRecommendationContext({
    role: req.user.role,
    reports: recentReports,
    alerts: activeAlerts,
  });

  const recommendedArticles = articles
    .map((article) => ({
      article,
      score: scoreArticle(article, context),
    }))
    .sort((left, right) => right.score - left.score || left.article.title.localeCompare(right.article.title))
    .slice(0, 4)
    .map(({ article }) => serializeKnowledgeArticle(article));

  res.json({
    context,
    recommendedArticles,
  });
});

export const createKnowledgeArticle = asyncHandler(async (req, res) => {
  const title = req.body.title?.trim();
  const summary = req.body.summary?.trim();
  const category = req.body.category;

  if (!title || !summary || !KNOWLEDGE_CATEGORIES.includes(category)) {
    throw new ApiError(400, "Title, summary, and a valid category are required.");
  }

  const actionItems = parseListParam(req.body.actionItems);
  const tags = parseListParam(req.body.tags);
  const reportTypes = parseListParam(req.body.reportTypes).filter((type) => REPORT_TYPES.includes(type));
  const parsedAudienceRoles = parseListParam(req.body.audienceRoles).filter((role) => role === "ALL" || ROLES.includes(role));
  const audienceRoles = parsedAudienceRoles.length
    ? parsedAudienceRoles
    : ["ALL"];
  const bodySections = Array.isArray(req.body.bodySections)
    ? req.body.bodySections
        .map((section) => ({
          heading: section?.heading?.trim(),
          content: section?.content?.trim(),
        }))
        .filter((section) => section.heading && section.content)
    : [];

  const article = await KnowledgeArticle.create({
    title,
    slug: await buildUniqueKnowledgeSlug(title),
    summary,
    category,
    audienceRoles,
    reportTypes,
    tags,
    actionItems,
    bodySections,
    featured: Boolean(req.body.featured),
    source: "ADMIN",
    publishedBy: req.user.id,
  });

  const hydratedArticle = await KnowledgeArticle.findById(article._id).populate("publishedBy", "name email role");

  res.status(201).json({
    message: "Knowledge article created successfully.",
    article: serializeKnowledgeArticle(hydratedArticle),
  });
});
