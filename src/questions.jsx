// Questions log — open questions and their resolutions.

function QuestionsView({ state }) {
  const [filterProject, setFilterProject] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [openId, setOpenId] = React.useState(null);
  const [editing, setEditing] = React.useState(false);

  const all = (state.notes || [])
    .filter((n) => n.kind === 'question')
    .filter((n) => filterProject === 'all' || (n.projectIds || [n.projectId]).filter(Boolean).includes(filterProject))
    .filter((n) => !search || n.title.toLowerCase().includes(search.toLowerCase()) || (n.body || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const open = all.filter((n) => !n.resolved);
  const resolved = all.filter((n) => n.resolved);
  const selected = (state.notes || []).find((n) => n.id === openId);

  const newQuestion = () => {
    const newId = `n-q-${Date.now()}`;
    const initIds = filterProject !== 'all' ? [filterProject] : (state.projects[0] ? [state.projects[0].id] : []);
    actions.addNote({ id: newId, projectId: initIds[0] || '', projectIds: initIds, kind: 'question', title: 'New question', body: '', date: new Date().toISOString().slice(0, 10), tags: [], resolved: false, resolution: '' });
    setOpenId(newId);
    setEditing(true);
  };

  return (
    <div className="content-narrow decisions-wrap" style={{ maxWidth: 1280 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="row-flex-sb" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="title-h1">Questions</div>
            <div className="title-sub">{open.length} open · {resolved.length} resolved</div>
          </div>
          <button className="btn btn-primary" onClick={newQuestion}>
            <Icon name="plus" size={11} /> New question
          </button>
        </div>
      </div>

      <div className="decisions-split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <input className="input" placeholder="Search questions…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm${filterProject === 'all' ? ' btn-primary' : ''}`} onClick={() => setFilterProject('all')}>All</button>
            {state.projects.map((p) => (
              <button key={p.id} className={`btn btn-sm${filterProject === p.id ? ' btn-primary' : ''}`}
                onClick={() => setFilterProject(filterProject === p.id ? 'all' : p.id)}>
                {p.code}
              </button>
            ))}
          </div>
          <div className="decisions-list card" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {open.length > 0 && (
              <>
                <div className="dec-section-hd">Open</div>
                {open.map((n) => (
                  <QuestionCard key={n.id} note={n} projects={state.projects}
                    active={openId === n.id} onOpen={() => { setOpenId(n.id); setEditing(false); }} />
                ))}
              </>
            )}
            {resolved.length > 0 && (
              <>
                <div className="dec-section-hd">Resolved</div>
                {resolved.map((n) => (
                  <QuestionCard key={n.id} note={n} projects={state.projects}
                    active={openId === n.id} onOpen={() => { setOpenId(n.id); setEditing(false); }} />
                ))}
              </>
            )}
            {all.length === 0 && <div className="empty">No questions match.</div>}
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {!selected ? (
            <div className="empty-pane">
              <div style={{ fontSize: 13, marginBottom: 6 }}>Select a question to see details and resolution.</div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>Log open questions here to track what's unresolved and why.</div>
            </div>
          ) : (
            <QuestionDetail key={selected.id} note={selected} projects={state.projects} editing={editing} setEditing={setEditing} />
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ note, projects, active, onOpen }) {
  const noteProjects = (note.projectIds || [note.projectId]).filter(Boolean)
    .map((pid) => (projects || []).find((p) => p.id === pid)).filter(Boolean);
  return (
    <div className={`dec-card dec-card-hoverable ${active ? 'active' : ''}`} onClick={onOpen}>
      <div className="dec-card-hd">
        {noteProjects.length > 0
          ? noteProjects.map((p) => <ProjectChip key={p.id} project={p} />)
          : <ProjectChip project={null} />}
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{fmtDate(note.date)}</span>
        {note.resolved && <span className="pill pill-ok" style={{ fontSize: 9.5, padding: '1px 6px' }}>resolved</span>}
      </div>
      <div className="dec-card-title">{note.title}</div>
      {note.body && <div className="dec-card-body">{note.body}</div>}
      {note.resolved && note.resolution && (
        <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4, lineHeight: 1.4, fontStyle: 'italic' }}>→ {note.resolution}</div>
      )}
    </div>
  );
}

function QuestionDetail({ note, projects, editing, setEditing }) {
  const [local, setLocal] = React.useState(note);
  const [resolving, setResolving] = React.useState(false);
  const [resolutionDraft, setResolutionDraft] = React.useState('');
  React.useEffect(() => { setLocal(note); setResolving(false); }, [note.id]);

  const save = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    actions.updateNote(note.id, patch);
  };

  const toggleProject = (pid) => {
    const ids = local.projectIds || [local.projectId].filter(Boolean);
    const next = ids.includes(pid) ? ids.filter((x) => x !== pid) : [...ids, pid];
    save({ projectIds: next, projectId: next[0] || '' });
  };

  const noteProjectIds = local.projectIds || [local.projectId].filter(Boolean);
  const noteProjects = noteProjectIds.map((pid) => (projects || []).find((p) => p.id === pid)).filter(Boolean);

  if (editing) {
    return (
      <div className="dec-detail" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
        <input className="input" style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }} value={local.title} autoFocus onChange={(e) => save({ title: e.target.value })} />
        <div className="row-flex" style={{ marginBottom: 10 }}>
          <input className="input" type="date" value={local.date || ''} onChange={(e) => save({ date: e.target.value })} style={{ width: 150 }} />
        </div>
        {(projects || []).length > 0 && (
          <div className="field">
            <span className="field-label">Projects</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(projects || []).map((p) => {
                const on = noteProjectIds.includes(p.id);
                return (
                  <button key={p.id} type="button" className={`btn btn-sm${on ? ' btn-primary' : ''}`}
                    onClick={() => toggleProject(p.id)}>
                    {p.code}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="field">
          <span className="field-label">Question / context</span>
          <textarea className="input" rows={3} value={local.body || ''} onChange={(e) => save({ body: e.target.value })} placeholder="What are you trying to answer?" />
        </div>
        <div className="field">
          <span className="field-label">Resolution</span>
          <textarea className="input" rows={3} value={local.resolution || ''} onChange={(e) => save({ resolution: e.target.value })} placeholder="How was this resolved?" />
        </div>
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
            <input type="checkbox" checked={!!local.resolved} onChange={(e) => save({ resolved: e.target.checked })} />
            Mark as resolved
          </label>
        </div>
        <div className="field">
          <span className="field-label">Tags</span>
          <input className="input" value={(local.tags || []).join(', ')} onChange={(e) => save({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
        </div>
        <div className="row-flex" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete this question?')) { actions.deleteNote(note.id); } }}>
            <Icon name="trash" size={11} /> Delete
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing(false)}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dec-detail" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
      <div className="row-flex" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="row-flex" style={{ flexWrap: 'wrap', gap: 6 }}>
          {noteProjects.map((p) => <ProjectChip key={p.id} project={p} />)}
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{fmtDate(note.date)}</span>
          {note.resolved
            ? <span className="pill pill-ok">resolved</span>
            : <span className="pill pill-warn">open</span>}
        </div>
        <div className="row-flex" style={{ gap: 6, flexShrink: 0 }}>
          {note.resolved
            ? <button className="btn btn-sm" onClick={() => save({ resolved: false, resolution: '' })}>Re-open</button>
            : <button className="btn btn-primary btn-sm" onClick={() => { setResolutionDraft(''); setResolving(true); }}>Resolve</button>}
          <button className="btn btn-sm" onClick={() => setEditing(true)}><Icon name="edit" size={11} /> Edit</button>
        </div>
      </div>

      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, letterSpacing: '-0.01em' }}>{note.title}</div>

      {note.body && (
        <>
          <div className="dec-section-label">Context</div>
          <div className="dec-body">{note.body}</div>
        </>
      )}

      {note.resolved && (
        <>
          <div className="dec-section-label" style={{ marginTop: 16 }}>Resolution</div>
          <div className="dec-body">{note.resolution || <em style={{ color: 'var(--fg-4)' }}>No resolution text added.</em>}</div>
        </>
      )}

      {(note.tags || []).length > 0 && (
        <div className="row-flex" style={{ marginTop: 16, gap: 6, flexWrap: 'wrap' }}>
          {note.tags.map((t) => <span key={t} className="pill pill-ghost">{t}</span>)}
        </div>
      )}

      {resolving && (
        <Modal open={true} onClose={() => setResolving(false)} title="Resolve question">
          <div className="field">
            <span className="field-label">Resolution</span>
            <textarea className="input" rows={4} autoFocus value={resolutionDraft}
              onChange={(e) => setResolutionDraft(e.target.value)}
              placeholder="How was this resolved? What did you decide or learn?" />
          </div>
          <div className="modal-foot">
            <button className="btn" onClick={() => setResolving(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { save({ resolved: true, resolution: resolutionDraft }); setResolving(false); }}>
              Mark resolved
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

Object.assign(window, { QuestionsView });
