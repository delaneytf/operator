// Decisions log — tasks-style layout: metrics, search/filter, collapsible sections, expandable rows, modal edit.

function DecisionsView({ state }) {
  const [filterIds, setFilterIds] = React.useState(new Set());
  const [search, setSearch] = React.useState('');
  const [groupBy, setGroupBy] = React.useState('quarter'); // 'quarter' | 'reversibility'
  const [collapsed, setCollapsed] = React.useState({ cancelled: true });
  const [expandedId, setExpandedId] = React.useState(null);
  const [modalId, setModalId] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);

  const isAllFilter = filterIds.size === 0;
  const visibleProjectIds = isAllFilter ? null : new Set(
    (state.projects || []).filter(p => filterIds.has(p.programId) || filterIds.has(p.id)).map(p => p.id)
  );

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const todayIso = new Date().toISOString().slice(0, 10);
  const getQuarter = (dateStr) => {
    const d = new Date((dateStr || todayIso) + 'T00:00:00');
    return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
  };
  const thisQ = getQuarter(todayIso);

  const allDecisions = (state.notes || []).filter((n) => n.kind === 'decision');

  const filtered = allDecisions
    .filter((n) => !visibleProjectIds || visibleProjectIds.has(n.projectId))
    .filter((n) => !search || n.title.toLowerCase().includes(search.toLowerCase())
      || (n.body || '').toLowerCase().includes(search.toLowerCase())
      || (n.context || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Metrics (always across all decisions, not filtered)
  const metricTotal = allDecisions.length;
  const metricThisQ = allDecisions.filter((n) => getQuarter(n.date || todayIso) === thisQ).length;
  const metricPinned = allDecisions.filter((n) => n.pinned).length;
  const metricIrreversible = allDecisions.filter((n) => n.reversibility === 'irreversible').length;

  const metrics = [
    { label: 'Total', value: metricTotal, color: 'var(--fg-2)' },
    { label: thisQ, value: metricThisQ, color: 'var(--accent)' },
    { label: 'Pinned', value: metricPinned, color: metricPinned > 0 ? 'var(--warn)' : 'var(--fg-4)' },
    { label: 'Irreversible', value: metricIrreversible, color: metricIrreversible > 0 ? 'var(--danger)' : 'var(--fg-4)' },
  ];

  // Build sections
  let sections;
  if (groupBy === 'quarter') {
    const pinned = filtered.filter((n) => n.pinned && !n.cancelled);
    const byQ = {};
    filtered.filter((n) => !n.pinned && !n.cancelled).forEach((n) => {
      const q = getQuarter(n.date || todayIso);
      (byQ[q] = byQ[q] || []).push(n);
    });
    sections = [];
    if (pinned.length > 0) sections.push({ key: 'pinned', label: 'Pinned', labelColor: 'var(--warn)', items: pinned });
    Object.keys(byQ).sort((a, b) => b.localeCompare(a)).forEach((q) => {
      sections.push({ key: q, label: q, labelColor: 'var(--fg-3)', items: byQ[q] });
    });
  } else {
    const irreversible = filtered.filter((n) => n.reversibility === 'irreversible' && !n.cancelled);
    const reversible = filtered.filter((n) => n.reversibility !== 'irreversible' && !n.cancelled);
    sections = [];
    if (irreversible.length > 0) sections.push({ key: 'irreversible', label: 'Irreversible', labelColor: 'var(--danger)', items: irreversible });
    if (reversible.length > 0) sections.push({ key: 'reversible', label: 'Reversible', labelColor: 'var(--fg-3)', items: reversible });
  }
  const cancelledDecisions = filtered.filter((n) => n.cancelled);
  if (cancelledDecisions.length > 0) {
    sections.push({ key: 'cancelled', label: 'Cancelled', labelColor: 'var(--fg-4)', items: cancelledDecisions });
  }

  const openModal = (id) => { setModalId(id || null); setShowModal(true); };

  return (
    <>
    <div className="content-narrow">
      <div className="row-flex-sb" style={{ marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <div className="title-h1">Decisions</div>
          <div className="title-sub">{metricTotal} logged · context, options, reversibility</div>
        </div>
        <button className="btn btn-primary" onClick={() => openModal(null)}>
          <Icon name="plus" size={11} /> Log decision
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <input className="input" placeholder="Search decisions…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 12, width: 200, flexShrink: 0 }} />
        <ProjectFilterDropdown
          programs={state.programs || []}
          projects={state.projects || []}
          selectedIds={filterIds}
          onChange={setFilterIds}
        />
        <div style={{ flex: 1 }} />
        <div className="seg" style={{ flexShrink: 0 }}>
          <button type="button" className={`seg-btn${groupBy === 'quarter' ? ' active' : ''}`} onClick={() => setGroupBy('quarter')}>Quarter</button>
          <button type="button" className={`seg-btn${groupBy === 'reversibility' ? ' active' : ''}`} onClick={() => setGroupBy('reversibility')}>Reversibility</button>
        </div>
      </div>

      <div className="card">
        {sections.length === 0 && <div className="empty">No decisions match.</div>}
        {sections.map((section) => (
          <div key={section.key}>
            <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection(section.key)}>
              <Icon name={collapsed[section.key] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
              <span style={{ color: section.labelColor }}>{section.label}</span>
              <span className="tgroup-head-count">{section.items.length}</span>
            </div>
            {!collapsed[section.key] && section.items.map((n) => (
              <DecisionRow
                key={n.id}
                note={n}
                project={state.projects.find((p) => p.id === n.projectId)}
                expanded={expandedId === n.id}
                onToggleExpand={() => toggleExpand(n.id)}
                onEdit={() => openModal(n.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>

    {showModal && (
      <DecisionModal
        noteId={modalId}
        state={state}
        defaults={{ projectId: visibleProjectIds?.size === 1 ? [...visibleProjectIds][0] : undefined }}
        onClose={() => { setShowModal(false); setModalId(null); }}
      />
    )}
    </>
  );
}

function DecisionRow({ note, project, expanded, onToggleExpand, onEdit }) {
  return (
    <React.Fragment>
      <div
        className={`trow${expanded ? ' trow-expanded' : ''}`}
        style={{ gridTemplateColumns: '20px 1fr 76px 100px 54px 22px', cursor: 'pointer' }}
        onClick={onToggleExpand}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {note.pinned && <Icon name="pin" size={10} style={{ color: 'var(--warn)', opacity: 0.8 }} />}
        </div>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="truncate" style={{ fontWeight: 500, fontSize: 13 }}>{note.title}</span>
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', display: 'flex', alignItems: 'center' }}>
          {fmtDate(note.date)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {note.reversibility === 'irreversible'
            ? <span className="pill pill-danger" style={{ fontSize: 10, padding: '1px 6px' }}>irreversible</span>
            : <span className="pill pill-ghost" style={{ fontSize: 10, padding: '1px 6px' }}>reversible</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ProjectChip project={project} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={expanded ? 'chevronD' : 'chevronR'} size={10} style={{ color: 'var(--fg-4)' }} />
        </div>
      </div>
      {expanded && (
        <div className="pq-detail" onClick={(e) => e.stopPropagation()}>
          <div className="pq-meta-row">
            <div className="pq-meta">
              <span className="pq-meta-item mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>D-{note.id.replace(/^n-/, '')}</span>
              <span className="pq-meta-sep" />
              <span className="pq-meta-item">
                {note.reversibility === 'irreversible'
                  ? <span className="pill pill-danger" style={{ fontSize: 10, padding: '1px 6px' }}>irreversible</span>
                  : <span className="pill" style={{ fontSize: 10, padding: '1px 6px' }}>reversible</span>}
              </span>
              {project && (
                <>
                  <span className="pq-meta-sep" />
                  <span className="pq-meta-item"><ProjectChip project={project} /></span>
                </>
              )}
              <span className="pq-meta-sep" />
              <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>Logged {fmtDate(note.date)}</span>
              {note.pinned && (
                <>
                  <span className="pq-meta-sep" />
                  <span className="pq-meta-item"><Icon name="pin" size={10} style={{ color: 'var(--warn)' }} /><span style={{ fontSize: 11, color: 'var(--warn)' }}>Pinned</span></span>
                </>
              )}
            </div>
            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Icon name="edit" size={11} /> Edit
            </button>
          </div>
          {note.body && (
            <div className="pq-section">
              <div className="pq-section-label">Choice</div>
              <div className="pq-section-val">{note.body}</div>
            </div>
          )}
          {note.context && (
            <div className="pq-section">
              <div className="pq-section-label">Context</div>
              <div className="pq-section-val">{note.context}</div>
            </div>
          )}
          {note.options && (
            <div className="pq-section">
              <div className="pq-section-label">Options considered</div>
              <div className="pq-section-val">{note.options}</div>
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
            <span>Logged {fmtDate(note.date)}</span>
            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); actions.togglePinned('notes', note.id); }}>
              <Icon name="pin" size={10} /> {note.pinned ? 'Unpin' : 'Pin'}
            </button>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

function DecisionModal({ noteId, state, defaults, onClose }) {
  const existing = noteId ? (state.notes || []).find((n) => n.id === noteId) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const initProjectId = defaults?.projectId || (state.projects[0]?.id || '');

  const [local, setLocal] = React.useState(existing ? { ...existing } : {
    kind: 'decision', title: '', body: '', context: '', options: '',
    reversibility: 'reversible', tags: [], date: todayIso,
    projectId: initProjectId, pinned: false,
  });

  const set = (patch) => setLocal((prev) => ({ ...prev, ...patch }));

  const handleSave = () => {
    if (!local.title.trim()) return;
    if (existing) {
      actions.updateNote(noteId, local);
    } else {
      actions.addNote({ ...local, kind: 'decision' });
    }
    onClose();
  };

  return (
    <Modal open title={existing ? 'Edit decision' : 'Log decision'} onClose={onClose}>
      <div className="field">
        <span className="field-label">Title</span>
        <input className="input" autoFocus value={local.title} onChange={(e) => set({ title: e.target.value })}
          placeholder="What was decided?" />
      </div>
      <div className="row-2">
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Project</span>
          <select className="select" value={local.projectId || ''} onChange={(e) => set({ projectId: e.target.value })}>
            <option value="">Select project…</option>
            {state.projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name.split('—')[1]?.trim() || p.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Date logged</span>
          <input className="input" type="date" value={local.date || todayIso} onChange={(e) => set({ date: e.target.value })} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Reversibility</span>
          <select className="select" value={local.reversibility || 'reversible'} onChange={(e) => set({ reversibility: e.target.value })}>
            <option value="reversible">Reversible</option>
            <option value="irreversible">Irreversible</option>
          </select>
        </div>
      </div>
      <div className="field">
        <span className="field-label">Choice / summary</span>
        <textarea className="textarea" rows={2} value={local.body || ''} onChange={(e) => set({ body: e.target.value })}
          placeholder="What was decided?" />
      </div>
      <div className="field">
        <span className="field-label">Context — what made this necessary</span>
        <textarea className="textarea" rows={2} value={local.context || ''} onChange={(e) => set({ context: e.target.value })}
          placeholder="What situation forced the decision?" />
      </div>
      <div className="field">
        <span className="field-label">Options considered</span>
        <textarea className="textarea" rows={2} value={local.options || ''} onChange={(e) => set({ options: e.target.value })}
          placeholder="A) … B) … C) …" />
      </div>
      <div className="field">
        <span className="field-label">Tags</span>
        <input className="input" value={(local.tags || []).join(', ')}
          onChange={(e) => set({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
          placeholder="e.g. architecture, hiring" />
      </div>
      <div className="modal-foot">
        {existing && (
          <button className="btn btn-danger btn-sm"
            onClick={() => { if (confirm('Delete this decision?')) { actions.deleteNote(noteId); onClose(); } }}>
            <Icon name="trash" size={11} /> Delete
          </button>
        )}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!local.title.trim()} onClick={handleSave}>
          {existing ? 'Save changes' : 'Log decision'}
        </button>
      </div>
    </Modal>
  );
}

Object.assign(window, { DecisionsView, DecisionRow, DecisionModal });
