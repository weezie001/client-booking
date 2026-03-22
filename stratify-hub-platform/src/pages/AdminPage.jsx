import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import './AdminPage.css'

const TABS = ['Overview', 'Talents', 'Blog', 'Bookings', 'Users', 'Newsletter']

const STATUS_COLORS = {
  pending: '#c9a227', confirmed: '#22c55e', completed: '#6366f1', cancelled: '#ef4444',
}

const fmt = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon }) {
  return (
    <div className="admin-stat glass-panel">
      <span className="admin-stat__icon">{icon}</span>
      <div>
        <div className="admin-stat__val gradient-text">{value}</div>
        <div className="admin-stat__label">{label}</div>
      </div>
    </div>
  )
}

// ── Talent Form ───────────────────────────────────────────────────────────────
function TalentForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', industry: '', location: '', bio: '', base_rate: 500,
    rating: 5.0, reviews: 0, featured: false, avatar_url: '',
    ...initial,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="admin-form glass-panel">
      <div className="admin-form__grid">
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Industry *</label>
          <input className="input-field" value={form.industry} onChange={e => set('industry', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="input-field" value={form.location} onChange={e => set('location', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Base Rate ($)</label>
          <input className="input-field" type="number" value={form.base_rate} onChange={e => set('base_rate', +e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Rating</label>
          <input className="input-field" type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => set('rating', +e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Reviews</label>
          <input className="input-field" type="number" value={form.reviews} onChange={e => set('reviews', +e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Bio</label>
        <textarea className="input-field admin-textarea" rows={3} value={form.bio} onChange={e => set('bio', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Avatar URL</label>
        <input className="input-field" value={form.avatar_url} onChange={e => set('avatar_url', e.target.value)} placeholder="https://..." />
      </div>
      <div className="form-group admin-form__check">
        <input type="checkbox" id="featured" checked={!!form.featured} onChange={e => set('featured', e.target.checked)} />
        <label htmlFor="featured" className="form-label">Featured</label>
      </div>
      <div className="admin-form__actions">
        <button className="btn btn-primary" onClick={() => onSave(form)}>Save</button>
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Blog Form ─────────────────────────────────────────────────────────────────
function BlogForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: '', excerpt: '', body: '', category: 'General', read_time: '5 min read', published: true, image_url: '',
    ...initial,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const CATS = ['General', 'Industry Trends', 'Platform News', 'Trending', 'Guide', 'Community']

  return (
    <div className="admin-form glass-panel">
      <div className="admin-form__grid">
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="input-field" value={form.title} onChange={e => set('title', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="input-field" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Read Time</label>
          <input className="input-field" value={form.read_time} onChange={e => set('read_time', e.target.value)} placeholder="5 min read" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Excerpt *</label>
        <textarea className="input-field admin-textarea" rows={2} value={form.excerpt} onChange={e => set('excerpt', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Image URL</label>
        <input className="input-field" value={form.image_url || ''} onChange={e => set('image_url', e.target.value)} placeholder="https://images.unsplash.com/..." />
      </div>
      <div className="form-group">
        <label className="form-label">Body</label>
        <textarea className="input-field admin-textarea" rows={5} value={form.body || ''} onChange={e => set('body', e.target.value)} />
      </div>
      <div className="form-group admin-form__check">
        <input type="checkbox" id="published" checked={!!form.published} onChange={e => set('published', e.target.checked)} />
        <label htmlFor="published" className="form-label">Published</label>
      </div>
      <div className="admin-form__actions">
        <button className="btn btn-primary" onClick={() => onSave(form)}>Save</button>
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { token }                             = useAuth()
  const [tab, setTab]                         = useState('Overview')
  const [stats, setStats]                     = useState(null)
  const [talents, setTalents]                 = useState([])
  const [blog, setBlog]                       = useState([])
  const [bookings, setBookings]               = useState([])
  const [users, setUsers]                     = useState([])
  const [subscribers, setSubscribers]         = useState([])
  const [newsletter, setNewsletter]           = useState({ subject: '', content: '' })
  const [loading, setLoading]                 = useState(false)
  const [editingTalent, setEditingTalent]     = useState(null) // null | 'new' | {talent obj}
  const [editingPost, setEditingPost]         = useState(null) // null | 'new' | {post obj}
  const [error, setError]                     = useState('')
  const [success, setSuccess]                 = useState('')

  const load = async (section) => {
    setError('')
    setLoading(true)
    try {
      if (section === 'Overview') {
        const s = await apiFetch('/api/admin/stats', {}, token)
        setStats(s)
      } else if (section === 'Talents') {
        const t = await apiFetch('/api/talents', {}, token)
        setTalents(t)
      } else if (section === 'Blog') {
        const { posts } = await apiFetch('/api/blog?limit=50', {}, token)
        setBlog(posts)
      } else if (section === 'Bookings') {
        const b = await apiFetch('/api/admin/bookings', {}, token)
        setBookings(b)
      } else if (section === 'Users') {
        const u = await apiFetch('/api/admin/users', {}, token)
        setUsers(u)
      } else if (section === 'Newsletter') {
        const [s, { posts }] = await Promise.all([
          apiFetch('/api/admin/newsletter/subscribers', {}, token),
          apiFetch('/api/blog?limit=50', {}, token),
        ])
        setSubscribers(s)
        setBlog(posts)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(tab) }, [tab])

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  // ── Talent CRUD ────────────────────────────────────────────────────────────
  const saveTalent = async (form) => {
    setError('')
    try {
      if (editingTalent === 'new') {
        const t = await apiFetch('/api/admin/talents', { method: 'POST', body: JSON.stringify(form) }, token)
        setTalents(prev => [t, ...prev])
        flash('Talent created!')
      } else {
        const t = await apiFetch(`/api/admin/talents/${editingTalent.id}`, { method: 'PUT', body: JSON.stringify(form) }, token)
        setTalents(prev => prev.map(x => x.id === t.id ? t : x))
        flash('Talent updated!')
      }
      setEditingTalent(null)
    } catch (err) { setError(err.message) }
  }

  const deleteTalent = async (id) => {
    if (!confirm('Delete this talent?')) return
    try {
      await apiFetch(`/api/admin/talents/${id}`, { method: 'DELETE' }, token)
      setTalents(prev => prev.filter(t => t.id !== id))
      flash('Talent deleted.')
    } catch (err) { setError(err.message) }
  }

  // ── Blog CRUD ──────────────────────────────────────────────────────────────
  const savePost = async (form) => {
    setError('')
    try {
      if (editingPost === 'new') {
        const p = await apiFetch('/api/admin/blog', { method: 'POST', body: JSON.stringify(form) }, token)
        setBlog(prev => [p, ...prev])
        flash('Post created!')
      } else {
        const p = await apiFetch(`/api/admin/blog/${editingPost.id}`, { method: 'PUT', body: JSON.stringify(form) }, token)
        setBlog(prev => prev.map(x => x.id === p.id ? p : x))
        flash('Post updated!')
      }
      setEditingPost(null)
    } catch (err) { setError(err.message) }
  }

  const deletePost = async (id) => {
    if (!confirm('Delete this post?')) return
    try {
      await apiFetch(`/api/admin/blog/${id}`, { method: 'DELETE' }, token)
      setBlog(prev => prev.filter(p => p.id !== id))
      flash('Post deleted.')
    } catch (err) { setError(err.message) }
  }

  // ── Booking status ─────────────────────────────────────────────────────────
  const updateBookingStatus = async (id, status) => {
    try {
      await apiFetch(`/api/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    } catch (err) { setError(err.message) }
  }

  // ── Newsletter ─────────────────────────────────────────────────────────────
  const sendNewsletter = async () => {
    if (!newsletter.subject || !newsletter.content) return
    if (!confirm(`Send to ${subscribers.filter(s => s.active).length} active subscribers?`)) return
    try {
      const r = await apiFetch('/api/admin/newsletter/send', { method: 'POST', body: JSON.stringify(newsletter) }, token)
      flash(r.message || 'Newsletter sent!')
      setNewsletter({ subject: '', content: '' })
    } catch (err) { setError(err.message) }
  }

  // ── User role ──────────────────────────────────────────────────────────────
  const updateRole = async (id, role) => {
    try {
      const u = await apiFetch(`/api/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }, token)
      setUsers(prev => prev.map(x => x.id === u.id ? u : x))
      flash('Role updated.')
    } catch (err) { setError(err.message) }
  }

  return (
    <main className="admin-page">
      <div className="bg-glow" style={{ top: 0, right: '10%' }} />
      <div className="container admin-page__inner">

        <div className="admin-header animate-fade">
          <div>
            <h1>Admin <span className="gradient-text">Panel</span></h1>
            <p>Manage your platform</p>
          </div>
        </div>

        {error   && <div className="auth-alert auth-alert--error">{error}</div>}
        {success && <div className="auth-alert auth-alert--success">{success}</div>}

        {/* Tabs */}
        <div className="admin-tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`admin-tab ${tab === t ? 'admin-tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {loading && <div className="admin-loading">Loading...</div>}

        {/* ── Overview ── */}
        {tab === 'Overview' && !loading && stats && (
          <div className="admin-stats-grid animate-fade">
            <StatCard label="Total Users"    value={stats.users}    icon="👤" />
            <StatCard label="Total Bookings" value={stats.bookings} icon="📋" />
            <StatCard label="Talents"        value={stats.talents}  icon="⭐" />
            <StatCard label="Revenue"        value={`$${Number(stats.revenue).toLocaleString()}`} icon="💰" />
          </div>
        )}

        {/* ── Talents ── */}
        {tab === 'Talents' && !loading && (
          <div className="animate-fade">
            {editingTalent ? (
              <TalentForm
                initial={editingTalent === 'new' ? {} : editingTalent}
                onSave={saveTalent}
                onCancel={() => setEditingTalent(null)}
              />
            ) : (
              <>
                <div className="admin-toolbar">
                  <span className="admin-count">{talents.length} talents</span>
                  <button className="btn btn-primary" onClick={() => setEditingTalent('new')}>+ Add Talent</button>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Name</th><th>Industry</th><th>Rate</th><th>Rating</th><th>Featured</th><th></th></tr>
                    </thead>
                    <tbody>
                      {talents.map(t => (
                        <tr key={t.id}>
                          <td>{t.name}</td>
                          <td>{t.industry}</td>
                          <td>${Number(t.base_rate).toLocaleString()}</td>
                          <td>⭐ {t.rating}</td>
                          <td>{t.featured ? '✓' : '—'}</td>
                          <td className="admin-table__actions">
                            <button className="btn-xs" onClick={() => setEditingTalent(t)}>Edit</button>
                            <button className="btn-xs btn-xs--danger" onClick={() => deleteTalent(t.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Blog ── */}
        {tab === 'Blog' && !loading && (
          <div className="animate-fade">
            {editingPost ? (
              <BlogForm
                initial={editingPost === 'new' ? {} : editingPost}
                onSave={savePost}
                onCancel={() => setEditingPost(null)}
              />
            ) : (
              <>
                <div className="admin-toolbar">
                  <span className="admin-count">{blog.length} posts</span>
                  <button className="btn btn-primary" onClick={() => setEditingPost('new')}>+ New Post</button>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Title</th><th>Category</th><th>Read Time</th><th>Published</th><th>Date</th><th></th></tr>
                    </thead>
                    <tbody>
                      {blog.map(p => (
                        <tr key={p.id}>
                          <td className="admin-table__title">{p.title}</td>
                          <td>{p.category}</td>
                          <td>{p.read_time}</td>
                          <td>{p.published ? '✓' : '✗'}</td>
                          <td>{fmt(p.created_at)}</td>
                          <td className="admin-table__actions">
                            <button className="btn-xs" onClick={() => setEditingPost(p)}>Edit</button>
                            <button className="btn-xs btn-xs--danger" onClick={() => deletePost(p.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Bookings ── */}
        {tab === 'Bookings' && !loading && (
          <div className="animate-fade">
            <div className="admin-toolbar">
              <span className="admin-count">{bookings.length} bookings</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>User</th><th>Talent</th><th>Package</th><th>Price</th><th>Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td>
                        <div>{b.user_name}</div>
                        <small style={{ color: 'var(--text-muted)' }}>{b.user_email}</small>
                      </td>
                      <td>{b.talent_name}</td>
                      <td>{b.package_name}</td>
                      <td>${Number(b.package_price).toLocaleString()}</td>
                      <td>{fmt(b.booked_at)}</td>
                      <td>
                        <select
                          className="admin-status-select"
                          value={b.status}
                          style={{ color: STATUS_COLORS[b.status] }}
                          onChange={e => updateBookingStatus(b.id, e.target.value)}
                        >
                          {['pending','confirmed','completed','cancelled'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === 'Users' && !loading && (
          <div className="animate-fade">
            <div className="admin-toolbar">
              <span className="admin-count">{users.length} users</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Joined</th><th>Role</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{fmt(u.created_at)}</td>
                      <td>
                        <select
                          className="admin-status-select"
                          value={u.role}
                          onChange={e => updateRole(u.id, e.target.value)}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* ── Newsletter ── */}
        {tab === 'Newsletter' && !loading && (
          <div className="animate-fade">
            <div className="admin-toolbar">
              <span className="admin-count">
                {subscribers.filter(s => s.active).length} active · {subscribers.length} total
              </span>
            </div>

            {/* Subscriber list */}
            <div className="admin-table-wrap" style={{ marginBottom: '32px' }}>
              <table className="admin-table">
                <thead>
                  <tr><th>Email</th><th>Name</th><th>Status</th><th>Subscribed</th></tr>
                </thead>
                <tbody>
                  {subscribers.map(s => (
                    <tr key={s.id}>
                      <td>{s.email}</td>
                      <td>{s.name || '—'}</td>
                      <td>
                        <span style={{ color: s.active ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                          {s.active ? 'Active' : 'Unsubscribed'}
                        </span>
                      </td>
                      <td>{fmt(s.subscribed_at)}</td>
                    </tr>
                  ))}
                  {subscribers.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No subscribers yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Send newsletter form */}
            <div className="admin-form glass-panel">
              <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Send Newsletter</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
                Pick a blog post to auto-fill the template, or write custom content.
              </p>

              {/* Blog post template picker */}
              <div className="form-group">
                <label className="form-label">Use Blog Post as Template</label>
                <select
                  className="input-field"
                  defaultValue=""
                  onChange={e => {
                    const post = blog.find(p => String(p.id) === e.target.value)
                    if (!post) return
                    setNewsletter({
                      subject: `StratifyHub Insider: ${post.title}`,
                      content: `
<h2 style="color:#fff;margin:0 0 12px">${post.title}</h2>
${post.image_url ? `<img src="${post.image_url}" alt="${post.title}" style="width:100%;border-radius:12px;margin-bottom:20px;object-fit:cover;max-height:280px">` : ''}
<span style="display:inline-block;background:#c9a22720;color:#c9a227;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;margin-bottom:16px">${post.category}</span>
<p style="color:#a1a1aa;line-height:1.7;margin-bottom:20px">${post.excerpt}</p>
<a href="${import.meta.env.VITE_API_BASE?.replace(':3001', ':5173') || 'http://localhost:5173'}/blog/${post.id}" style="display:inline-block;padding:12px 28px;background:#c9a227;color:#000;border-radius:999px;text-decoration:none;font-weight:700">Read Full Article →</a>
`.trim(),
                    })
                  }}
                >
                  <option value="">— Select a post —</option>
                  {blog.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="admin-form__divider" />

              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input
                  className="input-field"
                  value={newsletter.subject}
                  onChange={e => setNewsletter(n => ({ ...n, subject: e.target.value }))}
                  placeholder="Email subject line"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Content (HTML)</label>
                <textarea
                  className="input-field"
                  rows={10}
                  value={newsletter.content}
                  onChange={e => setNewsletter(n => ({ ...n, content: e.target.value }))}
                  placeholder="<p>Hello subscribers...</p>"
                />
              </div>

              {/* Preview */}
              {newsletter.content && (
                <div className="form-group">
                  <label className="form-label">Preview</label>
                  <div
                    className="newsletter-preview"
                    dangerouslySetInnerHTML={{ __html: newsletter.content }}
                  />
                </div>
              )}

              <div className="admin-form__actions">
                <button
                  className="btn btn-outline"
                  onClick={() => setNewsletter({ subject: '', content: '' })}
                  type="button"
                >
                  Clear
                </button>
                <button
                  className="btn btn-primary"
                  onClick={sendNewsletter}
                  disabled={!newsletter.subject || !newsletter.content}
                >
                  Send to {subscribers.filter(s => s.active).length} Subscribers
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
