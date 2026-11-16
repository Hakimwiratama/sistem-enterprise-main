import { useState } from 'react'

export default function ReviewForm({ onSubmit, disabled }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (rating === 0) return

    const submitted = await onSubmit(rating, comment.trim())
    if (submitted) {
      setRating(0)
      setComment('')
    }
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <div className="review-rating-control">
        Beri penilaian
        <div className="review-star-picker" role="group" aria-label="Pilih jumlah bintang">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              type="button"
              className={`review-star-button ${rating >= value ? 'is-selected' : ''}`}
              aria-label={`${value} bintang`}
              aria-pressed={rating === value}
              key={value}
              onClick={() => setRating(value)}
            >
              {rating >= value ? '★' : '☆'}
            </button>
          ))}
          <span className="review-rating-choice">
            {rating ? `${rating} dari 5` : 'Pilih bintang'}
          </span>
        </div>
      </div>
      <label className="review-comment">
        Ceritakan pengalamanmu
        <textarea
          maxLength={1000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Apa yang paling kamu suka?"
        />
      </label>
      <button
        type="submit"
        className="button button-primary"
        disabled={disabled || rating === 0}
      >
        {disabled ? 'Mengirim...' : 'Kirim ulasan'} <span>↗</span>
      </button>
    </form>
  )
}
