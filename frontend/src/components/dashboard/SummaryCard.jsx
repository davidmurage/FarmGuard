export default function SummaryCard({ card }) {
  return (
    <article className={`summary-card tone-${card.tone || "neutral"}`}>
      <span className="summary-label">{card.label}</span>
      <strong className="summary-value">{card.value}</strong>
      <p className="summary-description">{card.description}</p>
    </article>
  );
}
