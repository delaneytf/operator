// Decisions log — first-class surface pulled from notes[kind='decision'].

const { useState: useStateDec } = React;

function DecisionsView({ state }) {
  const [filterProject, setFilterProject] = useStateDec('all');
  const [q, setQ] = useStateDec('');
  const [openId, setOpenId] = useStateDec(null);
  const [editing, setEditing] = useStateDec(false);

  const all = state.notes
    .filter((n) => n.kind === 'decision')
    .filter((n) => filterProject === 'all' || n.projectId === filterProject)
    .filter((n) => !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.body.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const pinned = all.filter((n) => n.pinned);
  const rest = all.filter((n) => !n.pinned);

  // Group by quarter
  const grouped = {};
  rest.forEach((n) => {
    const d = parseDate(n.date);
    const q = `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
    (grouped[q] = grouped[q] || []).push(n);
  });

  const selected = state.notes.find((n) => n.id === openId);

  return (
    <div className="decisions-wrap">
      <div className="page-hd">
        <div>
          <div className="page-title">Decisions</div>
          <div className="page-sub">{all.length} logged · context, options considered, choice, reversibility</div>
        </div>
        <div className="row-flex">
          <select className="select" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="all">All projects</option>
            {state.projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name.split('—')[1]?.trim() || p.name}</option>)}
          </select>
          <input className="input" placeholder="Search decisions…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
          <button className="btn btn-primary btn-sm" onClick={() => {
            const newId = `n-dec-${Date.now()}`;
            actions.addNote({ id: newId, projectId: filterProject !== 'all' ? filterProject : state.projects[0].id, kind: 'decision', title: 'New decision', body: '', date: today0().toISOString().slice(0, 10), tags: [], context: '', options: '', reversibility: 'reversible' });
            setOpenId(newId);
            setEditing(true);
          }}>
            <Icon name="plus" size={11} /> Log decision
          </button>
        </div>
      </div>

      <div className="decisions-split">
        <div className="decisions-list">
          {pinned.length > 0 && (
            <>
              <div className="dec-section-hd"><Icon name="pin" size={11} /> Pinned</div>
              {pinned.map((n) => <DecisionCard key={n.id} note={n} project={state.projects.find((p) => p.id === n.projectId)} onOpen={() => { setOpenId(n.id); setEditing(false); }} active={openId === n.id} />)}
            </>
          )}
          {Object.keys(grouped).map((quarter) => (
            <div key={quarter}>
              <div className="dec-section-hd">{quarter}</div>
              {grouped[quarter].map((n) => <DecisionCard key={n.id} note={n} project={state.projects.find((p) => p.id === n.projectId)} onOpen={() => { setOpenId(n.id); setEditing(false); }} active={openId === n.id} />)}
            </div>
          ))}
          {all.length === 0 && (
            <div className="empty">No decisions match.</div>
          )}
        </div>

        <div className="decisions-detail">
          {!selected ? (
            <div className="empty-pane">
              <div style={{ fontSize: 13, marginBottom: 6 }}>Select a decision to see context, options, and reversibility.</div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>Solo operators re-litigate decisions constantly. This log exists to stop that.</div>
            </div>
          ) : (
            <DecisionDetail note={selected} project={state.projects.find((p) => p.id === selected.projectId)} editing={editing} setEditing={setEditing} />
          )}
        </div>
      </div>
    </div>
  );
}

function DecisionCard({ note, project, onOpen, active }) {
  return (
    <div className={`dec-card ${active ? 'active' : ''}`} onClick={onOpen}>
      <div className="dec-card-hd">
        <ProjectChip project={project} />
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{fmtDate(note.date)}</span>
        {note.pinned && <Icon name="pin" size={10} />}
      </div>
      <div className="dec-card-title">{note.title}</div>
      <div className="dec-card-body">{note.body}</div>
      <div className="row-flex" style={{ marginTop: 6, gap: 6 }}>
        {note.reversibility === 'irreversible' && <span className="pill pill-danger">irreversible</span>}
        {note.reversibility === 'reversible' && <span className="pill">reversible</span>}
        {(note.tags || []).map((t) => <span key={t} className="pill pill-ghost">{t}</span>)}
      </div>
    </div>
  );
}

function DecisionDetail({ note, project, editing, setEditing }) {
  const [local, setLocal] = useStateDec(note);
  React.useEffect(() => setLocal(note), [note.id]);
  const save = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    actions.updateNote(note.id, patch);
  };

  if (editing) {
    return (
      <div className="dec-detail">
        <input className="input" style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }} value={local.title} onChange={(e) => save({ title: e.target.value })} />
        <div className="row-flex" style={{ marginBottom: 10 }}>
          <ProjectChip project={project} />
          <input className="input" type="date" value={local.date} onChange={(e) => save({ date: e.target.value })} style={{ width: 150 }} />
          <select className="select" value={local.reversibility || 'reversible'} onChange={(e) => save({ reversibility: e.target.value })}>
            <option value="reversible">Reversible</option>
            <option value="irreversible">Irreversible</option>
          </select>
          <button className={`btn btn-sm ${local.pinned ? 'btn-primary' : ''}`} onClick={() => save({ pinned: !local.pinned })}>
            <Icon name="pin" size={11} /> {local.pinned ? 'Pinned' : 'Pin'}
          </button>
        </div>
        <div className="field">
          <span className="field-label">Choice / summary</span>
          <textarea className="input" rows={2} value={local.body} onChange={(e) => save({ body: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">Context — what made this necessary</span>
          <textarea className="input" rows={3} value={local.context || ''} onChange={(e) => save({ context: e.target.value })} placeholder="What situation forced the decision?" />
        </div>
        <div className="field">
          <span className="field-label">Options considered</span>
          <textarea className="input" rows={3} value={local.options || ''} onChange={(e) => save({ options: e.target.value })} placeholder="A) … B) … C) …" />
        </div>
        <div className="field">
          <span className="field-label">Tags</span>
          <input className="input" value={(local.tags || []).join(', ')} onChange={(e) => save({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
        </div>
        <div className="row-flex" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete this decision?')) { actions.deleteNote(note.id); } }}>
            <Icon name="trash" size={11} /> Delete
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing(false)}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dec-detail">
      <div className="row-flex" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="row-flex">
          <ProjectChip project={project} />
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{fmtDate(note.date)}</span>
          {note.pinned && <span className="pill"><Icon name="pin" size={10} /> pinned</span>}
          {note.reversibility === 'irreversible' && <span className="pill pill-danger">irreversible</span>}
          {note.reversibility === 'reversible' && <span className="pill">reversible</span>}
        </div>
        <button className="btn btn-sm" onClick={() => setEditing(true)}>
          <Icon name="edit" size={11} /> Edit
        </button>
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, letterSpacing: '-0.01em' }}>{note.title}</div>

      <div className="dec-section-label">Choice</div>
      <div className="dec-body">{note.body || <em style={{ color: 'var(--fg-4)' }}>—</em>}</div>

      <div className="dec-section-label" style={{ marginTop: 16 }}>Context</div>
      <div className="dec-body">{note.context || <em style={{ color: 'var(--fg-4)' }}>Add context to remember why this was decided.</em>}</div>

      <div className="dec-section-label" style={{ marginTop: 16 }}>Options considered</div>
      <div className="dec-body" style={{ whiteSpace: 'pre-line' }}>{note.options || <em style={{ color: 'var(--fg-4)' }}>No options logged.</em>}</div>

      {(note.tags || []).length > 0 && (
        <div className="row-flex" style={{ marginTop: 16, gap: 6, flexWrap: 'wrap' }}>
          {note.tags.map((t) => <span key={t} className="pill pill-ghost">{t}</span>)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { DecisionsView });
