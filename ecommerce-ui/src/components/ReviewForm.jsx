import { useState } from 'react'

export default function ReviewForm({ onSubmit, disabled }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  async function submit(event) {
    event.preventDefault()
    const submitted = await onSubmit(rating, comment.trim())
    if (submitted) {
      setRating(5)
      setComment('')
    }
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <label>
        Beri penilaian
        <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
          {[5, 4, 3, 2, 1].map((value) => (
            <option value={value} key={value}>{value} bintang</option>
          ))}
        </select>
      </label>
      <label className="review-comment">
        Ceritakan pengalamanmu
        <textarea
          maxLength={1000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Apa yang paling kamu suka?"
        />
      </label>
      <button type="submit" className="button button-primary" disabled={disabled}>
        {disabled ? 'Mengirim...' : 'Kirim ulasan'} <span>↗</span>
      </button>
    </form>
  )
}
