import { useState, useRef, useCallback } from 'react'

const API = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? window.location.origin
  : ''

const S = {
  wrap: { maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: "'Georgia', serif" },
  header: { borderBottom: '1px solid #2a2520', paddingBottom: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: 400, color: '#f5f0e8', letterSpacing: '.02em' },
  subtitle: { fontSize: 13, color: '#7a6f62', marginTop: 4, fontFamily: 'system-ui' },
  badge: { fontSize: 11, background: '#2a2520', color: '#c4a96d', padding: '4px 12px', borderRadius: 20, fontFamily: 'system-ui', letterSpacing: '.04em' },
  sectionLabel: { fontSize: 11, fontFamily: 'system-ui', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5a5047', marginBottom: 8 },
  card: { background: '#1a1612', border: '0.5px solid #2a2520', borderRadius: 12, padding: '1.125rem 1.25rem', marginBottom: '1.25rem' },
  textarea: { width: '100%', background: '#0f0d0a', border: '0.5px solid #2a2520', borderRadius: 8, padding: '10px 12px', color: '#f5f0e8', fontSize: 13, fontFamily: 'system-ui', outline: 'none', resize: 'vertical', minHeight: 80 },
  btnPrimary: { background: '#c4a96d', color: '#0f0d0a', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui', display: 'inline-flex', alignItems: 'center', gap: 7 },
  btnSecondary: { background: 'transparent', color: '#c4a96d', border: '0.5px solid #c4a96d44', borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui', display: 'inline-flex', alignItems: 'center', gap: 6 },
  row: { display: 'flex', gap: 10, alignItems: 'center' },
  clipRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid #2a2520', cursor: 'grab' },
  clipThumb: { width: 48, height: 36, background: '#2a2520', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 },
  genBox: { background: '#0f0d0a', border: '0.5px solid #2a2520', borderRadius: 8, padding: '12px 14px', marginBottom: 10 },
  genLabel: { fontSize: 10, fontFamily: 'system-ui', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: '#5a5047', marginBottom: 6 },
  genText: { fontSize: 14, color: '#f5f0e8', lineHeight: 1.6, fontFamily: 'system-ui' },
  progress: { background: '#2a2520', borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 10 },
  tag: (bg, color) => ({ display: 'inline-block', fontSize: 10, background: bg, color, padding: '2px 8px', borderRadius: 20, fontFamily: 'system-ui', fontWeight: 600, letterSpacing: '.04em', marginRight: 6 }),
  muted: { color: '#5a5047', fontSize: 13, fontFamily: 'system-ui' },
  copyBtn: { fontSize: 11, fontFamily: 'system-ui', color: '#5a5047', cursor: 'pointer', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
}

function StepBadge({ n }) {
  return <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#2a2520', color: '#c4a96d', fontSize: 11, fontFamily: 'system-ui', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
}

export default function App() {
  const [clips, setClips] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const [brandPrompt, setBrandPrompt] = useState('')
  const [generated, setGenerated] = useState(null)
  const [generating, setGenerating] = useState(false)

  const [renderJob, setRenderJob] = useState(null)
  const [renderStatus, setRenderStatus] = useState(null)
  const [rendering, setRendering] = useState(false)

  const fileInputRef = useRef(null)
  const dragIdx = useRef(null)

  // ── Upload ──
  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => /\.(mp4|mov|avi|mkv|m4v|webm)$/i.test(f.name))
    if (!files.length) { setUploadMsg('No supported video files found (mp4, mov, avi, mkv, m4v, webm)'); return }
    setUploading(true)
    setUploadMsg(`Uploading ${files.length} clip${files.length > 1 ? 's' : ''}…`)
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    try {
      const origin = window.location.origin
      const res = await fetch(`${origin}/api/upload`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText)
      const data = await res.json()
      // Append new clips to existing ones instead of replacing
      setClips(prev => {
        const existingNames = new Set(prev.map(c => c.name))
        const newClips = data.clips.filter(c => !existingNames.has(c.name))
        const merged = [...prev, ...newClips]
        setUploadMsg(`${merged.length} clip${merged.length > 1 ? 's' : ''} ready`)
        return merged
      })
    } catch (e) {
      setUploadMsg(`Upload error: ${e.message}`)
    }
    setUploading(false)
  }

  function onDrop(e) {
    e.preventDefault(); setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  // ── Reorder ──
  function dragStart(i) { dragIdx.current = i }
  function onDragOver(e, i) {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === i) return
    const next = [...clips]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(i, 0, moved)
    dragIdx.current = i
    setClips(next)
  }
  function dragEnd() { dragIdx.current = null }

  function removeClip(i) {
    setClips(clips.filter((_, idx) => idx !== i))
  }

  // ── Generate ──
  async function generate() {
    if (!brandPrompt.trim()) { alert('Add a brand voice prompt first.'); return }
    setGenerating(true)
    try {
      const origin = window.location.origin
      const res = await fetch(`${origin}/api/generate`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brand_prompt: brandPrompt, clips }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText)
      setGenerated(await res.json())
    } catch (e) { alert(`Generate error: ${e.message}`) }
    setGenerating(false)
  }

  // ── Render ──
  async function startRender() {
    if (!generated) { alert('Generate content first.'); return }
    if (!clips.length) { alert('Upload clips first.'); return }
    setRendering(true)
    const jobId = crypto.randomUUID()
    setRenderJob(jobId)
    setRenderStatus({ status: 'queued', progress: 0, message: 'Starting…' })
    try {
      const origin = window.location.origin
      const res = await fetch(`${origin}/api/render`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clips, hook: generated.hook, captions: generated.captions, cta: generated.cta, job_id: jobId }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText)
      pollStatus(jobId)
    } catch (e) { alert(`Render error: ${e.message}`); setRendering(false) }
  }

  async function pollStatus(jobId) {
    const origin = window.location.origin
    const poll = async () => {
      try {
        const data = await (await fetch(`${origin}/api/render/${jobId}/status`)).json()
        setRenderStatus(data)
        if (data.status === 'done' || data.status === 'error') setRendering(false)
        else setTimeout(poll, 2500)
      } catch { setTimeout(poll, 3000) }
    }
    setTimeout(poll, 1500)
  }

  const statusColor = renderStatus?.status === 'done' ? '#6db87a' : renderStatus?.status === 'error' ? '#e87070' : '#c4a96d'

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <div style={S.title}>🎬 Millican Reel Agent</div>
          <div style={S.subtitle}>Facebook Reels · 9:16 · Claude AI + FFmpeg</div>
        </div>
        <span style={S.badge}>MILLICAN PECAN CO.</span>
      </div>

      {/* Step 1 — Upload */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <StepBadge n="1" /><span style={S.sectionLabel}>Upload video clips</span>
      </div>
      <div style={S.card}>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            border: `1.5px dashed ${dragOver ? '#c4a96d' : '#2a2520'}`,
            borderRadius: 8, padding: '2rem', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? '#1f1a10' : 'transparent', transition: 'all .2s'
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
          <div style={{ fontSize: 13, fontFamily: 'system-ui', color: '#c4a96d', fontWeight: 600 }}>
            {uploading ? 'Uploading…' : 'Drop clips here or click to browse'}
          </div>
          <div style={{ fontSize: 11, fontFamily: 'system-ui', color: '#5a5047', marginTop: 4 }}>
            MP4, MOV, AVI, MKV · select multiple files at once
          </div>
        </div>
        <input ref={fileInputRef} type="file" multiple accept="video/*" style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)} />
        {uploadMsg && (
          <div style={{ fontSize: 12, fontFamily: 'system-ui', color: clips.length ? '#6db87a' : '#7a6f62', marginTop: 8 }}>
            {uploadMsg}
          </div>
        )}
      </div>

      {/* Step 2 — Arrange */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <StepBadge n="2" /><span style={S.sectionLabel}>Arrange clip order</span>
      </div>
      <div style={S.card}>
        {!clips.length ? (
          <div style={{ ...S.muted, textAlign: 'center', padding: '1.5rem 0' }}>Upload clips above to arrange them</div>
        ) : (
          <>
            {clips.map((clip, i) => (
              <div key={clip.id} style={{ ...S.clipRow, ...(i === clips.length - 1 ? { borderBottom: 'none' } : {}) }}
                draggable onDragStart={() => dragStart(i)} onDragOver={e => onDragOver(e, i)} onDragEnd={dragEnd}>
                <span style={{ color: '#3a3028', fontSize: 16 }}>⠿</span>
                <span style={{ fontSize: 12, fontFamily: 'system-ui', color: '#5a5047', width: 20, textAlign: 'center' }}>{i + 1}</span>
                <div style={S.clipThumb}>🎞</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontFamily: 'system-ui', color: '#f5f0e8' }}>{clip.name}</div>
                  <div style={{ fontSize: 11, fontFamily: 'system-ui', color: '#5a5047' }}>{clip.duration_estimate}</div>
                </div>
                <button onClick={() => removeClip(i)} style={{ background: 'none', border: 'none', color: '#5a5047', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
              </div>
            ))}
            <div style={{ marginTop: 10, display: 'flex', gap: 3 }}>
              {clips.map((_, i) => <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i % 2 === 0 ? '#c4a96d' : '#3a5a3a' }} />)}
            </div>
            <div style={{ marginTop: 10 }}>
              <button style={S.btnSecondary} onClick={() => fileInputRef.current?.click()}>+ Add more clips</button>
            </div>
          </>
        )}
      </div>

      {/* Step 3 — Prompt */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <StepBadge n="3" /><span style={S.sectionLabel}>Brand voice prompt</span>
      </div>
      <div style={S.card}>
        <textarea style={S.textarea} value={brandPrompt} onChange={e => setBrandPrompt(e.target.value)}
          placeholder="Describe the reel — e.g. 'Holiday pecan gift boxes. Warm Southern feel. Women 40+. Drive traffic to millicanpecan.com. CTA: Shop our gift collection.'" />
        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={S.tag('#1a2a3a','#7ab8e8')}>Hook</span>
          <span style={S.tag('#1a2a1a','#7acd8a')}>CTA overlay</span>
          <span style={S.tag('#2a2010','#d4a84a')}>Per-clip captions</span>
          <span style={{ ...S.muted, fontSize: 11 }}>— all generated from this prompt</span>
        </div>
      </div>

      {/* Step 4 — Generate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <StepBadge n="4" /><span style={S.sectionLabel}>Generate content</span>
      </div>
      <div style={S.card}>
        <div style={{ ...S.row, marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button style={S.btnPrimary} onClick={generate} disabled={generating}>
            {generating ? '⏳ Generating…' : '✦ Generate with Claude'}
          </button>
          {generated && <button style={S.btnSecondary} onClick={generate} disabled={generating}>↻ Regenerate</button>}
        </div>
        {generated ? (
          <>
            <div style={S.grid2}>
              <div style={S.genBox}>
                <div style={S.genLabel}>🎣 Hook — opening line</div>
                <div style={S.genText}>{generated.hook}</div>
                <button style={S.copyBtn} onClick={() => navigator.clipboard.writeText(generated.hook)}>⧉ copy</button>
              </div>
              <div style={S.genBox}>
                <div style={S.genLabel}>📣 CTA overlay</div>
                <div style={S.genText}>{generated.cta}</div>
                <button style={S.copyBtn} onClick={() => navigator.clipboard.writeText(generated.cta)}>⧉ copy</button>
              </div>
            </div>
            <div style={S.genBox}>
              <div style={S.genLabel}>💬 Per-clip captions</div>
              {(generated.captions || []).map((cap, i) => (
                <div key={i} style={{ fontSize: 13, fontFamily: 'system-ui', color: '#f5f0e8', padding: '4px 0', borderBottom: i < generated.captions.length - 1 ? '0.5px solid #2a2520' : 'none' }}>
                  <span style={{ color: '#5a5047', marginRight: 8 }}>Clip {i + 1}</span>{cap}
                </div>
              ))}
              <button style={S.copyBtn} onClick={() => navigator.clipboard.writeText(generated.captions.map((c,i) => `Clip ${i+1}: ${c}`).join('\n'))}>⧉ copy all</button>
            </div>
          </>
        ) : (
          <div style={{ ...S.muted, textAlign: 'center', padding: '1rem 0' }}>Add your prompt above then click Generate</div>
        )}
      </div>

      {/* Step 5 — Render */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <StepBadge n="5" /><span style={S.sectionLabel}>Render reel</span>
      </div>
      <div style={S.card}>
        <div style={{ ...S.muted, fontSize: 12, marginBottom: '1rem' }}>
          Splices your clips → burns in hook, captions & CTA → exports a 9:16 MP4 ready to post to Facebook.
        </div>
        <div style={{ ...S.row, flexWrap: 'wrap' }}>
          <button
            style={{ ...S.btnPrimary, background: rendering ? '#2a2520' : '#c4a96d', color: rendering ? '#7a6f62' : '#0f0d0a' }}
            onClick={startRender} disabled={rendering || !generated || !clips.length}>
            {rendering ? '⏳ Rendering…' : '🎬 Render Reel'}
          </button>
          {renderStatus?.status === 'done' && renderJob && (
            <a href={`${API}/api/render/${renderJob}/download`} download="millican-pecan-reel.mp4"
              style={{ ...S.btnPrimary, background: '#2a4a2a', textDecoration: 'none' }}>
              ⬇ Download MP4
            </a>
          )}
        </div>
        {renderStatus && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontFamily: 'system-ui', color: statusColor, fontWeight: 600 }}>{renderStatus.status.toUpperCase()}</span>
              <span style={{ fontSize: 12, fontFamily: 'system-ui', color: '#5a5047' }}>{renderStatus.progress}%</span>
            </div>
            <div style={S.progress}><div style={{ height: '100%', width: `${renderStatus.progress}%`, background: statusColor, borderRadius: 4, transition: 'width .4s ease' }} /></div>
            {renderStatus.message && <div style={{ fontSize: 12, fontFamily: 'system-ui', color: '#7a6f62', marginTop: 6 }}>{renderStatus.message}</div>}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', color: '#3a3028', fontSize: 11, fontFamily: 'system-ui', paddingTop: '1rem', borderTop: '0.5px solid #2a2520' }}>
        Millican Pecan Reel Agent · Claude + FFmpeg · Google Cloud Run
      </div>
    </div>
  )
}
