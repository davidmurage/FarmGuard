import { useDeferredValue, useState } from "react";

import { apiPost, extractApiErrorMessage } from "../../lib/api";
import { useKnowledgeBaseData } from "../../lib/useKnowledgeBaseData";

const INITIAL_ARTICLE_FORM = {
  title: "",
  summary: "",
  category: "SAFE_PRACTICES",
  reportType: "ALL",
  audienceRole: "ALL",
  tags: "",
  actionItems: "",
  guidance: "",
};

function formatLabel(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildRecommendationSummary(context) {
  const parts = [];

  if (context.focusReportTypes?.length) {
    parts.push(`Signals: ${context.focusReportTypes.map(formatLabel).join(", ")}`);
  }

  if (context.focusCounties?.length) {
    parts.push(`Focus counties: ${context.focusCounties.join(", ")}`);
  }

  if (context.activeAlertCount) {
    parts.push(`Active alerts: ${context.activeAlertCount}`);
  }

  return parts.join(" | ") || "Recommendations are based on your role and recent FarmGuard activity.";
}

export default function KnowledgeBasePanel({
  title = "Knowledge base",
  description = "Browse practical guidance for outbreak prevention, field response, and safer farm practices.",
  allowPublish = false,
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [reportType, setReportType] = useState("ALL");
  const [expandedArticleId, setExpandedArticleId] = useState("");
  const [articleForm, setArticleForm] = useState(INITIAL_ARTICLE_FORM);
  const [publishMessage, setPublishMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const { data, isLoading, error, reload } = useKnowledgeBaseData({
    category,
    reportType,
    search: deferredSearch,
  });

  const onPublishChange = (event) => {
    const { name, value } = event.target;
    setArticleForm((current) => ({ ...current, [name]: value }));
  };

  const submitArticle = async (event) => {
    event.preventDefault();
    setIsPublishing(true);
    setPublishMessage("");

    try {
      await apiPost(
        "/api/knowledge",
        {
          title: articleForm.title,
          summary: articleForm.summary,
          category: articleForm.category,
          reportTypes: articleForm.reportType === "ALL" ? [] : [articleForm.reportType],
          audienceRoles: articleForm.audienceRole === "ALL" ? ["ALL"] : [articleForm.audienceRole],
          tags: articleForm.tags
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          actionItems: articleForm.actionItems
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          bodySections: articleForm.guidance.trim()
            ? [{ heading: "Guidance", content: articleForm.guidance.trim() }]
            : [],
        },
        { auth: true },
      );

      setArticleForm(INITIAL_ARTICLE_FORM);
      setPublishMessage("Knowledge article published successfully.");
      await reload();
    } catch (publishError) {
      setPublishMessage(extractApiErrorMessage(publishError, "Unable to publish article."));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <section className="dashboard-panel dashboard-panel-wide knowledge-panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {error ? <div className="dashboard-banner dashboard-banner-error">{error}</div> : null}

      <div className="knowledge-filter-row">
        <label>
          <span>Search</span>
          <input
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search diseases, crop threats, or field response advice"
          />
        </label>

        <label>
          <span>Category</span>
          <select className="input select" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="ALL">All categories</option>
            <option value="ZOONOTIC_DISEASE">Zoonotic disease</option>
            <option value="LIVESTOCK_HEALTH">Livestock health</option>
            <option value="CROP_PROTECTION">Crop protection</option>
            <option value="ENVIRONMENTAL_RISK">Environmental risk</option>
            <option value="SAFE_PRACTICES">Safe practices</option>
            <option value="FIELD_RESPONSE">Field response</option>
          </select>
        </label>

        <label>
          <span>Report type</span>
          <select className="input select" value={reportType} onChange={(event) => setReportType(event.target.value)}>
            <option value="ALL">All types</option>
            <option value="LIVESTOCK">Livestock</option>
            <option value="CROP">Crop</option>
            <option value="ENVIRONMENT">Environment</option>
          </select>
        </label>
      </div>

      <section className="knowledge-recommendations">
        <div className="knowledge-head">
          <div>
            <h3>Recommended for this dashboard</h3>
            <p>{buildRecommendationSummary(data.context)}</p>
          </div>
          {isLoading ? <span className="knowledge-status">Refreshing library...</span> : null}
        </div>

        <div className="knowledge-card-grid">
          {data.recommendedArticles.map((article) => (
            <article key={article.id} className="knowledge-card knowledge-card-highlight">
              <div className="stack-item-row">
                <strong>{article.title}</strong>
                <span className="knowledge-chip">{formatLabel(article.category)}</span>
              </div>
              <p>{article.summary}</p>
              {article.actionItems?.length ? (
                <ul className="inline-list">
                  {article.actionItems.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="knowledge-library">
        <div className="knowledge-head">
          <div>
            <h3>Library</h3>
            <p>Browse full articles and expand the ones you need right now.</p>
          </div>
        </div>

        <div className="knowledge-list">
          {data.articles.length ? (
            data.articles.map((article) => (
              <article key={article.id} className="knowledge-card">
                <div className="stack-item-row">
                  <strong>{article.title}</strong>
                  <div className="knowledge-chip-row">
                    <span className="knowledge-chip">{formatLabel(article.category)}</span>
                    {article.reportTypes?.map((type) => (
                      <span key={type} className="knowledge-chip knowledge-chip-soft">{formatLabel(type)}</span>
                    ))}
                  </div>
                </div>
                <p>{article.summary}</p>
                {article.tags?.length ? (
                  <div className="knowledge-chip-row">
                    {article.tags.map((tag) => (
                      <span key={tag} className="knowledge-chip knowledge-chip-soft">#{tag}</span>
                    ))}
                  </div>
                ) : null}

                {expandedArticleId === article.id ? (
                  <div className="knowledge-details">
                    {article.bodySections?.map((section) => (
                      <div key={`${article.id}-${section.heading}`} className="knowledge-section">
                        <strong>{section.heading}</strong>
                        <p>{section.content}</p>
                      </div>
                    ))}
                    {article.actionItems?.length ? (
                      <div className="knowledge-section">
                        <strong>Action checklist</strong>
                        <ul className="inline-list">
                          {article.actionItems.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-inline"
                    onClick={() => setExpandedArticleId((current) => (current === article.id ? "" : article.id))}
                  >
                    {expandedArticleId === article.id ? "Hide guide" : "Read guide"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">No knowledge articles match the current filters.</div>
          )}
        </div>
      </section>

      {allowPublish ? (
        <section className="knowledge-compose">
          <div className="knowledge-head">
            <div>
              <h3>Publish a knowledge article</h3>
              <p>Add local guidance or response instructions for your teams.</p>
            </div>
          </div>

          <form className="dashboard-form" onSubmit={submitArticle}>
            <div className="form-grid">
              <label>
                <span>Title</span>
                <input className="input" name="title" value={articleForm.title} onChange={onPublishChange} placeholder="Biosecurity steps after suspected avian influenza" />
              </label>

              <label>
                <span>Category</span>
                <select className="input select" name="category" value={articleForm.category} onChange={onPublishChange}>
                  <option value="ZOONOTIC_DISEASE">Zoonotic disease</option>
                  <option value="LIVESTOCK_HEALTH">Livestock health</option>
                  <option value="CROP_PROTECTION">Crop protection</option>
                  <option value="ENVIRONMENTAL_RISK">Environmental risk</option>
                  <option value="SAFE_PRACTICES">Safe practices</option>
                  <option value="FIELD_RESPONSE">Field response</option>
                </select>
              </label>
            </div>

            <label>
              <span>Summary</span>
              <textarea className="textarea" name="summary" value={articleForm.summary} onChange={onPublishChange} placeholder="A short summary of what this guidance helps users do." />
            </label>

            <div className="form-grid">
              <label>
                <span>Report type</span>
                <select className="input select" name="reportType" value={articleForm.reportType} onChange={onPublishChange}>
                  <option value="ALL">All types</option>
                  <option value="LIVESTOCK">Livestock</option>
                  <option value="CROP">Crop</option>
                  <option value="ENVIRONMENT">Environment</option>
                </select>
              </label>

              <label>
                <span>Audience</span>
                <select className="input select" name="audienceRole" value={articleForm.audienceRole} onChange={onPublishChange}>
                  <option value="ALL">All users</option>
                  <option value="FARMER">Farmers</option>
                  <option value="VET">Vets</option>
                  <option value="ADMIN">Admins</option>
                  <option value="PARTNER">Partners</option>
                </select>
              </label>
            </div>

            <label>
              <span>Tags</span>
              <input className="input" name="tags" value={articleForm.tags} onChange={onPublishChange} placeholder="biosecurity, poultry, outbreak" />
            </label>

            <label>
              <span>Action items</span>
              <input className="input" name="actionItems" value={articleForm.actionItems} onChange={onPublishChange} placeholder="isolate flock, stop market movement, disinfect equipment" />
            </label>

            <label>
              <span>Guidance body</span>
              <textarea className="textarea" name="guidance" value={articleForm.guidance} onChange={onPublishChange} placeholder="Write the main practical guidance that users should follow." />
            </label>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isPublishing}>
                {isPublishing ? "Publishing..." : "Publish article"}
              </button>
            </div>

            {publishMessage ? <div className="dashboard-banner">{publishMessage}</div> : null}
          </form>
        </section>
      ) : null}
    </section>
  );
}
