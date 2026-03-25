import KnowledgeArticle from "../models/KnowledgeArticle.js";
import { STARTER_KNOWLEDGE_ARTICLES } from "../data/knowledgeArticles.js";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function ensureKnowledgeBaseSeeded() {
  const articleCount = await KnowledgeArticle.countDocuments();

  if (!articleCount) {
    await KnowledgeArticle.insertMany(STARTER_KNOWLEDGE_ARTICLES);
  }
}

export async function buildUniqueKnowledgeSlug(title) {
  const baseSlug = slugify(title) || "knowledge-article";
  let candidateSlug = baseSlug;
  let suffix = 2;

  while (await KnowledgeArticle.exists({ slug: candidateSlug })) {
    candidateSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidateSlug;
}
