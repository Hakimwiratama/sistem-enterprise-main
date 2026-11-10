export default function StarRating({ rating = 0, total = 0, showTotal = false }) {
  const value = Number(rating)
  const safeRating = Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0
  const roundedRating = Math.round(safeRating)
  const label = `${safeRating.toFixed(1)} dari 5 bintang`

  return (
    <span className="star-rating" aria-label={label}>
      <span className="stars" aria-hidden="true">
        {'★'.repeat(roundedRating)}{'☆'.repeat(5 - roundedRating)}
      </span>
      <strong>{safeRating.toFixed(1)}</strong>
      {showTotal && <span className="rating-total">({total} ulasan)</span>}
    </span>
  )
}
