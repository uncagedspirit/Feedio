import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Modal, Input, Textarea, Select, Button } from '../ui/index'
import { IlluSuccess } from '../illustrations'

export default function AddRequestModal({ open, onClose, board }) {
  const { addPost, canInteract } = useApp()

  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [tag, setTag]            = useState(board?.tags?.[0] ?? 'Feature')
  const [name, setName]          = useState('')
  const [email, setEmail]        = useState('')
  const [error, setError]        = useState('')
  const [loading, setLoading]    = useState(false)
  const [done, setDone]          = useState(false)

  const settings = board?.settings ?? {}

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return setError('Please enter a title')
    if (settings.requireName && !name.trim()) return setError('Your name is required')
    if (settings.requireEmail && !email.trim()) return setError('Your email is required')
    if (!canInteract(board)) return setError('This board has reached its interaction limit')

    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 400))
    addPost(board.id, {
      title: title.trim(),
      description: description.trim(),
      tag,
      authorName:  name.trim() || 'Anonymous',
      authorEmail: email.trim(),
    })
    setLoading(false)
    setDone(true)
  }

  const handleClose = () => {
    setTitle(''); setDesc(''); setName(''); setEmail('')
    setError(''); setDone(false); setLoading(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Submit a request" maxWidth="max-w-md">
      {done ? (
        <div className="text-center py-6">
          <div className="flex justify-center mb-3"><IlluSuccess size={72} /></div>
          <h3 className="text-[15px] font-semibold text-[#111827] mb-2">Request submitted!</h3>
          <p className="text-[13px] text-[#6B7280] mb-5">
            Thanks for your feedback. The team will review it soon.
          </p>
          <Button onClick={handleClose} variant="secondary" fullWidth>
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[12px] text-rose-600">
              {error}
            </div>
          )}

          <Input
            label="Title"
            required
            placeholder="Short, descriptive title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
          />

          <Textarea
            label="Description"
            placeholder="Give us more context — what problem does this solve?"
            value={description}
            onChange={e => setDesc(e.target.value)}
            rows={4}
          />

          <Select
            label="Type"
            value={tag}
            onChange={e => setTag(e.target.value)}
            options={(board?.tags ?? ['Feature', 'Bug', 'Other']).map(t => ({ value: t, label: t }))}
          />

          {/* Conditional identity fields */}
          {!settings.allowAnonymous && (
            <>
              {settings.requireName !== false && (
                <Input
                  label="Your name"
                  required={settings.requireName}
                  placeholder={settings.requireName ? 'Jane Smith' : 'Jane Smith (optional)'}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              )}
              {settings.requireEmail && (
                <Input
                  label="Email address"
                  type="email"
                  required
                  placeholder="you@example.com"
                  hint="Your email is private and won't be shown publicly."
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              )}
            </>
          )}

          {settings.allowAnonymous && (
            <p className="text-[11px] text-[#9CA3AF] bg-[#F9FAFB] px-3 py-2 rounded-lg">
              This board allows anonymous submissions. Your identity is optional.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" fullWidth onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Submitting…' : 'Submit request'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
