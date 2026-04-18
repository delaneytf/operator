// Standalone Risks view — all risks across projects, two-panel layout.

function RisksView({ state }) {
  const [filterProject, setFilterProject] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('open');
  const [search, setSearch] = React.useState('');
  const [selectedId, setSelectedId] = React.useState(null);
  const [editing, setEditing] = React.useState(false);

  const filtered = (state.risks || [])
    .filter((r) => filterStatus === 'all' || r.status === filterStatus)
    .filter((r) => filterProject === 'all' || r.projectId === filterProject)
    .filter((r) => !search || r.title.toLowerCase().includes(search.toLowerCase()) || (r.mitigation || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.severity * b.likelihood) - (a.severity * a.likelihood));

  const groups = [
    { key: 'open', label: 'Open' },
    { key: 'monitoring', label: 'Monitoring' },
    { key: 'closed', label: 'Closed' },
  ].map((g) => ({ ...g, items: filtered.filter((r) => r.status === g.key) }))
   .filter((g) => g.items.length > 0);

  const selected = (state.risks || []).find((r) => r.id === selectedId);
  const openCount = (state.risks || []).filter((r) => r.status !== 'closed').length;
  const critCount = (state.risks || []).filter((r) => r.status !== 'closed' && r.severity * r.likelihood >= 12).length;

  const newRisk = () => {
    const defaultPid = filterProject !== 'all' ? filterProject : (state.projects.find((p) => p.status !== 'done')?.id || '');
    const r = actions.addRisk({ title: 'New risk', projectId: defaultPid, severity: 3, likelihood: 3, mitigation: '', owner: '', status: 'open' });
    setSelectedId(r.id);
    setEditing(true);
  };

  const riskScore = (r) => r.severity * r.likelihood;
  const riskTier = (score) => score >= 12 ? 'danger' : score >= 6 ? 'warn' : 'ok';

  return (
    <div className="content-narrow decisions-wrap" style={{ maxWidth: 1280 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="row-flex-sb" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="title-h1">Risks</div>
            <div className="title-sub">{openCount} open{critCount > 0 ? ` · ${critCount} critical` : ''}</div>
          </div>
          <button className="btn btn-primary" onClick={newRisk}><Icon name="plus" size={11} /> New risk</button>
        </div>
      </div>

      <div className="decisions-split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <input className="input" placeholder="Search risks…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[['all', 'All'], ['open', 'Open'], ['monitoring', 'Monitoring'], ['closed', 'Closed']].map(([v, l]) => (
              <button key={v} className={`btn btn-sm${filterStatus === v ? ' btn-primary' : ''}`} onClick={() => setFilterStatus(v)}>{l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm${filterProject === 'all' ? ' btn-primary' : ''}`} onClick={() => setFilterProject('all')}>All projects</button>
            {state.projects.map((p) => (
              <button key={p.id} className={`btn btn-sm${filterProject === p.id ? ' btn-primary' : ''}`}
                onClick={() => setFilterProject(filterProject === p.id ? 'all' : p.id)}>
                {p.code}
              </button>
            ))}
          </div>
          <div className="decisions-list card" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {groups.map((g) => (
              <div key={g.key}>
                <div className="dec-section-hd">{g.label}</div>
                {g.items.map((r) => {
                  const proj = state.projects.find((p) => p.id === r.projectId);
                  const score = riskScore(r);
                  const tier = riskTier(score);
                  return (
                    <div key={r.id} className={`dec-card dec-card-hoverable${selectedId === r.id ? ' active' : ''}`}
                      onClick={() => { setSelectedId(r.id); setEditing(false); }}>
                      <div className="dec-card-hd">
                        <span className={`pill pill-${tier}`} style={{ fontSize: 11, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{score}</span>
                        <ProjectChip project={proj} />
                        <span style={{ flex: 1 }} />
                        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>S{r.severity}·L{r.likelihood}</span>
                      </div>
                      <div className="dec-card-title">{r.title}</div>
                      {r.mitigation && <div className="dec-card-body">{r.mitigation}</div>}
                    </div>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && <div className="empty">No risks match.</div>}
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {!selected ? (
            <div className="empty-pane">
              <div style={{ fontSize: 13, marginBottom: 6 }}>Select a risk to see details.</div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>Score = severity × likelihood. Critical ≥ 12.</div>
            </div>
          ) : (
            <RiskDetailPane key={selected.id} risk={selected} state={state} editing={editing} setEditing={setEditing} />
          )}
        </div>
      </div>
    </div>
  );
}

function RiskDetailPane({ risk, state, editing, setEditing }) {
  const [local, setLocal] = React.useState(risk);
  React.useEffect(() => setLocal(risk), [risk.id]);

  const save = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    actions.updateRisk(risk.id, patch);
  };

  const project = state.projects.find((p) => p.id === local.projectId);
  const score = local.severity * local.likelihood;
  const tier = score >= 12 ? 'danger' : score >= 6 ? 'warn' : 'ok';

  if (editing) {
    return (
      <div className="dec-detail" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
        <input className="input" style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }} value={local.title} autoFocus
          onChange={(e) => save({ title: e.target.value })} />
        <div className="row-2" style={{ marginBottom: 10 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <span className="field-label">Project</span>
            <select className="select" value={local.projectId || ''} onChange={(e) => save({ projectId: e.target.value })}>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name.split('—')[1]?.trim() || p.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <span className="field-label">Status</span>
            <select className="select" value={local.status || 'open'} onChange={(e) => save({ status: e.target.value })}>
              <option value="open">Open</option>
              <option value="monitoring">Monitoring</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <span className="field-label">Owner</span>
            <input className="input" value={local.owner || ''} onChange={(e) => save({ owner: e.target.value })} placeholder="Who owns this?" />
          </div>
        </div>
        <div className="row-2">
          <div className="field">
            <span className="field-label">Severity — {local.severity}/5</span>
            <input type="range" min="1" max="5" value={local.severity} onChange={(e) => save({ severity: +e.target.value })} style={{ width: '100%' }} />
          </div>
          <div className="field">
            <span className="field-label">Likelihood — {local.likelihood}/5</span>
            <input type="range" min="1" max="5" value={local.likelihood} onChange={(e) => save({ likelihood: +e.target.value })} style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <span className={`pill pill-${score >= 12 ? 'danger' : score >= 6 ? 'warn' : 'ok'}`} style={{ fontSize: 13, fontWeight: 700 }}>
            Score {local.severity * local.likelihood}
          </span>
        </div>
        <div className="field">
          <span className="field-label">Mitigation</span>
          <textarea className="input" rows={3} value={local.mitigation || ''} onChange={(e) => save({ mitigation: e.target.value })}
            placeholder="How are you managing or reducing this risk?" />
        </div>
        <div className="row-flex" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete this risk?')) actions.deleteRisk(risk.id); }}>
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
          <ProjectChip project={project} />
          <span className={`pill pill-${tier}`} style={{ fontSize: 13, fontWeight: 700 }}>Score {score}</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>S{risk.severity} · L{risk.likelihood}</span>
          <span className={`pill${risk.status === 'closed' ? ' pill-ok' : risk.status === 'monitoring' ? ' pill-warn' : ''}`}>{risk.status}</span>
        </div>
        <button className="btn btn-sm" onClick={() => setEditing(true)}><Icon name="edit" size={11} /> Edit</button>
      </div>

      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, letterSpacing: '-0.01em' }}>{risk.title}</div>

      {risk.mitigation && (
        <>
          <div className="dec-section-label">Mitigation</div>
          <div className="dec-body">{risk.mitigation}</div>
        </>
      )}

      {risk.owner && (
        <div style={{ marginTop: 16 }}>
          <div className="dec-section-label">Owner</div>
          <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{risk.owner}</div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { RisksView });
