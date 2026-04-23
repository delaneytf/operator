// Questions log — tasks-style layout: metrics, search/filter, collapsible sections, expandable rows, modal edit.

function QuestionsView({ state }) {
  const [filterIds, setFilterIds] = React.useState(new Set());
  const [search, setSearch] = React.useState('');
  const [collapsed, setCollapsed] = React.useState({ resolved: true, cancelled: true });
  const [expandedId, setExpandedId] = React.useState(null);
  const [modalId, setModalId] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);
  const [resolveId, setResolveId] = React.useState(null);

  const isAllFilter = filterIds.size === 0;
  const visibleProjectIds = isAllFilter ? null : new Set(
    (state.projects || []).filter(p => filterIds.has(p.programId) || filterIds.has(p.id)).map(p => p.id)
  );

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const todayIso = new Date().toISOString().slice(0, 10);
  const weekAgoStr = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();

  const allQ = (state.notes || []).filter((n) => n.kind === 'question');

  const filtered = allQ
    .filter((n) => !visibleProjectIds || (n.projectIds || [n.projectId]).filter(Boolean).some(pid => visibleProjectIds.has(pid)))
    .filter((n) => !search || n.title.toLowerCase().includes(search.toLowerCase())
      || (n.body || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const open = filtered.filter((n) => !n.resolved && !n.cancelled);
  const resolved = filtered.filter((n) => n.resolved && !n.cancelled);
  const cancelled = filtered.filter((n) => n.cancelled);

  // Metrics across all questions
  const metricOpen = allQ.filter((n) => !n.resolved && !n.cancelled).length;
  const metricResolved = allQ.filter((n) => n.resolved).length;
  const metricTotal = allQ.length;
  const metricThisWeek = allQ.filter((n) => (n.date || '') >= weekAgoStr).length;

  const metrics = [
    { label: 'Open', value: metricOpen, color: metricOpen > 0 ? 'var(--warn)' : 'var(--fg-4)' },
    { label: 'Resolved', value: metricResolved, color: 'var(--ok)' },
    { label: 'Total', value: metricTotal, color: 'var(--fg-2)' },
    { label: 'This week', value: metricThisWeek, color: 'var(--fg-2)' },
  ];

  const openModal = (id) => { setModalId(id || null); setShowModal(true); };

  return (
    <>
    <div className="content-narrow">
      <div className="row-flex-sb" style={{ marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <div className="title-h1">Questions</div>
          <div className="title-sub">{metricOpen} open · {metricResolved} resolved</div>
        </div>
        <button className="btn btn-primary" onClick={() => openModal(null)}>
          <Icon name="plus" size={11} /> New question
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ background: 'var(--bg-1)', padding: '10px 14px' }}>
            <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: m.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="Search questions…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 12, width: 200, flexShrink: 0 }} />
        <ProjectFilterDropdown
          programs={state.programs || []}
          projects={state.projects || []}
          selectedIds={filterIds}
          onChange={setFilterIds}
        />
      </div>

      <div className="card">
        {filtered.length === 0 && <div className="empty">No questions match.</div>}

        {open.length > 0 && (
          <div>
            <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection('open')}>
              <Icon name={collapsed['open'] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
              <span style={{ color: 'var(--warn)' }}>Open</span>
              <span className="tgroup-head-count">{open.length}</span>
            </div>
            {!collapsed['open'] && open.map((n) => (
              <QuestionRow key={n.id} note={n} projects={state.projects}
                expanded={expandedId === n.id}
                onToggleExpand={() => toggleExpand(n.id)}
                onEdit={() => openModal(n.id)}
                onResolve={() => setResolveId(n.id)} />
            ))}
          </div>
        )}

        {resolved.length > 0 && (
          <div>
            <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection('resolved')}>
              <Icon name={collapsed['resolved'] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
              <span style={{ color: 'var(--ok)' }}>Resolved</span>
              <span className="tgroup-head-count">{resolved.length}</span>
            </div>
            {!collapsed['resolved'] && resolved.map((n) => (
              <QuestionRow key={n.id} note={n} projects={state.projects}
                expanded={expandedId === n.id}
                onToggleExpand={() => toggleExpand(n.id)}
                onEdit={() => openModal(n.id)}
                onResolve={() => setResolveId(n.id)} />
            ))}
          </div>
        )}

        {cancelled.length > 0 && (
          <div>
            <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection('cancelled')}>
              <Icon name={collapsed['cancelled'] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
              <span style={{ color: 'var(--fg-4)' }}>Cancelled</span>
              <span className="tgroup-head-count">{cancelled.length}</span>
            </div>
            {!collapsed['cancelled'] && cancelled.map((n) => (
              <QuestionRow key={n.id} note={n} projects={state.projects}
                expanded={expandedId === n.id}
                onToggleExpand={() => toggleExpand(n.id)}
                onEdit={() => openModal(n.id)}
                onResolve={() => setResolveId(n.id)} />
            ))}
          </div>
        )}
      </div>
    </div>

    {showModal && (
      <QuestionModal noteId={modalId} state={state}
        defaults={{ projectId: visibleProjectIds?.size === 1 ? [...visibleProjectIds][0] : undefined }}
        onClose={() => { setShowModal(false); setModalId(null); }} />
    )}
    {resolveId && (
      <ResolveQuestionModal noteId={resolveId} state={state} onClose={() => setResolveId(null)} />
    )}
    </>
  );
}

function QuestionRow({ note, projects, expanded, onToggleExpand, onEdit, onResolve }) {
  const noteProjects = (note.projectIds || [note.projectId]).filter(Boolean)
    .map((pid) => projects.find((p) => p.id === pid)).filter(Boolean);

  return (
    <React.Fragment>
      <div
        className={`trow${expanded ? ' trow-expanded' : ''}`}
        style={{ gridTemplateColumns: '20px 1fr 80px 90px 54px 22px', cursor: 'pointer' }}
        onClick={onToggleExpand}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: note.resolved ? 'var(--ok)' : 'var(--warn)', flexShrink: 0 }} />
        </div>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="truncate" style={{ fontWeight: 500, fontSize: 13 }}>{note.title}</span>
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', display: 'flex', alignItems: 'center' }}>
          {note.resolved && note.resolvedAt ? fmtDate(note.resolvedAt) : fmtDate(note.date)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {note.resolved
            ? <span className="pill pill-ok" style={{ fontSize: 10, padding: '1px 6px' }}>resolved</span>
            : <span className="pill pill-warn" style={{ fontSize: 10, padding: '1px 6px' }}>open</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          {noteProjects.length > 0
            ? <ProjectChip project={noteProjects[0]} />
            : <ProjectChip project={null} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={expanded ? 'chevronD' : 'chevronR'} size={10} style={{ color: 'var(--fg-4)' }} />
        </div>
      </div>
      {expanded && (
        <div className="pq-detail" onClick={(e) => e.stopPropagation()}>
          <div className="pq-meta-row">
            <div className="pq-meta">
              <span className="pq-meta-item mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>Q-{note.id.replace(/^n-/, '')}</span>
              <span className="pq-meta-sep" />
              <span className="pq-meta-item">
                {note.resolved
                  ? <span className="pill pill-ok" style={{ fontSize: 10, padding: '1px 6px' }}>resolved</span>
                  : <span className="pill pill-warn" style={{ fontSize: 10, padding: '1px 6px' }}>open</span>}
              </span>
              {noteProjects.length > 0 && (
                <>
                  <span className="pq-meta-sep" />
                  <span className="pq-meta-item">
                    {noteProjects.map((p) => <ProjectChip key={p.id} project={p} />)}
                  </span>
                </>
              )}
              <span className="pq-meta-sep" />
              <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>Asked {fmtDate(note.date)}</span>
              {note.resolvedAt && (
                <>
                  <span className="pq-meta-sep" />
                  <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--ok)' }}>Resolved {fmtDate(note.resolvedAt)}</span>
                </>
              )}
            </div>
            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Icon name="edit" size={11} /> Edit
            </button>
          </div>
          {note.body && (
            <div className="pq-section">
              <div className="pq-section-label">Context</div>
              <div className="pq-section-val">{note.body}</div>
            </div>
          )}
          {note.resolved && (
            <div className="pq-section">
              <div className="pq-section-label">Resolution</div>
              <div className="pq-section-val">
                {note.resolution || <em style={{ color: 'var(--fg-4)' }}>No resolution text added.</em>}
              </div>
            </div>
          )}
          {noteProjects.length > 1 && (
            <div className="pq-section">
              <div className="pq-section-label">Projects</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {noteProjects.map((p) => <ProjectChip key={p.id} project={p} />)}
              </div>
            </div>
          )}
          {(note.tags || []).length > 0 && (
            <div className="pq-section">
              <div className="pq-section-label">Tags</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {note.tags.map((t) => <span key={t} className="pill pill-ghost">{t}</span>)}
              </div>
            </div>
          )}
          <div className="pq-detail-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Asked {fmtDate(note.date)}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {!note.resolved && (
                <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onResolve(); }}>Resolve</button>
              )}
              {note.resolved && (
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); actions.updateNote(note.id, { resolved: false, resolvedAt: null }); }}>Re-open</button>
              )}
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

function QuestionModal({ noteId, state, defaults, onClose }) {
  const existing = noteId ? (state.notes || []).find((n) => n.id === noteId) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const initProjectId = defaults?.projectId || (state.projects[0]?.id || '');

  const [local, setLocal] = React.useState(existing ? { ...existing } : {
    kind: 'question', title: '', body: '', resolution: '',
    tags: [], date: todayIso, projectId: initProjectId,
    projectIds: initProjectId ? [initProjectId] : [], resolved: false,
  });

  const set = (patch) => setLocal((prev) => ({ ...prev, ...patch }));

  const toggleProject = (pid) => {
    const ids = local.projectIds || [local.projectId].filter(Boolean);
    const next = ids.includes(pid) ? ids.filter((x) => x !== pid) : [...ids, pid];
    set({ projectIds: next, projectId: next[0] || '' });
  };

  const handleSave = () => {
    if (!local.title.trim()) return;
    if (existing) {
      actions.updateNote(noteId, local);
    } else {
      actions.addNote({ ...local, kind: 'question' });
    }
    onClose();
  };

  return (
    <Modal open title={existing ? 'Edit question' : 'New question'} onClose={onClose}>
      <div className="field">
        <span className="field-label">Question</span>
        <input className="input" autoFocus value={local.title} onChange={(e) => set({ title: e.target.value })}
          placeholder="What are you trying to answer?" />
      </div>
      <div className="row-2">
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Date asked</span>
          <input className="input" type="date" value={local.date || todayIso} onChange={(e) => set({ date: e.target.value })} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Resolution date</span>
          <input className="input" type="date" value={local.resolvedAt || ''} onChange={(e) => set({ resolvedAt: e.target.value || null })}
            placeholder="—" />
        </div>
      </div>
      {state.projects.length > 0 && (
        <div className="field">
          <span className="field-label">Projects</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {state.projects.map((p) => {
              const ids = local.projectIds || [local.projectId].filter(Boolean);
              return (
                <button key={p.id} type="button" className={`btn btn-sm${ids.includes(p.id) ? ' btn-primary' : ''}`}
                  onClick={() => toggleProject(p.id)}>
                  {p.code}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="field">
        <span className="field-label">Context</span>
        <textarea className="textarea" rows={2} value={local.body || ''} onChange={(e) => set({ body: e.target.value })}
          placeholder="What background is needed to understand this?" />
      </div>
      <div className="field">
        <span className="field-label">Resolution</span>
        <textarea className="textarea" rows={2} value={local.resolution || ''} onChange={(e) => set({ resolution: e.target.value })}
          placeholder="How was this resolved?" />
      </div>
      <div className="field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
          <input type="checkbox" checked={!!local.resolved} onChange={(e) => set({ resolved: e.target.checked })} />
          Mark as resolved
        </label>
      </div>
      <div className="field">
        <span className="field-label">Tags</span>
        <input className="input" value={(local.tags || []).join(', ')}
          onChange={(e) => set({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
          placeholder="e.g. architecture, vendor" />
      </div>
      <div className="modal-foot">
        {existing && (
          <button className="btn btn-danger btn-sm"
            onClick={() => { if (confirm('Delete this question?')) { actions.deleteNote(noteId); onClose(); } }}>
            <Icon name="trash" size={11} /> Delete
          </button>
        )}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!local.title.trim()} onClick={handleSave}>
          {existing ? 'Save changes' : 'Log question'}
        </button>
      </div>
    </Modal>
  );
}

function ResolveQuestionModal({ noteId, state, onClose }) {
  const note = (state.notes || []).find((n) => n.id === noteId);
  const [resolution, setResolution] = React.useState(note?.resolution || '');
  const todayIso = new Date().toISOString().slice(0, 10);
  const [resolvedAt, setResolvedAt] = React.useState(note?.resolvedAt || todayIso);
  if (!note) return null;

  return (
    <Modal open title="Resolve question" onClose={onClose}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--fg-1)' }}>{note.title}</div>
      <div className="field">
        <span className="field-label">Resolution</span>
        <textarea className="textarea" rows={4} autoFocus value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="How was this resolved? What did you decide or learn?" />
      </div>
      <div className="field">
        <span className="field-label">Resolution date</span>
        <input className="input" type="date" value={resolvedAt} onChange={(e) => setResolvedAt(e.target.value)} />
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { actions.updateNote(noteId, { resolved: true, resolution, resolvedAt }); onClose(); }}>
          Mark resolved
        </button>
      </div>
    </Modal>
  );
}

Object.assign(window, { QuestionsView });
