// Program workspace — overview, description, deliverable, project summaries, milestones.

function ProgramView({ state, programId, onOpenProject }) {
  const program = (state.programs || []).find(p => p.id === programId);
  const [editingHeader, setEditingHeader] = React.useState(false);
  const [headerDraft, setHeaderDraft] = React.useState(null);

  if (!program) return <div className="content-narrow" style={{ padding: 32, color: 'var(--fg-4)' }}>Program not found.</div>;

  const projects = (state.projects || []).filter(p => p.programId === programId);
  const allMilestones = (state.milestones || []).filter(m => projects.some(p => p.id === m.projectId));
  const allTasks = (state.tasks || []).filter(t => projects.some(p => p.id === t.projectId));
  const allRisks = (state.risks || []).filter(r => projects.some(p => p.id === r.projectId));

  const activeProjects = projects.filter(p => p.status !== 'done' && p.status !== 'closed');
  const doneProjects = projects.filter(p => p.status === 'done' || p.status === 'closed');
  const atRisk = projects.filter(p => p.status === 'at-risk' || p.status === 'blocked').length;
  const openTasks = allTasks.filter(t => t.status !== 'done').length;
  const openRisks = allRisks.filter(r => r.status !== 'closed').length;

  // Overall program progress — average of all project progress
  const progPcts = projects.map(p => {
    const ms = allMilestones.filter(m => m.projectId === p.id);
    if (!ms.length) return (p.status === 'done' || p.status === 'closed') ? 100 : 0;
    return Math.round(ms.filter(m => m.status === 'done').length / ms.length * 100);
  });
  const avgPct = progPcts.length ? Math.round(progPcts.reduce((a, b) => a + b, 0) / progPcts.length) : 0;

  // Upcoming milestones across all projects
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = allMilestones
    .filter(m => m.status !== 'done' && m.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);

  const STATUS_ORDER = { 'blocked': 0, 'at-risk': 1, 'on-track': 2, 'done': 3, 'closed': 4 };
  const sortedProjects = [...projects].sort((a, b) => (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5));

  const startEdit = () => {
    setHeaderDraft({ name: program.name, description: program.description || '', deliverable: program.deliverable || '' });
    setEditingHeader(true);
  };
  const saveEdit = () => {
    actions.updateProgram(program.id, headerDraft);
    setEditingHeader(false);
  };

  const programCode = program.name.split('.')[0]; // "P1"

  return (
    <div className="content content-narrow" style={{ paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        {editingHeader ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input" style={{ fontSize: 20, fontWeight: 600 }}
              value={headerDraft.name}
              onChange={e => setHeaderDraft(d => ({ ...d, name: e.target.value }))} autoFocus />
            <textarea className="input" rows={2} placeholder="Program description"
              value={headerDraft.description}
              onChange={e => setHeaderDraft(d => ({ ...d, description: e.target.value }))}
              style={{ resize: 'vertical', fontSize: 13 }} />
            <input className="input" placeholder="Deliverable (what this program delivers when complete)"
              value={headerDraft.deliverable}
              onChange={e => setHeaderDraft(d => ({ ...d, deliverable: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
              <button className="btn btn-sm" onClick={() => setEditingHeader(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{programCode}</div>
                <div className="title-h1">{program.name.replace(/^P\d+\.\s*/, '')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                {program.status === 'done' && <span className="pill pill-ok" style={{ fontSize: 11 }}>Completed</span>}
                {program.status === 'closed' && <span className="pill pill-neutral" style={{ fontSize: 11 }}>Closed</span>}
                <button className="icon-btn" title="Edit program" onClick={startEdit}><Icon name="edit" size={13} /></button>
              </div>
            </div>
            {program.description && (
              <div className="title-sub" style={{ marginBottom: 8 }}>{program.description}</div>
            )}
            {program.deliverable ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deliverable</span>
                <span style={{ fontSize: 12.5, color: 'var(--fg-2)' }}>{program.deliverable}</span>
              </div>
            ) : (
              <button className="btn btn-sm" style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }} onClick={startEdit}>+ Add deliverable</button>
            )}
          </>
        )}
      </div>

      {/* Stat chips */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: 'Projects', value: projects.length, sub: `${doneProjects.length} completed/closed` },
          { label: 'Progress', value: `${avgPct}%`, sub: 'avg across projects' },
          { label: 'At risk / blocked', value: atRisk, tone: atRisk > 0 ? 'var(--warn)' : null },
          { label: 'Open tasks', value: openTasks },
          { label: 'Open risks', value: openRisks, tone: openRisks > 0 ? 'var(--danger)' : null },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '10px 16px', minWidth: 110, flex: '0 0 auto' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.tone || 'var(--fg-1)', lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{s.label}</div>
            {s.sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-4)', marginTop: 1 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Projects */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Projects — {activeProjects.length} active
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          {sortedProjects.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--fg-4)', fontSize: 12 }}>No projects in this program yet.</div>
          )}
          {sortedProjects.map(p => {
            const ms = allMilestones.filter(m => m.projectId === p.id);
            const donePct = ms.length ? Math.round(ms.filter(m => m.status === 'done').length / ms.length * 100) : ((p.status === 'done' || p.status === 'closed') ? 100 : 0);
            const nextMs = ms.filter(m => m.status !== 'done' && m.date).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
            const openT = allTasks.filter(t => t.projectId === p.id && t.status !== 'done').length;
            const highRisks = allRisks.filter(r => r.projectId === p.id && r.status !== 'closed' && r.severity * r.likelihood >= 12).length;
            const deps = (p.dependsOn || []).map(did => (state.projects || []).find(x => x.id === did)).filter(Boolean);

            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-1)', borderBottom: '1px solid var(--line-2)', cursor: 'pointer' }}
                onClick={() => onOpenProject(p.id)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-1)'}
              >
                {/* Status dot + code */}
                <span className={`sb-proj-dot pc-${p.status}`} style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)', flexShrink: 0, width: 28 }}>{p.code}</span>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name.split('—')[1]?.trim() || p.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Progress bar */}
                    <div style={{ width: 80, height: 4, borderRadius: 2, background: 'var(--line)', overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ width: `${donePct}%`, height: '100%', background: p.status === 'blocked' ? 'var(--danger)' : p.status === 'at-risk' ? 'var(--warn)' : 'var(--ok)', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--font-mono)' }}>{donePct}%</span>
                    {deps.length > 0 && (
                      <span style={{ fontSize: 10.5, color: 'var(--fg-4)' }} title={`Depends on: ${deps.map(d => d.code).join(', ')}`}>
                        ← {deps.map(d => d.code).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
                  {nextMs && (
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-4)' }}>next milestone</div>
                      <div>{nextMs.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>{fmtDate(nextMs.date)}</div>
                    </div>
                  )}
                  {openT > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)' }}>{openT}t</span>}
                  {highRisks > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--danger)' }}>⚠ {highRisks}</span>}
                  {p.owner && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{p.owner}</span>}
                  {p.dueDate && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>{fmtDate(p.dueDate)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming milestones */}
      {upcoming.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Upcoming milestones
          </div>
          <div className="card">
            {upcoming.map((m, i) => {
              const proj = projects.find(p => p.id === m.projectId);
              const daysUntil = Math.round((new Date(m.date) - today) / 86400000);
              const rel = daysUntil < 0 ? `${-daysUntil}d overdue` : daysUntil === 0 ? 'today' : `in ${daysUntil}d`;
              const tone = m.status === 'blocked' ? 'var(--danger)' : daysUntil < 0 ? 'var(--danger)' : daysUntil <= 14 ? 'var(--warn)' : 'var(--fg-4)';
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 14px', borderBottom: i < upcoming.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
                  <div className={`tl-ms tl-ms-${m.status}`} style={{ position: 'static', transform: 'none', marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 12.5 }}>{m.name}</div>
                    {m.description && <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 1 }}>{m.description}</div>}
                    {m.deliverable && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>→ {m.deliverable}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                    {proj && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-4)' }}>{proj.code}</span>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)' }}>{fmtDate(m.date)}</span>
                    <span style={{ fontSize: 10.5, color: tone }}>{rel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ProgramView });
