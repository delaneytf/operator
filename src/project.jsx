// Project workspace — objective, milestones, tasks, notes, risks.

function DependsOnSelect({ project, allProjects }) {
  const [open, setOpen] = React.useState(false);
  const deps = project.dependsOn || [];
  const others = allProjects.filter(p => p.id !== project.id);

  const toggle = (id) => {
    const next = deps.includes(id) ? deps.filter(d => d !== id) : [...deps, id];
    actions.updateProject(project.id, { dependsOn: next });
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="select proj-status-select"
        style={{ padding: '2px 6px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        onClick={() => setOpen(o => !o)}
      >
        {deps.length === 0 ? 'No deps' : `${deps.length} dep${deps.length > 1 ? 's' : ''}`}
        <Icon name={open ? 'chevronD' : 'chevronR'} size={9} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', minWidth: 200, padding: '4px 0', marginTop: 2 }}>
          <div style={{ padding: '4px 10px 6px', fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Depends on</div>
          {others.map(p => (
            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <input type="checkbox" checked={deps.includes(p.id)} onChange={() => toggle(p.id)} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-3)' }}>{p.code}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg-2)' }}>{p.name.split('—')[1]?.trim() || p.name}</span>
            </label>
          ))}
          <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0 0' }}>
            <button style={{ width: '100%', padding: '6px 12px', fontSize: 11, color: 'var(--fg-4)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }} onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectTaskAddForm({ project, onDone }) {
  const successCriteria = project.successCriteria || [];
  const emptyDraft = { title: '', status: 'todo', priority: 'medium', dueDate: '', estimate: '', objectiveId: '', description: '', source: 'planned' };
  const [draft, setDraft] = React.useState(emptyDraft);

  return (
    <div style={{ padding: 14, borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
      <input className="input" style={{ marginBottom: 10, fontWeight: 600 }} value={draft.title} autoFocus
        onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Task title" />
      <div className="row-2">
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Status</span>
          <select className="select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="todo">Todo</option>
            <option value="in-progress">Doing</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Priority</span>
          <select className="select" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Due date</span>
          <input className="input" type="date" value={draft.dueDate || ''} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value || null })} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Estimate (hrs)</span>
          <input className="input" type="number" min="0" step="0.5" value={draft.estimate || ''} onChange={(e) => setDraft({ ...draft, estimate: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      {successCriteria.length > 0 && (
        <div className="field">
          <span className="field-label">Linked objective</span>
          <select className="select" value={draft.objectiveId || ''} onChange={(e) => setDraft({ ...draft, objectiveId: e.target.value })}>
            <option value="">— none —</option>
            {successCriteria.map((sc) => <option key={sc.id} value={sc.id}>{sc.text}</option>)}
          </select>
        </div>
      )}
      <div className="field">
        <span className="field-label">Description</span>
        <textarea className="textarea" rows={2} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value || null })} placeholder="Context, acceptance criteria, links, or notes…" />
      </div>
      <div className="field">
        <span className="field-label">Source</span>
        <div className="seg">
          {['planned', 'reactive'].map((s) => (
            <button key={s} type="button" className={`seg-btn ${draft.source === s ? 'active' : ''}`} onClick={() => setDraft({ ...draft, source: s })}>{s}</button>
          ))}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onDone}>Cancel</button>
        <button className="btn btn-primary" disabled={!draft.title} onClick={() => {
          actions.addTask({
            projectId: project.id, title: draft.title, status: draft.status, priority: draft.priority,
            dueDate: draft.dueDate || null, estimate: parseFloat(draft.estimate) || 1,
            objectiveId: draft.objectiveId || null, description: draft.description || null, source: draft.source,
          });
          onDone();
        }}>Add task</button>
      </div>
    </div>
  );
}

function ProjectView({ state, projectId, onOpenTask, onBack }) {
  const project = state.projects.find((p) => p.id === projectId);
  const [tab, setTab] = React.useState('overview');
  const [closeConfirming, setCloseConfirming] = React.useState(false);
  const [completionBlocker, setCompletionBlocker] = React.useState(null);
  const [editingHeader, setEditingHeader] = React.useState(false);

  if (!project) return <EmptyState title="Project not found" />;

  const tasks = state.tasks.filter((t) => t.projectId === projectId);
  const openTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const notes = state.notes.filter((n) => n.projectId === projectId && n.kind !== 'artifact');
  const projNotes = notes.filter((n) => n.kind === 'note');
  const projDecisions = notes.filter((n) => n.kind === 'decision');
  const projQuestions = notes.filter((n) => n.kind === 'question');
  const artifacts = state.notes.filter((n) => n.projectId === projectId && n.kind === 'artifact');
  const milestones = state.milestones.filter((m) => m.projectId === projectId);
  const risks = state.risks.filter((r) => r.projectId === projectId);
  const meetings = (state.meetings || []).filter((m) => (m.projectIds || []).includes(projectId)).sort((a, b) => b.date.localeCompare(a.date));
  const prog = projectProgress(state, projectId);
  const risk = projectRiskScore(state, projectId);

  const TAB_DEFS = [
    { id: 'overview',   label: 'Overview',   icon: 'target' },
    { id: 'tasks',      label: 'Tasks',      icon: 'list',     count: openTasks.length },
    { id: 'milestones', label: 'Milestones', icon: 'flag',     count: milestones.filter((m) => m.status !== 'done' && m.status !== 'cancelled').length },
    { id: 'notes',      label: 'Notes',      icon: 'note',     count: projNotes.length },
    { id: 'decisions',  label: 'Decisions',  icon: 'note',     count: projDecisions.length },
    { id: 'questions',  label: 'Questions',  icon: 'search',   count: projQuestions.length },
    { id: 'artifacts',  label: 'Artifacts',  icon: 'link',     count: artifacts.length },
    { id: 'risks',      label: 'Risks',      icon: 'warn',     count: risks.filter((r) => r.status !== 'closed' && r.status !== 'cancelled').length },
    { id: 'meetings',   label: 'Meetings',   icon: 'clock',    count: meetings.length },
  ];
  const DEFAULT_PROJECT_TAB_ORDER = TAB_DEFS.map((t) => t.id);
  const projectTabOrder = state.meta.projectTabOrder || DEFAULT_PROJECT_TAB_ORDER;
  const [dragTabOverId, setDragTabOverId] = React.useState(null);
  const onTabDragStart = (e, id) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); };
  const onTabDragOver  = (e, id) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (id !== dragTabOverId) setDragTabOverId(id); };
  const onTabDragLeave = (e, id) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragTabOverId(null); };
  const onTabDrop      = (e, targetId) => {
    e.preventDefault();
    setDragTabOverId(null);
    const dragId = e.dataTransfer.getData('text/plain');
    if (!dragId || dragId === targetId) return;
    const next = [...projectTabOrder];
    next.splice(next.indexOf(dragId), 1);
    next.splice(next.indexOf(targetId), 0, dragId);
    actions.setMeta({ projectTabOrder: next });
  };
  const onTabDragEnd = () => setDragTabOverId(null);

  return (
    <div className="content-narrow">
      {/* Header */}
      <div className="row-flex-sb" style={{ marginBottom: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingHeader ? (
            <>
              <div className="row-flex" style={{ marginBottom: 6 }}>
                <span className="pcard-code">{project.code}</span>
                <select
                  className="select proj-status-select"
                  style={{ padding: '2px 6px', fontSize: 11 }}
                  value={project.priority}
                  onChange={(e) => actions.updateProject(project.id, { priority: e.target.value })}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  className="select proj-status-select"
                  style={{ padding: '2px 6px', fontSize: 11 }}
                  value={project.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    if (newStatus === 'closed') {
                      if (project.status !== 'closed') setCloseConfirming(true);
                      return;
                    }
                    if (newStatus === 'done') {
                      const blockTasks = state.tasks.filter(t => t.projectId === project.id && t.status !== 'done' && t.status !== 'cancelled');
                      const blockMs = state.milestones.filter(m => m.projectId === project.id && m.status !== 'done' && m.status !== 'cancelled');
                      const blockQs = state.notes.filter(n => n.projectId === project.id && n.kind === 'question' && !n.resolved);
                      if (blockTasks.length || blockMs.length || blockQs.length) {
                        setCompletionBlocker({ tasks: blockTasks, milestones: blockMs, questions: blockQs });
                        return;
                      }
                      actions.updateProject(project.id, { status: 'done', completedDate: new Date().toISOString().slice(0, 10) });
                      return;
                    }
                    actions.updateProject(project.id, { status: newStatus });
                  }}
                >
                  <option value="on-track">On track</option>
                  <option value="at-risk">At risk</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Completed ✓</option>
                  <option value="closed">Closed</option>
                </select>
                {(state.programs || []).length > 0 && (
                  <select
                    className="select proj-status-select"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                    value={project.programId || ''}
                    onChange={(e) => actions.updateProject(project.id, { programId: e.target.value || null })}
                  >
                    <option value="">No program</option>
                    {(state.programs || []).map((pg) => (
                      <option key={pg.id} value={pg.id}>{pg.name}</option>
                    ))}
                  </select>
                )}
                {state.projects.filter(p => p.id !== project.id).length > 0 && (
                  <DependsOnSelect project={project} allProjects={state.projects} />
                )}
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>Start</span>
                <input
                  type="date"
                  className="input"
                  style={{ fontSize: 11, padding: '2px 6px', width: 130 }}
                  value={project.startDate || ''}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (!next || !project.startDate) { actions.updateProject(project.id, { startDate: next }); return; }
                    const delta = Math.round((new Date(next + 'T00:00:00') - new Date(project.startDate + 'T00:00:00')) / 86400000);
                    actions.shiftProjectDates(project.id, delta);
                  }}
                />
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>→</span>
                <input
                  type="date"
                  className="input"
                  style={{ fontSize: 11, padding: '2px 6px', width: 130 }}
                  value={project.dueDate || ''}
                  onChange={(e) => {
                    const next = e.target.value;
                    actions.updateProject(project.id, { dueDate: next });
                  }}
                />
              </div>
              <div className="title-h1" style={{ marginBottom: 6 }}>
                <InlineEdit
                  value={project.name}
                  onSave={(v) => actions.updateProject(project.id, { name: v })}
                  className="title-h1-edit"
                  placeholder="Project name"
                />
              </div>
              <div className="title-sub" style={{ maxWidth: 760 }}>
                <InlineEdit
                  value={project.objective}
                  onSave={(v) => actions.updateProject(project.id, { objective: v })}
                  multiline
                  className="title-sub-edit"
                  placeholder="Objective — what outcome does this project deliver?"
                />
              </div>
            </>
          ) : (
            <>
              <div className="row-flex" style={{ marginBottom: 14, gap: 8 }}>
                <span className="pcard-code">{project.code}</span>
                {project.programId && (() => {
                  const pg = (state.programs || []).find(p => p.id === project.programId);
                  return pg ? <span className="pill pill-ghost" style={{ fontSize: 10, padding: '1px 7px' }}>{pg.name}</span> : null;
                })()}
                <span className={`pill pill-${project.priority === 'critical' ? 'danger' : project.priority === 'high' ? 'warn' : 'ghost'}`} style={{ fontSize: 10, padding: '1px 7px' }}>{project.priority}</span>
                <span className={`pill pill-${project.status === 'blocked' ? 'danger' : project.status === 'at-risk' ? 'warn' : project.status === 'on-track' ? 'ok' : project.status === 'done' ? 'ok' : 'neutral'}`} style={{ fontSize: 10, padding: '1px 7px' }}>{project.status === 'on-track' ? 'On track' : project.status === 'at-risk' ? 'At risk' : project.status === 'blocked' ? 'Blocked' : project.status === 'done' ? 'Completed' : project.status === 'closed' ? 'Closed' : project.status}</span>
                {(project.dependsOn || []).length > 0 && (
                  <span style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>← {(project.dependsOn || []).map(did => { const d = state.projects.find(p => p.id === did); return d ? d.code : '?'; }).join(', ')}</span>
                )}
                {(project.startDate || project.dueDate) && (
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginLeft: 4 }}>
                    {project.startDate ? fmtDate(project.startDate) : '?'} → {project.dueDate ? fmtDate(project.dueDate) : '?'}
                  </span>
                )}
              </div>
              <div className="title-h1" style={{ marginBottom: 6 }}>{project.name}</div>
              {project.objective && <div className="title-sub" style={{ maxWidth: 760 }}>{project.objective}</div>}
            </>
          )}
        </div>
        <div className="stack-sm" style={{ minWidth: 200 }}>
          <div className="row-flex-sb">
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>PROGRESS</span>
            <span className="mono" style={{ fontSize: 12 }}>{prog.done}/{prog.total} · {prog.pct}%</span>
          </div>
          <Progress value={prog.pct} tone={project.status === 'blocked' ? 'danger' : project.status === 'at-risk' ? 'warn' : 'ok'} />
          <div className="row-flex-sb" style={{ marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>PEAK RISK</span>
            <span className="mono" style={{ fontSize: 12, color: risk.peak >= 12 ? 'var(--danger)' : risk.peak >= 8 ? 'var(--warn)' : 'var(--fg)' }}>
              {risk.peak || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ display: 'flex', alignItems: 'center' }}>
        {projectTabOrder.map((tabId) => {
          const t = TAB_DEFS.find((x) => x.id === tabId);
          if (!t) return null;
          return (
            <button key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''} ${dragTabOverId === t.id ? 'tab-drag-over' : ''}`}
              draggable
              onDragStart={(e) => onTabDragStart(e, t.id)}
              onDragOver={(e) => onTabDragOver(e, t.id)}
              onDragLeave={(e) => onTabDragLeave(e, t.id)}
              onDrop={(e) => onTabDrop(e, t.id)}
              onDragEnd={onTabDragEnd}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={12} /> {t.label}
              {t.count !== undefined && <span className="tab-count">{t.count}</span>}
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="icon-btn" title={editingHeader ? 'Done editing' : 'Edit project'} onClick={() => setEditingHeader(e => !e)}>
            <Icon name={editingHeader ? 'check' : 'edit'} size={13} />
          </button>
          <button className="icon-btn" title="Delete project" style={{ color: 'var(--danger)' }}
            onClick={() => {
              if (window.confirm(`Delete "${project.name}" and all its tasks, milestones, notes, and risks?`)) {
                actions.deleteProject(project.id);
                actions.setMeta({ activeView: 'portfolio' });
              }
            }}>
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>

      {tab === 'overview' && <OverviewTab project={project} state={state} milestones={milestones} tasks={tasks} onGoto={setTab} />}
      {tab === 'tasks' && <ProjectTasksTab project={project} tasks={tasks} state={state} onOpenTask={onOpenTask} />}
      {tab === 'milestones' && <MilestonesTab project={project} milestones={milestones} />}
      {tab === 'notes' && <NotesTab project={project} notes={projNotes} defaultKind="note" />}
      {tab === 'decisions' && <ProjectDecisionsTab project={project} decisions={projDecisions} state={state} />}
      {tab === 'questions' && <ProjectQuestionsTab project={project} questions={projQuestions} state={state} />}
      {tab === 'artifacts' && <ArtifactsTab project={project} artifacts={artifacts} state={state} />}
      {tab === 'risks' && <RisksTab project={project} risks={risks} state={state} />}
      {tab === 'meetings' && <MeetingsTab project={project} meetings={meetings} state={state} />}

      {/* Close project confirmation modal */}
      {closeConfirming && (() => {
        const cancelTasks = state.tasks.filter(t => t.projectId === project.id && t.status !== 'done' && t.status !== 'cancelled');
        const cancelMs = state.milestones.filter(m => m.projectId === project.id && m.status !== 'done' && m.status !== 'cancelled');
        const cancelQs = state.notes.filter(n => n.projectId === project.id && n.kind === 'question' && !n.resolved);
        return (
          <Modal open title={`Close project: ${project.code}`} onClose={() => setCloseConfirming(false)}>
            <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
              Closing this project will <strong>cancel all remaining items</strong>. This cannot be undone.
            </div>
            {cancelTasks.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginBottom: 4 }}>
                  {cancelTasks.length} task{cancelTasks.length > 1 ? 's' : ''} will be cancelled
                </div>
                {cancelTasks.slice(0, 5).map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12, color: 'var(--fg-3)' }}>
                    <PriorityBadge priority={t.priority} />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
                {cancelTasks.length > 5 && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>…and {cancelTasks.length - 5} more</div>}
              </div>
            )}
            {cancelMs.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginBottom: 4 }}>
                  {cancelMs.length} milestone{cancelMs.length > 1 ? 's' : ''} will be cancelled
                </div>
                {cancelMs.slice(0, 5).map(m => (
                  <div key={m.id} style={{ fontSize: 12, color: 'var(--fg-3)', padding: '3px 0' }}>{m.name}</div>
                ))}
                {cancelMs.length > 5 && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>…and {cancelMs.length - 5} more</div>}
              </div>
            )}
            {cancelQs.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginBottom: 4 }}>
                  {cancelQs.length} open question{cancelQs.length > 1 ? 's' : ''} will be resolved
                </div>
                {cancelQs.slice(0, 5).map(n => (
                  <div key={n.id} style={{ fontSize: 12, color: 'var(--fg-3)', padding: '3px 0' }}>{n.title}</div>
                ))}
                {cancelQs.length > 5 && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>…and {cancelQs.length - 5} more</div>}
              </div>
            )}
            {cancelTasks.length === 0 && cancelMs.length === 0 && cancelQs.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--fg-4)', marginBottom: 10 }}>No remaining items — this project is ready to close.</div>
            )}
            <div className="modal-foot">
              <button className="btn" onClick={() => setCloseConfirming(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { actions.closeProject(project.id); setCloseConfirming(false); }}>
                Close project
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* Completion blocker modal */}
      {completionBlocker && (
        <Modal open title="Cannot complete project" onClose={() => setCompletionBlocker(null)}>
          <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            All tasks, milestones, and questions must be completed before marking this project as Completed.
          </div>
          {completionBlocker.tasks.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginBottom: 4 }}>
                {completionBlocker.tasks.length} incomplete task{completionBlocker.tasks.length > 1 ? 's' : ''}
              </div>
              {completionBlocker.tasks.slice(0, 5).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12, color: 'var(--fg-3)' }}>
                  <PriorityBadge priority={t.priority} />
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
              {completionBlocker.tasks.length > 5 && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>…and {completionBlocker.tasks.length - 5} more</div>}
            </div>
          )}
          {completionBlocker.milestones.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginBottom: 4 }}>
                {completionBlocker.milestones.length} incomplete milestone{completionBlocker.milestones.length > 1 ? 's' : ''}
              </div>
              {completionBlocker.milestones.slice(0, 5).map(m => (
                <div key={m.id} style={{ fontSize: 12, color: 'var(--fg-3)', padding: '3px 0' }}>{m.name}</div>
              ))}
              {completionBlocker.milestones.length > 5 && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>…and {completionBlocker.milestones.length - 5} more</div>}
            </div>
          )}
          {completionBlocker.questions.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginBottom: 4 }}>
                {completionBlocker.questions.length} open question{completionBlocker.questions.length > 1 ? 's' : ''}
              </div>
              {completionBlocker.questions.slice(0, 5).map(n => (
                <div key={n.id} style={{ fontSize: 12, color: 'var(--fg-3)', padding: '3px 0' }}>{n.title}</div>
              ))}
              {completionBlocker.questions.length > 5 && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>…and {completionBlocker.questions.length - 5} more</div>}
            </div>
          )}
          <div className="modal-foot">
            <button className="btn btn-primary" onClick={() => setCompletionBlocker(null)}>OK</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function OverviewTab({ project, state, milestones, tasks, onGoto }) {
  const openTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const topTasks = [...openTasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.rank || 99) - (b.rank || 99)).slice(0, 5);
  const recentNotes = state.notes.filter((n) => n.projectId === project.id && n.kind !== 'artifact').slice(0, 3);
  const openRisks = state.risks.filter((r) => r.projectId === project.id && r.status !== 'closed' && r.status !== 'cancelled').sort((a, b) => b.severity * b.likelihood - a.severity * a.likelihood);
  const today = new Date().toISOString().slice(0, 10);
  const upcomingMeetings = (state.meetings || [])
    .filter((m) => (m.projectIds || []).includes(project.id) && m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const timedTasks = doneTasks.filter((t) => t.daysEarlyLate != null);
  const earlyTasks = timedTasks.filter((t) => t.daysEarlyLate > 0);
  const lateTasks = timedTasks.filter((t) => t.daysEarlyLate < 0);
  const onTimeTasks = timedTasks.filter((t) => t.daysEarlyLate === 0);
  const doneMilestones = milestones.filter((m) => m.status === 'done' && m.daysEarlyLate != null);
  const earlyMs = doneMilestones.filter((m) => m.daysEarlyLate > 0);
  const lateMs = doneMilestones.filter((m) => m.daysEarlyLate < 0);

  const DEFAULT_TILE_ORDER = ['success-criteria', 'milestones', 'priority-queue', 'open-risks', 'timing', 'meetings', 'notes'];
  const tileOrder = state.meta.overviewTileOrder || DEFAULT_TILE_ORDER;
  const [previewOrder, setPreviewOrder] = React.useState(null);
  const [activeTileId, setActiveTileId] = React.useState(null);
  const previewRef = React.useRef(null);
  const dragAllowedRef = React.useRef(false);
  const dragSrcRef = React.useRef(null);

  const onTileMouseDown = (e) => {
    const cardHead = e.currentTarget.querySelector('.card-head');
    const isInteractive = !!e.target.closest('button, select, input, textarea, a');
    dragAllowedRef.current = !isInteractive && !!cardHead && cardHead.contains(e.target);
  };
  const onTileDragStart = (e, id) => {
    if (!dragAllowedRef.current) { e.preventDefault(); return; }
    dragSrcRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    const initial = [...tileOrder];
    previewRef.current = initial;
    setPreviewOrder(initial);
    setActiveTileId(id);
  };
  const onTileDragEnd = () => {
    dragSrcRef.current = null;
    dragAllowedRef.current = false;
    if (previewRef.current) actions.setMeta({ overviewTileOrder: previewRef.current });
    previewRef.current = null;
    setPreviewOrder(null);
    setActiveTileId(null);
  };
  const onTileDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const srcId = dragSrcRef.current;
    const order = previewRef.current;
    if (!srcId || srcId === id || !order) return;
    // Only reorder when cursor is in top 30% or bottom 30% — dead zone prevents oscillation
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientY - rect.top) / rect.height;
    if (pct > 0.3 && pct < 0.7) return;
    const insertAfter = pct >= 0.7;
    const srcIdx = order.indexOf(srcId);
    const next = [...order];
    next.splice(srcIdx, 1);
    const tgtIdx = next.indexOf(id);
    if (tgtIdx === -1) return;
    next.splice(insertAfter ? tgtIdx + 1 : tgtIdx, 0, srcId);
    if (next.join() !== order.join()) {
      previewRef.current = next;
      setPreviewOrder([...next]);
    }
  };
  const onTileDrop = (e) => { e.preventDefault(); };

  const WIDE_TILES = new Set(['timing', 'meetings', 'notes']);

  const tileContent = {
    'success-criteria': <SuccessCriteriaCard project={project} />,
    'milestones': (
      <div className="card">
        <div className="card-head">
          <span className="card-head-title">Upcoming milestones</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onGoto('milestones')}>View all</button>
        </div>
        <MilestoneCompactList project={project} milestones={milestones} />
      </div>
    ),
    'priority-queue': (
      <div className="card">
        <div className="card-head">
          <span className="card-head-title">Priority queue</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onGoto('tasks')}>All tasks</button>
        </div>
        {topTasks.length === 0 ? (
          <EmptyState title="Nothing open" icon="check" />
        ) : topTasks.map((t) => (
          <TaskRow key={t.id} task={t} project={project} onOpen={() => onGoto('tasks')} onToggle={actions.toggleTaskDone} />
        ))}
      </div>
    ),
    'open-risks': (
      <div className="card">
        <div className="card-head">
          <span className="card-head-title">Open risks</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onGoto('risks')}>All risks</button>
        </div>
        {openRisks.length === 0 ? (
          <EmptyState title="No open risks" icon="check" />
        ) : openRisks.slice(0, 4).map((r) => (
          <div key={r.id} className="risk-row">
            <div className={`risk-sev risk-sev-${Math.ceil((r.severity * r.likelihood) / 5)}`}>{r.severity * r.likelihood}</div>
            <div>
              <div style={{ fontWeight: 500 }}>{r.title}</div>
              <div className="mono" style={{ color: 'var(--fg-3)', fontSize: 11, marginTop: 2 }}>{r.mitigation}</div>
            </div>
            <span />
            <Pill tone={r.status === 'monitoring' ? 'info' : 'warn'}>{r.status}</Pill>
            <span />
          </div>
        ))}
      </div>
    ),
    'timing': timedTasks.length > 0 ? (
      <div className="card">
        <div className="card-head">
          <span className="card-head-title">Completion timing</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{timedTasks.length} tracked · {doneMilestones.length} milestones</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--line)' }}>
          {[
            { label: 'Early', count: earlyTasks.length, ms: earlyMs.length, tone: 'var(--ok)' },
            { label: 'On time', count: onTimeTasks.length, ms: 0, tone: 'var(--fg-3)' },
            { label: 'Late', count: lateTasks.length, ms: lateMs.length, tone: 'var(--danger)' },
          ].map(({ label, count, ms, tone }) => (
            <div key={label} className="timing-cell" style={{ padding: '10px 14px' }}>
              <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: tone }}>{count}<span style={{ fontSize: 11, color: 'var(--fg-4)', marginLeft: 4 }}>tasks</span></div>
              {ms > 0 && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{ms} milestone{ms > 1 ? 's' : ''}</div>}
            </div>
          ))}
        </div>
        {lateTasks.length > 0 && (
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line)' }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', marginBottom: 6 }}>Late completions</div>
            {lateTasks.slice(0, 5).map((t) => (
              <div key={t.id} className="row-flex" style={{ fontSize: 12, gap: 8, marginBottom: 4 }}>
                <span style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 11, flexShrink: 0 }}>{Math.abs(t.daysEarlyLate)}d late</span>
                <span className="truncate">{t.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ) : null,
    'meetings': upcomingMeetings.length > 0 ? (
      <div className="card">
        <div className="card-head">
          <span className="card-head-title">Upcoming meetings</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onGoto('meetings')}>View all</button>
        </div>
        {upcomingMeetings.map((m) => {
          const recLabel = m.recurrence && m.recurrence !== 'none' ? RECURRENCE_LABELS[m.recurrence] : null;
          const linkedTaskCount = (state.tasks || []).filter((t) => t.meetingId === m.id).length;
          const linkedDecCount = (state.notes || []).filter((n) => n.meetingId === m.id && n.kind === 'decision').length;
          return (
            <div key={m.id} className="ms-compact-row" style={{ cursor: 'default' }}>
              <Icon name="clock" size={12} style={{ color: 'var(--mtg)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }} className="truncate">{m.title}</div>
                {m.attendees && <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 2 }}>{m.attendees}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                <div className="row-flex" style={{ gap: 6 }}>
                  {recLabel && <span className="pill" style={{ fontSize: 9.5, padding: '1px 5px' }}>↻ {recLabel}</span>}
                  <span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{fmtDate(m.date)}</span>
                </div>
                {(linkedTaskCount > 0 || linkedDecCount > 0) && (
                  <div className="row-flex" style={{ gap: 6 }}>
                    {linkedTaskCount > 0 && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{linkedTaskCount} task{linkedTaskCount > 1 ? 's' : ''}</span>}
                    {linkedDecCount > 0 && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{linkedDecCount} decision{linkedDecCount > 1 ? 's' : ''}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    ) : null,
    'notes': recentNotes.length > 0 ? (
      <div className="card">
        <div className="card-head">
          <span className="card-head-title">Recent notes</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onGoto('notes')}>All notes</button>
        </div>
        {recentNotes.map((n) => <NoteRow key={n.id} note={n} />)}
      </div>
    ) : null,
  };

  const effectiveOrder = previewOrder || tileOrder;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      {effectiveOrder.map((id) => {
        const content = tileContent[id];
        if (!content) return null;
        const isWide = WIDE_TILES.has(id);
        const isActive = activeTileId === id;
        return (
          <div key={id}
            draggable
            onMouseDown={onTileMouseDown}
            onDragStart={(e) => onTileDragStart(e, id)}
            onDragEnd={onTileDragEnd}
            onDragOver={(e) => onTileDragOver(e, id)}
            onDrop={onTileDrop}
            style={{
              gridColumn: isWide ? '1 / -1' : 'auto',
              opacity: isActive ? 0.4 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

function SuccessCriteriaCard({ project }) {
  const [editingId, setEditingId] = React.useState(null);
  const [draft, setDraft] = React.useState({});

  const startEdit = (sc) => { setEditingId(sc.id); setDraft({ text: sc.text, current: sc.current, target: sc.target }); };
  const saveEdit = () => {
    if (draft.text) actions.updateSuccessCriterion(project.id, editingId, draft);
    setEditingId(null);
  };

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-head-title">Objective & success criteria</span>
        <button className="btn btn-ghost btn-sm" onClick={() => actions.addSuccessCriterion(project.id, { text: 'New criterion', current: '0', target: '100' })}>
          <Icon name="plus" size={11} /> Add
        </button>
      </div>
      <div className="card-body-flush">
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', color: 'var(--fg-2)', fontSize: 13, lineHeight: 1.5 }}>
          {project.objective}
        </div>
        <div className="sc-row" style={{ color: 'var(--fg-4)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
          <span>Criterion</span>
          <span style={{ textAlign: 'right' }}>Current</span>
          <span style={{ textAlign: 'right' }}>Target</span>
          <span />
        </div>
        {(project.successCriteria || []).map((sc) => {
          const pct = (() => {
            const cur = parseFloat(sc.current);
            const tgt = parseFloat(sc.target);
            if (isNaN(cur) || isNaN(tgt) || tgt === 0) return 0;
            return Math.min(100, Math.round((cur / tgt) * 100));
          })();
          if (editingId === sc.id) {
            return (
              <div key={sc.id} style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
                <div className="row-2" style={{ marginBottom: 6 }}>
                  <input className="input" placeholder="Criterion" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} autoFocus />
                  <input className="input" placeholder="Current" value={draft.current} onChange={(e) => setDraft({ ...draft, current: e.target.value })} style={{ width: 80 }} />
                  <input className="input" placeholder="Target" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} style={{ width: 80 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-danger-ghost btn-sm" onClick={() => { actions.deleteSuccessCriterion(project.id, sc.id); setEditingId(null); }}>Delete</button>
                  <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                </div>
              </div>
            );
          }
          return (
            <div className="sc-row sc-row-editable" key={sc.id} onClick={() => startEdit(sc)} title="Click to edit">
              <div className="sc-row-label">{sc.text}</div>
              <div className="sc-row-val">{sc.current}</div>
              <div className="sc-row-val" style={{ color: 'var(--fg-4)' }}>{sc.target}</div>
              <Progress value={pct} tone={pct >= 80 ? 'ok' : pct >= 40 ? 'warn' : 'danger'} />
            </div>
          );
        })}
        {(!project.successCriteria || project.successCriteria.length === 0) && (
          <div style={{ padding: '14px', color: 'var(--fg-4)', fontSize: 12, textAlign: 'center' }}>No criteria yet — click Add to define success.</div>
        )}
      </div>
    </div>
  );
}

function MilestoneCompactList({ project, milestones }) {
  if (!milestones.length) {
    return <EmptyState title="No milestones" icon="flag" />;
  }
  const todayT = today0().getTime();
  const sorted = [...milestones].sort((a, b) => parseDate(a.date) - parseDate(b.date));
  // Show next 4 upcoming (or latest if none upcoming).
  const upcoming = sorted.filter((m) => parseDate(m.date).getTime() >= todayT - DAY);
  const list = (upcoming.length ? upcoming : sorted.slice(-4)).slice(0, 5);

  return (
    <div className="ms-compact">
      {list.map((m) => {
        const t = parseDate(m.date).getTime();
        const days = Math.round((t - todayT) / DAY);
        const rel = m.status === 'done' ? 'done'
          : days < 0 ? `${-days}d overdue`
          : days === 0 ? 'today'
          : days === 1 ? 'tomorrow'
          : `in ${days}d`;
        const toneClass = m.status === 'done' ? 'ms-c-done'
          : days < 0 ? 'ms-c-over'
          : days <= 7 ? 'ms-c-soon'
          : 'ms-c-far';
        return (
          <div key={m.id} className={`ms-compact-row ${toneClass}`}>
            <div className={`tl-ms tl-ms-${m.status}`} style={{ position: 'static', transform: 'none' }} />
            <div style={{ minWidth: 0 }}>
              <div className="ms-compact-title" title={m.name}>{m.name}</div>
              {m.deliverable && <div className="ms-compact-sub">{m.deliverable}</div>}
            </div>
            <div className="ms-compact-date">
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{fmtDate(m.date)}</div>
              <div className="ms-compact-rel">{rel}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MilestoneTimeline({ project, milestones }) {
  if (!milestones.length) {
    return <EmptyState title="No milestones" icon="flag" />;
  }
  const start = parseDate(project.startDate).getTime();
  const end = parseDate(project.dueDate).getTime();
  const span = Math.max(end - start, DAY);
  const todayT = today0().getTime();
  const todayPct = Math.max(0, Math.min(100, ((todayT - start) / span) * 100));

  // Sort by date; alternate above/below by default; bump to outer lane on collision.
  const sorted = [...milestones].sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const COLLIDE_PCT = 18; // callouts closer than this % clash
  const placed = sorted.map((m, i) => {
    const t = parseDate(m.date).getTime();
    const pct = Math.max(0, Math.min(100, ((t - start) / span) * 100));
    return { ms: m, pct, side: i % 2 === 0 ? 'below' : 'above', lane: 0, i };
  });
  const lanesPerSide = { above: [], below: [] };
  placed.forEach((p) => {
    const lanes = lanesPerSide[p.side];
    let lane = 0;
    while (lane < 6) {
      const occ = lanes[lane] || [];
      if (!occ.some((q) => Math.abs(q - p.pct) < COLLIDE_PCT)) break;
      lane++;
    }
    p.lane = lane;
    if (!lanes[lane]) lanes[lane] = [];
    lanes[lane].push(p.pct);
  });

  const maxLaneAbove = placed.some((p) => p.side === 'above')
    ? Math.max(...placed.filter((p) => p.side === 'above').map((p) => p.lane)) + 1 : 0;
  const maxLaneBelow = placed.some((p) => p.side === 'below')
    ? Math.max(...placed.filter((p) => p.side === 'below').map((p) => p.lane)) + 1 : 0;
  const LANE_H = 32;
  const aboveH = maxLaneAbove * LANE_H + 10;
  const belowH = maxLaneBelow * LANE_H + 10;
  const trackHeight = aboveH + belowH + 12;

  return (
    <div className="timeline">
      <div className="timeline-track" style={{ height: trackHeight, paddingTop: aboveH, paddingBottom: belowH }}>
        <div className="timeline-today" style={{ left: `${todayPct}%` }} />
        {placed.map((p) => {
          const { ms: m, pct, side, lane } = p;
          const offset = 12 + lane * LANE_H;
          // Near edges, shift the callout's transform anchor so it doesn't clip
          const anchor = pct < 8 ? 'flex-start' : pct > 92 ? 'flex-end' : 'center';
          const translateX = pct < 8 ? '0%' : pct > 92 ? '-100%' : '-50%';
          const calloutStyle = side === 'above'
            ? { bottom: `calc(50% + ${offset}px)`, transform: `translateX(${translateX})`, alignItems: anchor, textAlign: anchor === 'flex-start' ? 'left' : anchor === 'flex-end' ? 'right' : 'center' }
            : { top: `calc(50% + ${offset}px)`, transform: `translateX(${translateX})`, alignItems: anchor, textAlign: anchor === 'flex-start' ? 'left' : anchor === 'flex-end' ? 'right' : 'center' };
          return (
            <div key={m.id} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0 }}>
              <div className={`tl-ms tl-ms-${m.status}`} />
              <div className={`tl-ms-stem tl-ms-stem-${side}`} style={{ height: offset - 6 }} />
              <div className={`tl-ms-callout tl-ms-callout-${side}`} style={calloutStyle}>
                <div className="tl-ms-date">{fmtDate(m.date)}</div>
                <div className="tl-ms-label" title={m.name}>{m.name}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MilestoneRow({ milestone: m }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: m.name, description: m.description || '', date: m.date, deliverable: m.deliverable || '' });

  return (
    <>
      <div className="ms-row ms-row-hoverable" onClick={() => setEditing(true)}>
        <span className={`ms-row-bullet tl-ms-${m.status}`} />
        <div>
          <div style={{ fontWeight: 500 }}>{m.name}</div>
          {m.description && <div style={{ color: 'var(--fg-3)', fontSize: 11.5, marginTop: 1 }}>{m.description}</div>}
          {m.deliverable && <div className="mono" style={{ color: 'var(--fg-4)', fontSize: 11, marginTop: m.description ? 6 : 2 }}>→ {m.deliverable}</div>}
        </div>
        {m.status === 'done' && m.completedDate ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>due {fmtDate(m.date)}</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ok)' }}>done {fmtDate(m.completedDate)}</span>
          </div>
        ) : (
          <DueChip date={m.date} done={m.status === 'done'} />
        )}
        <select className="select" style={{ padding: '3px 6px', fontSize: 11 }} value={m.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => actions.updateMilestone(m.id, { status: e.target.value })}>
          <option value="planned">Planned</option>
          <option value="in-progress">In progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </select>
        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setEditing(true); }}><Icon name="edit" size={12} /></button>
      </div>
      {editing && (
        <Modal open title="Edit milestone" onClose={() => setEditing(false)}>
          <div className="field">
            <span className="field-label">Name</span>
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
          </div>
          <div className="row-2">
            <div className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">Target date</span>
              <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">Status</span>
              <select className="select" value={m.status} onChange={(e) => actions.updateMilestone(m.id, { status: e.target.value })}>
                <option value="planned">Planned</option>
                <option value="in-progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="field">
            <span className="field-label">Description</span>
            <textarea className="textarea" rows={2} placeholder="What must be true at this point?" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="field">
            <span className="field-label">Deliverable</span>
            <input className="input" placeholder="Artifact that proves completion" value={draft.deliverable} onChange={(e) => setDraft({ ...draft, deliverable: e.target.value })} />
          </div>
          <div className="modal-foot">
            <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete milestone?')) { actions.deleteMilestone(m.id); setEditing(false); } }}>
              <Icon name="trash" size={11} /> Delete
            </button>
            <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { actions.updateMilestone(m.id, draft); setEditing(false); }}>Save</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function MilestonesTab({ project, milestones }) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: '', description: '', date: '', deliverable: '' });

  return (
    <>
      {adding && (
        <Modal open title="New milestone" onClose={() => setAdding(false)}>
          <div className="field">
            <span className="field-label">Name</span>
            <input className="input" placeholder="Milestone name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
          </div>
          <div className="field">
            <span className="field-label">Target date</span>
            <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </div>
          <div className="field">
            <span className="field-label">Description</span>
            <textarea className="textarea" rows={2} placeholder="What must be true at this point?" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="field">
            <span className="field-label">Deliverable</span>
            <input className="input" placeholder="Artifact that proves completion" value={draft.deliverable} onChange={(e) => setDraft({ ...draft, deliverable: e.target.value })} />
          </div>
          <div className="modal-foot">
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={!draft.name || !draft.date} onClick={() => {
              actions.addMilestone({ ...draft, projectId: project.id });
              setDraft({ name: '', description: '', date: '', deliverable: '' });
              setAdding(false);
            }}>Add milestone</button>
          </div>
        </Modal>
      )}
      <MilestoneTimeline project={project} milestones={milestones} />
      <div className="card">
        <div className="card-head">
          <span className="card-head-title">Milestones</span>
          <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={11} /> New milestone</button>
        </div>
        {milestones.length === 0 ? (
          <EmptyState title="No milestones yet" icon="flag" />
        ) : milestones.map((m) => <MilestoneRow key={m.id} milestone={m} />)}
      </div>
    </>
  );
}

function NoteRow({ note }) {
  const isQuestion = note.kind === 'question';
  const [expanded, setExpanded] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);
  const [resolutionText, setResolutionText] = React.useState('');
  const noteToDraft = (n) => ({ kind: n.kind, title: n.title, body: n.body || '', context: n.context || '', options: n.options || '', reversibility: n.reversibility || 'reversible', resolution: n.resolution || '', resolved: !!n.resolved, tags: (n.tags || []).join(', ') });
  const [draft, setDraft] = React.useState(() => noteToDraft(note));

  React.useEffect(() => {
    if (!editing) setDraft(noteToDraft(note));
  }, [note.id, note.title, note.body, note.resolved, editing]);

  const dotColor = note.kind === 'question'
    ? (note.resolved ? 'var(--ok)' : 'var(--warn)')
    : note.kind === 'decision' ? 'var(--accent)' : 'var(--fg-3)';

  const statusPill = note.kind === 'decision'
    ? (note.reversibility === 'irreversible'
      ? <span className="pill pill-danger" style={{ fontSize: 10, padding: '1px 6px' }}>irreversible</span>
      : <span className="pill" style={{ fontSize: 10, padding: '1px 6px' }}>reversible</span>)
    : note.kind === 'question'
    ? (note.resolved
      ? <span className="pill pill-ok" style={{ fontSize: 10, padding: '1px 6px' }}>resolved</span>
      : <span className="pill pill-warn" style={{ fontSize: 10, padding: '1px 6px' }}>open</span>)
    : null;

  if (editing) {
    return (
      <div className="pq-detail" style={{ paddingLeft: 14 }} onClick={(e) => e.stopPropagation()}>
        <div className="field">
          <span className="field-label">Kind</span>
          <div className="seg">
            {['note', 'decision', 'question'].map((k) => (
              <button key={k} className={`seg-btn ${draft.kind === k ? 'active' : ''}`} onClick={() => setDraft({ ...draft, kind: k })}>{k}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Title</span>
          <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
        </div>
        {draft.kind === 'decision' && (
          <div className="field">
            <span className="field-label">Reversibility</span>
            <select className="select" value={draft.reversibility} onChange={(e) => setDraft({ ...draft, reversibility: e.target.value })}>
              <option value="reversible">Reversible</option>
              <option value="irreversible">Irreversible</option>
            </select>
          </div>
        )}
        <div className="field">
          <span className="field-label">{draft.kind === 'decision' ? 'Choice / summary' : 'Body'}</span>
          <textarea className="textarea" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        </div>
        {draft.kind === 'decision' && (
          <>
            <div className="field">
              <span className="field-label">Context</span>
              <textarea className="textarea" rows={2} value={draft.context} onChange={(e) => setDraft({ ...draft, context: e.target.value })} placeholder="What situation forced the decision?" />
            </div>
            <div className="field">
              <span className="field-label">Options considered</span>
              <textarea className="textarea" rows={2} value={draft.options} onChange={(e) => setDraft({ ...draft, options: e.target.value })} placeholder="A) … B) … C) …" />
            </div>
          </>
        )}
        {draft.kind === 'question' && (
          <>
            <div className="field">
              <span className="field-label">Resolution</span>
              <textarea className="textarea" rows={2} value={draft.resolution} onChange={(e) => setDraft({ ...draft, resolution: e.target.value })} placeholder="How was this resolved?" />
            </div>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                <input type="checkbox" checked={draft.resolved} onChange={(e) => setDraft({ ...draft, resolved: e.target.checked })} />
                Mark as resolved
              </label>
            </div>
          </>
        )}
        <div className="field">
          <span className="field-label">Tags (comma-separated)</span>
          <input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
        </div>
        <div className="pq-detail-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-danger-ghost btn-sm" onClick={() => { if (confirm('Delete this note?')) actions.deleteNote(note.id); }}>
            <Icon name="trash" size={11} /> Delete
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={() => {
              if (!draft.title) return;
              actions.updateNote(note.id, {
                kind: draft.kind, title: draft.title, body: draft.body,
                context: draft.context, options: draft.options, reversibility: draft.reversibility,
                resolution: draft.resolution, resolved: draft.resolved,
                tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean),
              });
              setEditing(false);
            }}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  if (resolving) {
    return (
      <div className="pq-detail" style={{ paddingLeft: 14 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 12 }}>{note.title}</div>
        <div className="field">
          <span className="field-label">Resolution</span>
          <textarea className="textarea" rows={3} autoFocus value={resolutionText} onChange={(e) => setResolutionText(e.target.value)} placeholder="How was this resolved?" />
        </div>
        <div className="pq-detail-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button className="btn btn-sm" onClick={() => { setResolving(false); setResolutionText(''); }}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => {
            actions.updateNote(note.id, { resolved: true, resolution: resolutionText, resolvedAt: new Date().toISOString().slice(0, 10) });
            setResolving(false); setResolutionText('');
          }}>Mark resolved</button>
        </div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div
        className={`trow${expanded ? ' trow-expanded' : ''}`}
        style={{ gridTemplateColumns: '16px 1fr auto 76px 22px', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        </div>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center' }}>
          <span className="truncate" style={{ fontWeight: 500, fontSize: 13 }}>{note.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className={`pill pill-${note.kind === 'decision' ? 'accent' : note.kind === 'question' ? 'warn' : 'ghost'}`} style={{ fontSize: 9.5, padding: '1px 6px' }}>{note.kind}</span>
          {statusPill}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', display: 'flex', alignItems: 'center' }}>
          {fmtDate(note.date)}
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
                <span className="pill pill-ghost" style={{ fontSize: 10, padding: '1px 6px' }}>{note.kind}</span>
              </span>
              {statusPill && (
                <>
                  <span className="pq-meta-sep" />
                  <span className="pq-meta-item">{statusPill}</span>
                </>
              )}
              <span className="pq-meta-sep" />
              <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{fmtDate(note.date)}</span>
            </div>
            <button className="btn btn-sm" onClick={() => setEditing(true)}>
              <Icon name="edit" size={11} /> Edit
            </button>
          </div>
          {note.body && (
            <div className="pq-section">
              <div className="pq-section-label">{note.kind === 'decision' ? 'Choice' : 'Body'}</div>
              <div className="pq-section-val">{note.body}</div>
            </div>
          )}
          {note.kind === 'decision' && note.context && (
            <div className="pq-section">
              <div className="pq-section-label">Context</div>
              <div className="pq-section-val">{note.context}</div>
            </div>
          )}
          {note.kind === 'decision' && note.options && (
            <div className="pq-section">
              <div className="pq-section-label">Options considered</div>
              <div className="pq-section-val">{note.options}</div>
            </div>
          )}
          {isQuestion && note.resolved && (
            <div className="pq-section">
              <div className="pq-section-label">Resolution</div>
              <div className="pq-section-val">
                {note.resolution || <em style={{ color: 'var(--fg-4)' }}>No resolution text.</em>}
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
            <span>{fmtDate(note.date)}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {isQuestion && !note.resolved && (
                <button className="btn btn-primary btn-sm" onClick={() => setResolving(true)}>Resolve</button>
              )}
              {isQuestion && note.resolved && (
                <button className="btn btn-sm" onClick={() => actions.updateNote(note.id, { resolved: false, resolution: '' })}>Re-open</button>
              )}
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

function NotesTab({ project, notes, defaultKind }) {
  const [adding, setAdding] = React.useState(false);
  const emptyDraft = { kind: defaultKind || 'note', title: '', body: '', context: '', options: '', reversibility: 'reversible', tags: '' };
  const [draft, setDraft] = React.useState(emptyDraft);

  const kindLabel = defaultKind === 'decision' ? 'decision' : defaultKind === 'question' ? 'question' : 'note';

  return (
    <>
      {adding && (
        <div className="card" style={{ padding: 14, marginBottom: 10 }}>
          <div className="field">
            <span className="field-label">Title</span>
            <input className="input" value={draft.title} autoFocus onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="field">
            <span className="field-label">Body</span>
            <textarea className="textarea" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </div>
          <div className="field">
            <span className="field-label">Tags (comma-separated)</span>
            <input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
          </div>
          <div className="modal-foot">
            <button className="btn" onClick={() => { setDraft(emptyDraft); setAdding(false); }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => {
              if (!draft.title) return;
              actions.addNote({
                projectId: project.id, kind: draft.kind, title: draft.title, body: draft.body,
                context: draft.context, options: draft.options, reversibility: draft.reversibility,
                tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean),
              });
              setDraft(emptyDraft);
              setAdding(false);
            }}>Add</button>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-head">
          <span className="card-head-title">Notes</span>
          <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={11} /> New {kindLabel}</button>
        </div>
        {notes.length === 0 ? (
          <EmptyState title={`No ${kindLabel}s`} body={`Add ${kindLabel}s for this project.`} icon="note" />
        ) : notes.map((n) => <NoteRow key={n.id} note={n} />)}
      </div>
    </>
  );
}


function RisksTab({ project, risks, state }) {
  const [expandedId,      setExpandedId]      = React.useState(null);
  const [modalId,         setModalId]         = React.useState(null);
  const [showModal,       setShowModal]       = React.useState(false);
  const [showFieldsPanel, setShowFieldsPanel] = React.useState(false);
  const [showGuide,       setShowGuide]       = React.useState(false);

  const RR  = window.RiskRow;
  const RM  = window.RiskModal;
  const RGM = window.RiskGuideModal;
  const modalState = state || { projects: [project], risks, tasks: [], notes: [], meetings: [], blockers: [] };

  const allFieldKeys = (window.RISK_FIELDS_ALL || []).map(f => f.key);
  const enabledFields = state?.meta?.riskFields || allFieldKeys;

  const toggleField = (key) => {
    const next = enabledFields.includes(key)
      ? enabledFields.filter((k) => k !== key)
      : [...enabledFields, key];
    actions.setRiskFields(next);
  };

  const openModal  = (id) => { setModalId(id || null); setShowModal(true); };
  const toggleExpand = (id) => setExpandedId((prev) => prev === id ? null : id);

  const open   = risks.filter((r) => r.status !== 'closed' && r.status !== 'cancelled').sort((a, b) => b.severity * b.likelihood - a.severity * a.likelihood);
  const closed = risks.filter((r) => r.status === 'closed');
  const cancelled = risks.filter((r) => r.status === 'cancelled');

  const critCount    = open.filter((r) => r.severity * r.likelihood >= 16).length;
  const highCount    = open.filter((r) => { const s = r.severity * r.likelihood; return s >= 10 && s < 16; }).length;
  const medCount     = open.filter((r) => { const s = r.severity * r.likelihood; return s >= 6 && s < 10; }).length;
  const lowCount     = open.filter((r) => r.severity * r.likelihood < 6).length;
  const monCount     = open.filter((r) => r.status === 'monitoring').length;
  const avgScoreNum  = open.length > 0 ? open.reduce((s, r) => s + r.severity * r.likelihood, 0) / open.length : 0;
  const avgScoreFmt  = open.length > 0 ? avgScoreNum.toFixed(1) : '—';
  const pressureLabel = avgScoreNum >= 16 ? 'critical' : avgScoreNum >= 10 ? 'high pressure' : avgScoreNum >= 6 ? 'moderate pressure' : 'low pressure';
  const peakRisk     = open[0];

  const renderRiskRow = (r) => RR ? (
    <RR key={r.id} risk={r}
      project={project}
      expanded={expandedId === r.id}
      onToggleExpand={() => toggleExpand(r.id)}
      onEdit={() => openModal(r.id)}
      enabledFields={enabledFields} />
  ) : null;

  const monoSm = { fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)' };
  const bigNum = { fontSize: 30, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: 'var(--fg-1)' };

  const riskGradient = 'linear-gradient(to right, oklch(58% 0.15 145), oklch(74% 0.17 80), oklch(67% 0.19 45), oklch(56% 0.21 24))';
  const fillPct = Math.min((avgScoreNum / 25) * 100, 100);

  const buckets = [
    { label: 'Critical', count: critCount, color: 'oklch(56% 0.21 24)'  },
    { label: 'High',     count: highCount, color: 'oklch(67% 0.19 45)'  },
    { label: 'Medium',   count: medCount,  color: 'oklch(74% 0.17 80)'  },
    { label: 'Low',      count: lowCount,  color: 'oklch(58% 0.15 145)' },
    { label: 'Monitor',  count: monCount,  color: 'var(--info)'          },
  ];

  return (
    <>
      {/* Overview — breakdown card + avg score card + heatmap */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'stretch' }}>
        {/* Left column: two stacked cards — 2/3 width */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Risk Breakdown */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <span style={monoSm}>Risk breakdown</span>
              <span style={{ ...monoSm, textTransform: 'none', letterSpacing: 0 }}>{risks.length} total · {open.length} open · {closed.length} closed{cancelled.length > 0 ? ` · ${cancelled.length} cancelled` : ''}</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={bigNum}>{open.length}</span>
              <span style={{ ...monoSm, marginLeft: 8 }}>open risks</span>
            </div>
            {/* Segmented bar */}
            <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', gap: 2, marginBottom: 14 }}>
              {open.length === 0
                ? <div style={{ flex: 1, background: 'var(--line)' }} />
                : buckets.slice(0, 4).map((b) => b.count > 0
                    ? <div key={b.label} style={{ flex: b.count, background: b.color }} />
                    : null)
              }
            </div>
            {/* Bucket counts */}
            <div style={{ display: 'flex' }}>
              {buckets.map((b, i) => (
                <div key={b.label} style={{ flex: 1, paddingLeft: 8, borderLeft: `2px solid ${b.color}`, marginLeft: i > 0 ? 8 : 0 }}>
                  <div style={{ ...monoSm, fontSize: 9, marginBottom: 3 }}>{b.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1, color: b.count > 0 ? b.color : 'var(--fg-4)', fontVariantNumeric: 'tabular-nums' }}>{b.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Avg Score */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <span style={monoSm}>Avg score</span>
              <span style={{ ...monoSm, textTransform: 'none', letterSpacing: 0 }}>across open risks</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={bigNum}>{avgScoreFmt}</span>
              <span style={{ ...monoSm, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>/ 25 — {pressureLabel}</span>
            </div>
            {/* Gauge bar */}
            <div style={{ position: 'relative', height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
              <div style={{ position: 'absolute', inset: 0, background: riskGradient, opacity: 0.2 }} />
              <div style={{ position: 'absolute', inset: 0, background: riskGradient, clipPath: `inset(0 ${100 - fillPct}% 0 0 round 3px)` }} />
            </div>
            <div style={{ position: 'relative', height: 14, marginBottom: 12 }}>
              {[{label: '0 low', value: 0}, {label: '10 med', value: 10}, {label: '16 high', value: 16}, {label: '25 crit', value: 25}].map(({label, value}) => (
                <span key={label} style={{
                  position: 'absolute',
                  left: `${(value / 25) * 100}%`,
                  transform: value === 0 ? 'none' : value === 25 ? 'translateX(-100%)' : 'translateX(-50%)',
                  ...monoSm, fontSize: 9, textTransform: 'none', letterSpacing: 0,
                }}>{label}</span>
              ))}
            </div>
            {peakRisk && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                <span style={{ ...monoSm, textTransform: 'none', letterSpacing: 0 }}>Peak · {peakRisk.title}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--err)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{peakRisk.severity * peakRisk.likelihood}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: heatmap card — 1/3 width */}
        <div className="card" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...monoSm, marginBottom: 10 }}>Severity × Likelihood</div>
          <div className="risk-matrix-compact" style={{ flex: 1 }}>
            <RiskMatrix risks={open} />
          </div>
        </div>
      </div>

      {/* Register — full width */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <span className="card-head-title">Risk register</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="btn btn-sm" onClick={() => setShowGuide(true)}>
              <Icon name="circle" size={11} /> Guide
            </button>
            <div>
              <button
                className={`btn btn-sm${showFieldsPanel ? ' btn-primary' : ''}`}
                onClick={() => setShowFieldsPanel((v) => !v)}
              >
                <Icon name="settings" size={11} /> Fields{enabledFields.length > 0 ? ` · ${enabledFields.length}` : ''}
              </button>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => openModal(null)}>
              <Icon name="plus" size={11} /> New risk
            </button>
          </div>
        </div>
        {open.length === 0 && closed.length === 0 && cancelled.length === 0
          ? <EmptyState title="No risks yet" icon="check" />
          : null}
        {open.length > 0 && open.map(renderRiskRow)}
        {closed.length > 0 && (
          <>
            <div className="tgroup-head">
              <span style={{ color: 'var(--ok)' }}>Closed</span>
              <span className="tgroup-head-count">{closed.length}</span>
            </div>
            {closed.map(renderRiskRow)}
          </>
        )}
        {cancelled.length > 0 && (
          <>
            <div className="tgroup-head">
              <span style={{ color: 'var(--fg-4)' }}>Cancelled</span>
              <span className="tgroup-head-count">{cancelled.length}</span>
            </div>
            {cancelled.map(renderRiskRow)}
          </>
        )}
      </div>

      {showModal && RM && (
        <RM riskId={modalId} state={modalState}
          defaults={{ projectId: project.id }}
          onClose={() => { setShowModal(false); setModalId(null); }} />
      )}
      {showGuide && RGM && <RGM onClose={() => setShowGuide(false)} />}
      {showFieldsPanel && (
        <Modal open title="Risk fields" onClose={() => setShowFieldsPanel(false)}>
          <div style={{ padding: '8px 0' }}>
            <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 12 }}>
              Optional fields — affects all views
            </div>
            {(window.RISK_FIELDS_ALL || []).map((f) => (
              <label key={f.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={enabledFields.includes(f.key)}
                  onChange={() => toggleField(f.key)} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', lineHeight: 1.3 }}>{f.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg-4)', lineHeight: 1.4 }}>{f.hint}</div>
                </div>
              </label>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

function ArtifactRow({ artifact, projects }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: artifact.title, url: artifact.url || '', description: artifact.body || '', artifactType: artifact.artifactType || 'link', tags: (artifact.tags || []).join(', ') });
  React.useEffect(() => { if (!editing) setDraft({ title: artifact.title, url: artifact.url || '', description: artifact.body || '', artifactType: artifact.artifactType || 'link', tags: (artifact.tags || []).join(', ') }); }, [artifact.id, editing]);

  const typeIcon = { link: 'link', confluence: 'ext', file: 'doc' }[draft.artifactType] || 'link';
  const typeLabel = { link: 'Link', confluence: 'Confluence', file: 'File' };

  if (editing) {
    return (
      <div className="note-card note-card-editing">
        <div className="field">
          <span className="field-label">Title</span>
          <input className="input" value={draft.title} autoFocus onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </div>
        {draft.artifactType !== 'confluence' && (
          <div className="field">
            <span className="field-label">URL</span>
            <input className="input" value={draft.url} placeholder="https://…" onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          </div>
        )}
        <div className="field">
          <span className="field-label">Description</span>
          <textarea className="textarea" value={draft.description} rows={2} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">Tags (comma-separated)</span>
          <input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-danger-ghost" onClick={() => { if (confirm('Delete artifact?')) actions.deleteNote(artifact.id); }}>Delete</button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            if (!draft.title) return;
            actions.updateNote(artifact.id, { title: draft.title, url: draft.url, body: draft.description, artifactType: draft.artifactType, tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean) });
            setEditing(false);
          }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="note-card note-card-hoverable" onClick={() => setEditing(true)}>
      <div className="note-head">
        <Pill tone="info"><Icon name={typeIcon} size={9} /> {typeLabel[artifact.artifactType] || 'Link'}</Pill>
        {artifact.url
          ? <a href={artifact.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 500, color: 'var(--fg)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>{artifact.title}</a>
          : <span className="note-title">{artifact.title}</span>}
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginLeft: 'auto' }}>{fmtDate(artifact.date)}</span>
        <Icon name="edit" size={11} className="note-edit-icon" />
      </div>
      {artifact.url && <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artifact.url}</div>}
      {artifact.body && <div className="note-body">{artifact.body}</div>}
      {(artifact.tags || []).length > 0 && <div className="note-tags">{artifact.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>}
    </div>
  );
}

function ArtifactsTab({ project, artifacts, state }) {
  const [adding, setAdding] = React.useState(false);
  const [addType, setAddType] = React.useState('link');
  const [pageSearch, setPageSearch] = React.useState('');
  const emptyDraft = { title: '', url: '', description: '', tags: '' };
  const [draft, setDraft] = React.useState(emptyDraft);

  const confluencePages = state.confluencePages || [];
  const filteredPages = pageSearch
    ? confluencePages.filter((p) => p.title.toLowerCase().includes(pageSearch.toLowerCase()) || (p.tags || []).some((t) => t.includes(pageSearch.toLowerCase())))
    : confluencePages;

  const handleSaveConfluence = (page) => {
    actions.addNote({ projectId: project.id, kind: 'artifact', artifactType: 'confluence', title: page.title, url: '', confluencePageId: page.id, body: draft.description, tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean) });
    setDraft(emptyDraft);
    setPageSearch('');
    setAdding(false);
  };

  const handleSave = () => {
    if (!draft.title) return;
    actions.addNote({ projectId: project.id, kind: 'artifact', artifactType: addType, title: draft.title, url: draft.url, body: draft.description, tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean) });
    setDraft(emptyDraft);
    setAdding(false);
  };

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-head-title">Artifacts</span>
        <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={11} /> Add</button>
      </div>
      {adding && (
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
          <div className="field">
            <span className="field-label">Type</span>
            <div className="seg">
              {[['link', 'Link'], ['confluence', 'Confluence page'], ['file', 'File']].map(([v, l]) => (
                <button key={v} className={`seg-btn ${addType === v ? 'active' : ''}`} onClick={() => { setAddType(v); setDraft(emptyDraft); setPageSearch(''); }}>{l}</button>
              ))}
            </div>
          </div>
          {addType === 'confluence' ? (
            <>
              <div className="field">
                <span className="field-label">Search Confluence pages</span>
                <input className="input" autoFocus placeholder="Filter by title or tag…" value={pageSearch} onChange={(e) => setPageSearch(e.target.value)} />
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6, marginBottom: 8 }}>
                {filteredPages.length === 0 && <div style={{ padding: '12px 14px', color: 'var(--fg-4)', fontSize: 12 }}>No pages found.</div>}
                {filteredPages.map((p) => (
                  <div key={p.id} className="note-card note-card-hoverable" style={{ borderRadius: 0, borderBottom: '1px solid var(--line)' }} onClick={() => handleSaveConfluence(p)}>
                    <div className="note-head">
                      <Icon name="ext" size={11} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                      <span className="note-title">{p.title}</span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{fmtDate(p.updated)}</span>
                    </div>
                    {(p.tags || []).length > 0 && <div className="note-tags">{p.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>}
                  </div>
                ))}
              </div>
              <div className="field">
                <span className="field-label">Description (optional)</span>
                <textarea className="textarea" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="modal-foot">
                <button className="btn" onClick={() => { setAdding(false); setDraft(emptyDraft); setPageSearch(''); }}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <span className="field-label">Title</span>
                <input className="input" autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div className="field">
                <span className="field-label">{addType === 'file' ? 'URL or file path' : 'URL'}</span>
                <input className="input" value={draft.url} placeholder="https://…" onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
              </div>
              <div className="field">
                <span className="field-label">Description (optional)</span>
                <textarea className="textarea" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="field">
                <span className="field-label">Tags (comma-separated)</span>
                <input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
              </div>
              <div className="modal-foot">
                <button className="btn" onClick={() => { setAdding(false); setDraft(emptyDraft); }}>Cancel</button>
                <button className="btn btn-primary" disabled={!draft.title} onClick={handleSave}>Add</button>
              </div>
            </>
          )}
        </div>
      )}
      {artifacts.length === 0 && !adding
        ? <EmptyState title="No artifacts" body="Link documents, specs, or Confluence pages to this project." icon="link" />
        : artifacts.map((a) => <ArtifactRow key={a.id} artifact={a} />)}
    </div>
  );
}

const RECURRENCE_LABELS = { none: 'One-time', weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly' };

function MeetingForm({ draft, setDraft, onSave, onCancel, onDelete, autoFocus, projects }) {
  const toggleProject = (pid) => {
    const ids = draft.projectIds || [];
    setDraft({ ...draft, projectIds: ids.includes(pid) ? ids.filter((x) => x !== pid) : [...ids, pid] });
  };
  return (
    <div style={{ padding: '14px', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
      <div className="row-2" style={{ marginBottom: 8 }}>
        <input className="input" placeholder="Meeting title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus={autoFocus} />
        <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={{ width: 160, flexShrink: 0 }} />
      </div>
      <div className="row-2" style={{ marginBottom: 8 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Attendees</span>
          <input className="input" placeholder="e.g. Alice, Bob, Carol" value={draft.attendees} onChange={(e) => setDraft({ ...draft, attendees: e.target.value })} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Recurrence</span>
          <select className="select" value={draft.recurrence || 'none'} onChange={(e) => setDraft({ ...draft, recurrence: e.target.value })}>
            {Object.entries(RECURRENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      {projects && projects.length > 0 && (
        <div className="field">
          <span className="field-label">Projects</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {projects.map((p) => {
              const on = (draft.projectIds || []).includes(p.id);
              return (
                <button key={p.id} type="button"
                  className={`btn btn-sm${on ? ' btn-primary' : ''}`}
                  onClick={() => toggleProject(p.id)}>
                  {p.code}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="field">
        <span className="field-label">Notes</span>
        <textarea className="textarea" style={{ minHeight: 120 }} placeholder="Key points, decisions, action items…" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onDelete && <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>Delete</button>}
        <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

function MeetingsTab({ project, meetings, state }) {
  const [expandedId, setExpandedId] = React.useState(null);
  const [editModalId, setEditModalId] = React.useState(null);
  const [detailModalId, setDetailModalId] = React.useState(null);
  const [addingModal, setAddingModal] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState({ past: false });

  const MR = window.MeetingRow;
  const MFM = window.MtgFormModal;
  const MDM = window.MtgDetailModal;
  const projects = state ? state.projects : (project ? [project] : []);
  const modalState = state || { meetings, projects, tasks: [], notes: [], blockers: [] };

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const todayIso = new Date().toISOString().slice(0, 10);
  const sorted = [...meetings].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((m) => m.date >= todayIso);
  const past = [...sorted.filter((m) => m.date < todayIso)].reverse();

  const renderRow = (m) => MR ? (
    <MR key={m.id} meeting={m} projects={projects} state={modalState}
      expanded={expandedId === m.id}
      onToggleExpand={() => setExpandedId(expandedId === m.id ? null : m.id)}
      onEdit={() => setEditModalId(m.id)}
      onOpen={() => setDetailModalId(m.id)}
      onOpenTask={(id) => window.actions && window.actions.openTask(id)} />
  ) : null;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button className="btn btn-sm btn-primary" onClick={() => setAddingModal(true)}><Icon name="plus" size={11} /> New meeting</button>
      </div>
      {meetings.length === 0
        ? <div className="card"><EmptyState title="No meetings yet" body="Log meeting notes, attendees, and action items here." icon="clock" /></div>
        : (
          <div className="card">
            {upcoming.length > 0 && (
              <div>
                <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection('upcoming')}>
                  <Icon name={collapsed['upcoming'] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--mtg, var(--info))' }}>Upcoming</span>
                  <span className="tgroup-head-count">{upcoming.length}</span>
                </div>
                {!collapsed['upcoming'] && upcoming.map(renderRow)}
              </div>
            )}
            {past.length > 0 && (
              <div>
                <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection('past')}>
                  <Icon name={collapsed['past'] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--fg-3)' }}>Past</span>
                  <span className="tgroup-head-count">{past.length}</span>
                </div>
                {!collapsed['past'] && past.map(renderRow)}
              </div>
            )}
          </div>
        )
      }
      {addingModal && MFM && (
        <MFM meetingId={null} state={modalState}
          defaults={{ projectIds: project ? [project.id] : [] }}
          onClose={() => setAddingModal(false)} />
      )}
      {editModalId && MFM && (
        <MFM meetingId={editModalId} state={modalState}
          onClose={() => setEditModalId(null)} />
      )}
      {detailModalId && MDM && (
        <MDM meetingId={detailModalId} state={modalState}
          onOpenProject={null}
          onOpenTask={(id) => window.actions && window.actions.openTask(id)}
          onClose={() => setDetailModalId(null)} />
      )}
    </>
  );
}

function ProjectTasksTab({ project, tasks, state, onOpenTask }) {
  const [collapsed, setCollapsed] = React.useState({});
  const [expandedId, setExpandedId] = React.useState(null);
  const [addingTask, setAddingTask] = React.useState(false);
  const [readOnlyTaskId, setReadOnlyTaskId] = React.useState(null);
  const [dragOverId, setDragOverId] = React.useState(null);
  const dragSrcId = React.useRef(null);

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const orderFromMeta = state.meta.tasksViewOrder || [];
  const sortByOrder = (arr) =>
    [...arr].sort((a, b) => {
      const ai = orderFromMeta.indexOf(a.id);
      const bi = orderFromMeta.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const reorderInSection = (sectionTasks, dropTargetId) => {
    const srcId = dragSrcId.current;
    if (!srcId || srcId === dropTargetId) return;
    const ids = sectionTasks.map((t) => t.id);
    const from = ids.indexOf(srcId);
    const to = ids.indexOf(dropTargetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, srcId);
    const otherIds = (state.meta.tasksViewOrder || []).filter((id) => !ids.includes(id));
    actions.setMeta({ tasksViewOrder: [...ids, ...otherIds] });
  };

  const makeDragProps = (t, sectionTasks) => ({
    onDragStart: (e) => { dragSrcId.current = t.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); },
    onDragOver: (e) => { e.preventDefault(); setDragOverId(t.id); },
    onDrop: (e) => { e.preventDefault(); reorderInSection(sectionTasks, t.id); setDragOverId(null); },
    onDragEnd: () => { dragSrcId.current = null; setDragOverId(null); },
  });

  const sections = ['critical', 'high', 'medium', 'low'].map((p) => ({
    key: p,
    label: p.charAt(0).toUpperCase() + p.slice(1),
    labelColor: { critical: 'var(--danger)', high: 'var(--warn)', medium: 'var(--fg-2)', low: 'var(--fg-4)' }[p],
    tasks: sortByOrder(
      tasks.filter((t) => t.priority === p && t.status !== 'done' && t.status !== 'cancelled')
        .sort((a, b) => (a.dueDate ? daysFromToday(a.dueDate) : 999) - (b.dueDate ? daysFromToday(b.dueDate) : 999))
    ),
  })).filter((s) => s.tasks.length > 0);

  const doneTasks = sortByOrder(tasks.filter((t) => t.status === 'done'));
  if (doneTasks.length > 0) sections.push({ key: 'done', label: 'Done', labelColor: 'var(--ok)', tasks: doneTasks, defaultCollapsed: true });
  const cancelledTasks = sortByOrder(tasks.filter((t) => t.status === 'cancelled'));
  if (cancelledTasks.length > 0) sections.push({ key: 'cancelled', label: 'Cancelled', labelColor: 'var(--fg-4)', tasks: cancelledTasks, defaultCollapsed: true });

  React.useEffect(() => {
    const init = {};
    sections.forEach((s) => { if (s.defaultCollapsed && collapsed[s.key] === undefined) init[s.key] = true; });
    if (Object.keys(init).length) setCollapsed((prev) => ({ ...prev, ...init }));
  }, []);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button className="btn btn-sm btn-primary" onClick={() => setAddingTask(true)}><Icon name="plus" size={11} /> New task</button>
      </div>
      {addingTask && <TaskModal taskId={null} state={state} defaults={{ projectId: project.id }} onClose={() => setAddingTask(false)} />}
      {tasks.length === 0 && !addingTask ? (
        <div className="card"><EmptyState title="No tasks yet" body="Add the first task to start executing." icon="plus" /></div>
      ) : (
        <div className="card">
          {sections.map((section) => (
            <div key={section.key}>
              <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection(section.key)}>
                <Icon name={collapsed[section.key] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                <span style={{ color: section.labelColor }}>{section.label}</span>
                <span className="tgroup-head-count">{section.tasks.length}</span>
              </div>
              {!collapsed[section.key] && section.tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  project={project}
                  onOpen={(id) => onOpenTask(id)}
                  onToggle={actions.toggleTaskDone}
                  expanded={expandedId === t.id}
                  onToggleExpand={() => toggleExpand(t.id)}
                  onJumpTo={(id) => setReadOnlyTaskId(id)}
                  dragProps={makeDragProps(t, section.tasks)}
                  dropState={dragOverId === t.id ? 'drop-before' : dragSrcId.current === t.id ? 'dragging' : ''}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {readOnlyTaskId && (
        <TaskReadOnlyModal taskId={readOnlyTaskId} state={state}
          onClose={() => setReadOnlyTaskId(null)}
          onEdit={(id) => { setReadOnlyTaskId(null); onOpenTask(id); }}
          onJumpTo={(id) => setReadOnlyTaskId(id)} />
      )}
    </>
  );
}

function ProjectDecisionsTab({ project, decisions, state }) {
  const DR = window.DecisionRow;
  const DM = window.DecisionModal;
  const [collapsed, setCollapsed] = React.useState({ cancelled: true });
  const [expandedId, setExpandedId] = React.useState(null);
  const [modalId, setModalId] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const todayIso = new Date().toISOString().slice(0, 10);
  const getQuarter = (dateStr) => {
    const d = new Date((dateStr || todayIso) + 'T00:00:00');
    return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
  };

  const sorted = [...decisions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const pinned = sorted.filter((n) => n.pinned && !n.cancelled);
  const byQ = {};
  sorted.filter((n) => !n.pinned && !n.cancelled).forEach((n) => {
    const q = getQuarter(n.date || todayIso);
    (byQ[q] = byQ[q] || []).push(n);
  });
  const sections = [];
  if (pinned.length > 0) sections.push({ key: 'pinned', label: 'Pinned', labelColor: 'var(--warn)', items: pinned });
  Object.keys(byQ).sort((a, b) => b.localeCompare(a)).forEach((q) => {
    sections.push({ key: q, label: q, labelColor: 'var(--fg-3)', items: byQ[q] });
  });
  const cancelled = sorted.filter((n) => n.cancelled);
  if (cancelled.length > 0) sections.push({ key: 'cancelled', label: 'Cancelled', labelColor: 'var(--fg-4)', items: cancelled });

  const openModal = (id) => { setModalId(id || null); setShowModal(true); };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button className="btn btn-sm btn-primary" onClick={() => openModal(null)}><Icon name="plus" size={11} /> Log decision</button>
      </div>
      {sections.length === 0 ? (
        <div className="card"><EmptyState title="No decisions" body="Log decisions for this project." icon="note" /></div>
      ) : DR && (
        <div className="card">
          {sections.map((section) => (
            <div key={section.key}>
              <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection(section.key)}>
                <Icon name={collapsed[section.key] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                <span style={{ color: section.labelColor }}>{section.label}</span>
                <span className="tgroup-head-count">{section.items.length}</span>
              </div>
              {!collapsed[section.key] && section.items.map((n) => (
                <DR
                  key={n.id}
                  note={n}
                  project={project}
                  expanded={expandedId === n.id}
                  onToggleExpand={() => toggleExpand(n.id)}
                  onEdit={() => openModal(n.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {showModal && DM && (
        <DM noteId={modalId} state={state}
          defaults={{ projectId: project.id }}
          onClose={() => { setShowModal(false); setModalId(null); }} />
      )}
    </>
  );
}

function ProjectQuestionsTab({ project, questions, state }) {
  const QR = window.QuestionRow;
  const QM = window.QuestionModal;
  const RQM = window.ResolveQuestionModal;
  const [collapsed, setCollapsed] = React.useState({ resolved: true, cancelled: true });
  const [expandedId, setExpandedId] = React.useState(null);
  const [modalId, setModalId] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);
  const [resolveId, setResolveId] = React.useState(null);

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const sorted = [...questions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const open = sorted.filter((n) => !n.resolved && !n.cancelled);
  const resolved = sorted.filter((n) => n.resolved && !n.cancelled);
  const cancelled = sorted.filter((n) => n.cancelled);

  const openModal = (id) => { setModalId(id || null); setShowModal(true); };

  const sectionDefs = [
    open.length > 0 && { key: 'open', label: 'Open', labelColor: 'var(--warn)', items: open },
    resolved.length > 0 && { key: 'resolved', label: 'Resolved', labelColor: 'var(--ok)', items: resolved },
    cancelled.length > 0 && { key: 'cancelled', label: 'Cancelled', labelColor: 'var(--fg-4)', items: cancelled },
  ].filter(Boolean);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button className="btn btn-sm btn-primary" onClick={() => openModal(null)}><Icon name="plus" size={11} /> New question</button>
      </div>
      {sectionDefs.length === 0 ? (
        <div className="card"><EmptyState title="No questions" body="Log questions for this project." icon="search" /></div>
      ) : QR && (
        <div className="card">
          {sectionDefs.map((section) => (
            <div key={section.key}>
              <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection(section.key)}>
                <Icon name={collapsed[section.key] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                <span style={{ color: section.labelColor }}>{section.label}</span>
                <span className="tgroup-head-count">{section.items.length}</span>
              </div>
              {!collapsed[section.key] && section.items.map((n) => (
                <QR
                  key={n.id}
                  note={n}
                  projects={[project]}
                  expanded={expandedId === n.id}
                  onToggleExpand={() => toggleExpand(n.id)}
                  onEdit={() => openModal(n.id)}
                  onResolve={() => setResolveId(n.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {showModal && QM && (
        <QM noteId={modalId} state={state}
          defaults={{ projectId: project.id }}
          onClose={() => { setShowModal(false); setModalId(null); }} />
      )}
      {resolveId && RQM && (
        <RQM noteId={resolveId} state={state} onClose={() => setResolveId(null)} />
      )}
    </>
  );
}

Object.assign(window, { ProjectView, MeetingForm, MeetingsTab, RECURRENCE_LABELS });
