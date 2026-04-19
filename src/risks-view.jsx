// Risks view — tasks-style layout: metrics, search/filter, collapsible sections, expandable rows, modal edit.

function RisksView({ state }) {
  const [filterProject, setFilterProject] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [groupBy, setGroupBy] = React.useState('status'); // 'status' | 'severity'
  const [collapsed, setCollapsed] = React.useState({ closed: true });
  const [expandedId, setExpandedId] = React.useState(null);
  const [modalId, setModalId] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const riskScore = (r) => r.severity * r.likelihood;
  const riskTier = (score) => score >= 12 ? 'danger' : score >= 6 ? 'warn' : 'ok';

  const allRisks = state.risks || [];

  const filtered = allRisks
    .filter((r) => filterProject === 'all' || r.projectId === filterProject)
    .filter((r) => filterStatus === 'all' || r.status === filterStatus)
    .filter((r) => !search || r.title.toLowerCase().includes(search.toLowerCase())
      || (r.mitigation || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => riskScore(b) - riskScore(a));

  // Metrics across all risks
  const metricOpen = allRisks.filter((r) => r.status === 'open').length;
  const metricCritical = allRisks.filter((r) => r.status !== 'closed' && riskScore(r) >= 12).length;
  const metricHigh = allRisks.filter((r) => r.status !== 'closed' && riskScore(r) >= 6 && riskScore(r) < 12).length;
  const metricMonitoring = allRisks.filter((r) => r.status === 'monitoring').length;
  const metricClosed = allRisks.filter((r) => r.status === 'closed').length;
  const metricTotal = allRisks.length;

  const metrics = [
    { label: 'Open', value: metricOpen, color: metricOpen > 0 ? 'var(--warn)' : 'var(--fg-4)' },
    { label: 'Critical', value: metricCritical, color: metricCritical > 0 ? 'var(--danger)' : 'var(--fg-4)' },
    { label: 'High', value: metricHigh, color: metricHigh > 0 ? 'var(--warn)' : 'var(--fg-4)' },
    { label: 'Monitoring', value: metricMonitoring, color: 'var(--info)' },
    { label: 'Closed', value: metricClosed, color: 'var(--ok)' },
    { label: 'Total', value: metricTotal, color: 'var(--fg-2)' },
  ];

  // Build sections
  let sections;
  if (groupBy === 'status') {
    const defs = [
      { key: 'open', label: 'Open', labelColor: 'var(--warn)' },
      { key: 'monitoring', label: 'Monitoring', labelColor: 'var(--info)' },
      { key: 'closed', label: 'Closed', labelColor: 'var(--ok)', defaultCollapsed: true },
    ];
    sections = defs.map((g) => ({ ...g, items: filtered.filter((r) => r.status === g.key) })).filter((g) => g.items.length > 0);
  } else {
    const critical = filtered.filter((r) => riskScore(r) >= 12);
    const high = filtered.filter((r) => riskScore(r) >= 6 && riskScore(r) < 12);
    const low = filtered.filter((r) => riskScore(r) < 6);
    sections = [];
    if (critical.length > 0) sections.push({ key: 'critical', label: 'Critical (≥12)', labelColor: 'var(--danger)', items: critical });
    if (high.length > 0) sections.push({ key: 'high', label: 'High (6–11)', labelColor: 'var(--warn)', items: high });
    if (low.length > 0) sections.push({ key: 'low', label: 'Low (<6)', labelColor: 'var(--fg-4)', items: low });
  }

  React.useEffect(() => {
    const init = {};
    sections.forEach((s) => { if (s.defaultCollapsed && collapsed[s.key] === undefined) init[s.key] = true; });
    if (Object.keys(init).length) setCollapsed((prev) => ({ ...prev, ...init }));
  }, [groupBy]);

  const openModal = (id) => { setModalId(id || null); setShowModal(true); };

  return (
    <>
    <div className="content-narrow">
      <div className="row-flex-sb" style={{ marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <div className="title-h1">Risks</div>
          <div className="title-sub">{metricOpen} open{metricCritical > 0 ? ` · ${metricCritical} critical` : ''} · Score = severity × likelihood</div>
        </div>
        <button className="btn btn-primary" onClick={() => openModal(null)}>
          <Icon name="plus" size={11} /> New risk
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ background: 'var(--bg-1)', padding: '10px 14px' }}>
            <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: m.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="Search risks…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 12, width: 200, flexShrink: 0 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
          {[['all', 'All'], ['open', 'Open'], ['monitoring', 'Monitoring'], ['closed', 'Closed']].map(([v, l]) => (
            <button key={v} className={`btn btn-sm${filterStatus === v ? ' btn-primary' : ''}`} onClick={() => setFilterStatus(v)}>{l}</button>
          ))}
          <span style={{ width: 1, background: 'var(--line)', margin: '0 2px', alignSelf: 'stretch' }} />
          <button className={`btn btn-sm${filterProject === 'all' ? ' btn-primary' : ''}`} onClick={() => setFilterProject('all')}>All projects</button>
          {state.projects.map((p) => (
            <button key={p.id} className={`btn btn-sm${filterProject === p.id ? ' btn-primary' : ''}`}
              onClick={() => setFilterProject(filterProject === p.id ? 'all' : p.id)}>
              {p.code}
            </button>
          ))}
        </div>
        <div className="seg" style={{ flexShrink: 0 }}>
          <button type="button" className={`seg-btn${groupBy === 'status' ? ' active' : ''}`} onClick={() => setGroupBy('status')}>Status</button>
          <button type="button" className={`seg-btn${groupBy === 'severity' ? ' active' : ''}`} onClick={() => setGroupBy('severity')}>Severity</button>
        </div>
      </div>

      <div className="card">
        {sections.length === 0 && <div className="empty">No risks match.</div>}
        {sections.map((section) => (
          <div key={section.key}>
            <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection(section.key)}>
              <Icon name={collapsed[section.key] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
              <span style={{ color: section.labelColor }}>{section.label}</span>
              <span className="tgroup-head-count">{section.items.length}</span>
            </div>
            {!collapsed[section.key] && section.items.map((r) => (
              <RiskRow key={r.id} risk={r}
                project={state.projects.find((p) => p.id === r.projectId)}
                expanded={expandedId === r.id}
                onToggleExpand={() => toggleExpand(r.id)}
                onEdit={() => openModal(r.id)} />
            ))}
          </div>
        ))}
      </div>
    </div>

    {showModal && (
      <RiskModal riskId={modalId} state={state}
        defaults={{ projectId: filterProject !== 'all' ? filterProject : undefined }}
        onClose={() => { setShowModal(false); setModalId(null); }} />
    )}
    </>
  );
}

function RiskRow({ risk, project, expanded, onToggleExpand, onEdit }) {
  const score = risk.severity * risk.likelihood;
  const tier = score >= 12 ? 'danger' : score >= 6 ? 'warn' : 'ok';

  return (
    <React.Fragment>
      <div
        className={`trow${expanded ? ' trow-expanded' : ''}`}
        style={{ gridTemplateColumns: '42px 1fr 60px 96px 70px 54px 22px', cursor: 'pointer' }}
        onClick={onToggleExpand}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className={`pill pill-${tier}`} style={{ fontSize: 12, fontWeight: 700, minWidth: 28, textAlign: 'center', padding: '2px 6px' }}>{score}</span>
        </div>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center' }}>
          <span className="truncate" style={{ fontWeight: 500, fontSize: 13 }}>{risk.title}</span>
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', display: 'flex', alignItems: 'center' }}>
          S{risk.severity}·L{risk.likelihood}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className={`pill${risk.status === 'closed' ? ' pill-ok' : risk.status === 'monitoring' ? ' pill-info' : ''}`}
            style={{ fontSize: 10, padding: '1px 6px' }}>
            {risk.status}
          </span>
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', display: 'flex', alignItems: 'center' }}>
          {fmtDate(risk.createdAt)}
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
              <span className="pq-meta-item">
                <span className={`pill pill-${tier}`} style={{ fontSize: 12, fontWeight: 700 }}>{score}</span>
              </span>
              <span className="pq-meta-sep" />
              <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>
                S{risk.severity}/5 · L{risk.likelihood}/5
              </span>
              <span className="pq-meta-sep" />
              <span className="pq-meta-item">
                <span className={`pill${risk.status === 'closed' ? ' pill-ok' : risk.status === 'monitoring' ? ' pill-info' : ''}`}
                  style={{ fontSize: 10, padding: '1px 6px' }}>
                  {risk.status}
                </span>
              </span>
              {project && (
                <>
                  <span className="pq-meta-sep" />
                  <span className="pq-meta-item"><ProjectChip project={project} /></span>
                </>
              )}
              <span className="pq-meta-sep" />
              <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>Created {fmtDate(risk.createdAt)}</span>
            </div>
            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Icon name="edit" size={11} /> Edit
            </button>
          </div>
          {risk.mitigation && (
            <div className="pq-section">
              <div className="pq-section-label">Mitigation</div>
              <div className="pq-section-val">{risk.mitigation}</div>
            </div>
          )}
          {risk.owner && (
            <div className="pq-section">
              <div className="pq-section-label">Owner</div>
              <div className="pq-section-val">{risk.owner}</div>
            </div>
          )}
          <div className="pq-detail-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Created {fmtDate(risk.createdAt)}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {risk.status === 'open' && (
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); actions.updateRisk(risk.id, { status: 'monitoring' }); }}>Monitor</button>
              )}
              {risk.status !== 'closed' && (
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); actions.updateRisk(risk.id, { status: 'closed', closedAt: new Date().toISOString().slice(0, 10) }); }}>Close</button>
              )}
              {risk.status === 'closed' && (
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); actions.updateRisk(risk.id, { status: 'open', closedAt: null }); }}>Re-open</button>
              )}
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

function RiskModal({ riskId, state, defaults, onClose }) {
  const existing = riskId ? (state.risks || []).find((r) => r.id === riskId) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const initProjectId = defaults?.projectId || (state.projects.find((p) => p.status !== 'done')?.id || '');

  const [local, setLocal] = React.useState(existing ? { ...existing } : {
    title: '', severity: 3, likelihood: 3, mitigation: '',
    owner: '', status: 'open', projectId: initProjectId, createdAt: todayIso,
  });

  const set = (patch) => setLocal((prev) => ({ ...prev, ...patch }));
  const score = local.severity * local.likelihood;
  const tier = score >= 12 ? 'danger' : score >= 6 ? 'warn' : 'ok';

  const handleSave = () => {
    if (!local.title.trim()) return;
    if (existing) {
      actions.updateRisk(riskId, local);
    } else {
      actions.addRisk({ ...local });
    }
    onClose();
  };

  return (
    <Modal open title={existing ? 'Edit risk' : 'New risk'} onClose={onClose}>
      <div className="field">
        <span className="field-label">Title</span>
        <input className="input" autoFocus value={local.title} onChange={(e) => set({ title: e.target.value })}
          placeholder="What is the risk?" />
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
          <span className="field-label">Status</span>
          <select className="select" value={local.status || 'open'} onChange={(e) => set({ status: e.target.value })}>
            <option value="open">Open</option>
            <option value="monitoring">Monitoring</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Owner</span>
          <input className="input" value={local.owner || ''} onChange={(e) => set({ owner: e.target.value })}
            placeholder="Who owns this?" />
        </div>
      </div>
      <div className="row-2">
        <div className="field">
          <span className="field-label">Severity — {local.severity}/5</span>
          <input type="range" min="1" max="5" value={local.severity} onChange={(e) => set({ severity: +e.target.value })} style={{ width: '100%' }} />
        </div>
        <div className="field">
          <span className="field-label">Likelihood — {local.likelihood}/5</span>
          <input type="range" min="1" max="5" value={local.likelihood} onChange={(e) => set({ likelihood: +e.target.value })} style={{ width: '100%' }} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <span className={`pill pill-${tier}`} style={{ fontSize: 13, fontWeight: 700 }}>Score {score}</span>
      </div>
      <div className="field">
        <span className="field-label">Mitigation</span>
        <textarea className="textarea" rows={3} value={local.mitigation || ''} onChange={(e) => set({ mitigation: e.target.value })}
          placeholder="How are you managing or reducing this risk?" />
      </div>
      <div className="modal-foot">
        {existing && (
          <button className="btn btn-danger btn-sm"
            onClick={() => { if (confirm('Delete this risk?')) { actions.deleteRisk(riskId); onClose(); } }}>
            <Icon name="trash" size={11} /> Delete
          </button>
        )}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!local.title.trim()} onClick={handleSave}>
          {existing ? 'Save changes' : 'Add risk'}
        </button>
      </div>
    </Modal>
  );
}

Object.assign(window, { RisksView, RiskRow, RiskModal });
