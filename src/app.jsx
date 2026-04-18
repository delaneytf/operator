// App shell — sidebar, topbar, view router, tweaks panel.

function App() {
  const state = useStore();
  const [taskModalId, setTaskModalId] = React.useState(null);
  const [showQuickTask, setShowQuickTask] = React.useState(false);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [topSearchQ, setTopSearchQ] = React.useState('');
  const [sbDoneOpen, setSbDoneOpen] = React.useState(false);

  // Apply theme + density to <body>
  React.useEffect(() => {
    document.body.className = `theme-${state.meta.theme} density-${state.meta.density}`;
    const hues = { amber: 38, rose: 20, sky: 230, violet: 300, emerald: 155 };
    document.documentElement.style.setProperty('--accent-h', hues[state.meta.accent] || 38);
  }, [state.meta.theme, state.meta.density, state.meta.accent]);

  // Edit mode protocol
  React.useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Helper for sub-components to call navigation actions via window.actions
  React.useEffect(() => {
    window.actions.setActiveView = (view, opts = {}) => {
      actions.setMeta({ activeView: view, ...(opts.pageId ? { _openPageId: opts.pageId } : {}) });
    };
    window.actions.setActiveProject = (id) => {
      actions.setMeta({ activeView: 'project', activeProjectId: id });
    };
    window.actions.openTask = (id) => setTaskModalId(id);
  }, []);

  const setView = (view, projectId) => {
    const patch = { activeView: view };
    if (projectId) patch.activeProjectId = projectId;
    actions.setMeta(patch);
  };

  const activeProject = state.projects.find((p) => p.id === state.meta.activeProjectId);

  // Action-needed sidebar counts only
  const todayActionCount = todayTasks(state).filter((t) => t._due !== null && t._due <= 0).length; // overdue+today
  const critRiskCount = state.risks.filter((r) => r.status !== 'closed' && r.severity * r.likelihood >= 12).length;
  const staleCount = staleProjects(state, 10).length;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sb-brand">
          <div className="sb-brand-mark">◎</div>
          <div style={{ fontFamily: 'Helvetica' }}>
            <div className="sb-brand-name" style={{ fontFamily: 'Helvetica' }}>Operator</div>
            <div className="sb-brand-sub">solo · v4</div>
          </div>
        </div>

        <button className={`sb-item ${state.meta.activeView === 'today' ? 'active' : ''}`} onClick={() => setView('today')}>
          <span className="sb-item-icon"><Icon name="sun" /></span>
          <span className="sb-item-label">Today</span>
          {todayActionCount > 0 && <span className="sb-item-hint sb-item-hint-action">{todayActionCount}</span>}
        </button>
        <button className={`sb-item ${state.meta.activeView === 'portfolio' ? 'active' : ''}`} onClick={() => setView('portfolio')}>
          <span className="sb-item-icon"><Icon name="grid" /></span>
          <span className="sb-item-label">Portfolio</span>
          {staleCount > 0 && <span className="sb-item-hint sb-item-hint-action">{staleCount}</span>}
        </button>
        <button className={`sb-item ${state.meta.activeView === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>
          <span className="sb-item-icon"><Icon name="calendar" /></span>
          <span className="sb-item-label">Calendar</span>
        </button>
        <button className={`sb-item ${state.meta.activeView === 'meetings' ? 'active' : ''}`} onClick={() => setView('meetings')}>
          <span className="sb-item-icon"><Icon name="clock" /></span>
          <span className="sb-item-label">Meetings</span>
          {(state.meetings || []).length > 0 && <span className="sb-item-hint">{(state.meetings || []).length}</span>}
        </button>
        <button className={`sb-item ${state.meta.activeView === 'tasks' ? 'active' : ''}`} onClick={() => setView('tasks')}>
          <span className="sb-item-icon"><Icon name="check" /></span>
          <span className="sb-item-label">Tasks</span>
          {(() => { const c = (state.tasks || []).filter((t) => t.status !== 'done').length; return c > 0 ? <span className="sb-item-hint">{c}</span> : null; })()}
        </button>
        <button className={`sb-item ${state.meta.activeView === 'decisions' ? 'active' : ''}`} onClick={() => setView('decisions')}>
          <span className="sb-item-icon"><Icon name="note" /></span>
          <span className="sb-item-label">Decisions</span>
        </button>
        <button className={`sb-item ${state.meta.activeView === 'questions' ? 'active' : ''}`} onClick={() => setView('questions')}>
          <span className="sb-item-icon"><Icon name="search" /></span>
          <span className="sb-item-label">Questions</span>
          {(() => { const c = (state.notes || []).filter((n) => n.kind === 'question' && !n.resolved).length; return c > 0 ? <span className="sb-item-hint">{c}</span> : null; })()}
        </button>
        <button className={`sb-item ${state.meta.activeView === 'risks' ? 'active' : ''}`} onClick={() => setView('risks')}>
          <span className="sb-item-icon"><Icon name="warn" /></span>
          <span className="sb-item-label">Risks</span>
          {(() => { const c = (state.risks || []).filter((r) => r.status !== 'closed').length; return c > 0 ? <span className="sb-item-hint">{c}</span> : null; })()}
        </button>
        <button className={`sb-item ${state.meta.activeView === 'review' ? 'active' : ''}`} onClick={() => setView('review')}>
          <span className="sb-item-icon"><Icon name="bolt" /></span>
          <span className="sb-item-label">Weekly review</span>
        </button>

        <div className="sb-section" style={{ marginTop: 10 }}>
          <span>Integrations</span>
        </div>
        <button className={`sb-item ${state.meta.activeView === 'assistant' ? 'active' : ''}`} onClick={() => setView('assistant')}>
          <span className="sb-item-icon"><Icon name="target" /></span>
          <span className="sb-item-label">Assistant</span>
        </button>
        <button className={`sb-item ${state.meta.activeView === 'jira' ? 'active' : ''}`} onClick={() => setView('jira')}>
          <span className="sb-item-icon"><Icon name="grid" /></span>
          <span className="sb-item-label">Jira</span>
        </button>
        <button className={`sb-item ${state.meta.activeView === 'confluence' ? 'active' : ''}`} onClick={() => setView('confluence')}>
          <span className="sb-item-icon"><Icon name="doc" /></span>
          <span className="sb-item-label">Confluence</span>
        </button>

        <div className="sb-section">
          <span>Projects</span>
          <span className="sb-section-count">{state.projects.filter((p) => p.status !== 'done').length}</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {(() => {
            const byPrio = (arr) => arr.slice().sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
            const activeProjs = byPrio(state.projects.filter((p) => p.status !== 'done'));
            const doneProjs = byPrio(state.projects.filter((p) => p.status === 'done'));
            const renderProj = (p) => {
              const prog = projectProgress(state, p.id);
              const risk = projectRiskScore(state, p.id);
              const active = state.meta.activeView === 'project' && state.meta.activeProjectId === p.id;
              return (
                <button key={p.id} className={`sb-proj ${active ? 'active' : ''} ${p.status === 'done' ? 'sb-proj-done' : ''}`} onClick={() => setView('project', p.id)}>
                  <span className={`sb-proj-dot pc-${p.status}`} />
                  <span className="sb-proj-code">{p.code}</span>
                  <span className="sb-proj-name truncate">{p.name.split('—')[1]?.trim() || p.name}</span>
                  <span className="sb-proj-meta">{prog.pct}%</span>
                  {risk.peak >= 12 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)' }} />}
                </button>
              );
            };
            return (
              <>
                {activeProjs.map(renderProj)}
                <button className="sb-proj" style={{ color: 'var(--fg-4)' }} onClick={() => {
                  const name = prompt('Project name?');
                  if (!name) return;
                  const code = prompt('Short code (e.g. ATLAS)?', name.slice(0, 5).toUpperCase()) || name.slice(0, 5).toUpperCase();
                  const proj = actions.addProject({ name, code, objective: '', color: 'slate', priority: 'medium', startDate: new Date().toISOString().slice(0, 10), dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), successCriteria: [] });
                  setView('project', proj.id);
                }}>
                  <span className="sb-proj-dot" style={{ background: 'var(--line-2)' }} />
                  <span className="sb-proj-code">NEW</span>
                  <span className="sb-proj-name">New project</span>
                </button>
                {doneProjs.length > 0 && (
                  <>
                    <button className="sb-proj sb-proj-done-toggle" onClick={() => setSbDoneOpen((x) => !x)}>
                      <Icon name={sbDoneOpen ? 'chevronD' : 'chevronR'} size={9} />
                      <span className="sb-proj-name" style={{ color: 'var(--fg-4)', fontSize: 10.5 }}>Done ({doneProjs.length})</span>
                    </button>
                    {sbDoneOpen && doneProjs.map(renderProj)}
                  </>
                )}
              </>
            );
          })()}
        </div>

        <div className="sb-foot">
          <button className="icon-btn" title="Toggle theme" onClick={() => actions.setMeta({ theme: state.meta.theme === 'dark' ? 'light' : 'dark' })}>
            <Icon name={state.meta.theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <button className="icon-btn" title="Tweaks" onClick={() => setTweaksOpen((x) => !x)}>
            <Icon name="settings" />
          </button>
          {critRiskCount > 0 && (
            <span className="pill pill-danger" style={{ marginLeft: 'auto' }}>
              <Icon name="warn" size={10} /> {critRiskCount} crit
            </span>
          )}
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <div className="crumbs">
              {state.meta.activeView === 'today' && <strong>Today <span style={{ fontWeight: 400, color: 'var(--fg-4)' }}>· {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span></strong>}
              {state.meta.activeView === 'portfolio' && <strong>Portfolio</strong>}
              {state.meta.activeView === 'calendar' && <strong>Calendar</strong>}
              {state.meta.activeView === 'tasks' && <strong>Tasks</strong>}
              {state.meta.activeView === 'decisions' && <strong>Decisions</strong>}
              {state.meta.activeView === 'questions' && <strong>Questions</strong>}
              {state.meta.activeView === 'risks' && <strong>Risks</strong>}
              {state.meta.activeView === 'meetings' && <strong>Meetings</strong>}
              {state.meta.activeView === 'search' && <strong>Search</strong>}
              {state.meta.activeView === 'review' && <strong>Weekly review</strong>}
              {state.meta.activeView === 'assistant' && <strong>Assistant</strong>}
              {state.meta.activeView === 'jira' && <strong>Jira</strong>}
              {state.meta.activeView === 'confluence' && <strong>Confluence</strong>}
              {state.meta.activeView === 'project' && activeProject && (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => setView('portfolio')}>Portfolio</button>
                  <Icon name="chevronR" size={10} />
                  <strong>{activeProject.name}</strong>
                </>
              )}
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-search">
              <Icon name="search" size={12} />
              <input
                className="topbar-search-input"
                placeholder="Search everywhere…"
                value={topSearchQ}
                onChange={(e) => setTopSearchQ(e.target.value)}
                onFocus={() => { if (topSearchQ) setView('search'); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && topSearchQ.trim()) setView('search');
                  if (e.key === 'Escape') { setTopSearchQ(''); }
                }}
              />
            </div>
            <button className="btn btn-sm" onClick={() => setShowQuickTask(true)}>
              <Icon name="plus" size={11} /> Quick task
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => setView('review')}>
              <Icon name="bolt" size={11} /> Weekly review
            </button>
          </div>
        </div>

        <div className="content" style={{ fontFamily: "Helvetica" }}>
          {state.meta.activeView === 'today' && <Today state={state} onOpenTask={setTaskModalId} onOpenProject={(id) => setView('project', id)} />}
          {state.meta.activeView === 'portfolio' && <Portfolio state={state} onOpenProject={(id) => setView('project', id)} onOpenTask={setTaskModalId} />}
          {state.meta.activeView === 'calendar' && <CalendarView state={state} onOpenMeeting={(id) => actions.setMeta({ activeView: 'meetings', activeMeetingId: id })} />}
          {state.meta.activeView === 'tasks' && <TasksView state={state} onOpenTask={setTaskModalId} />}
          {state.meta.activeView === 'decisions' && <DecisionsView state={state} />}
          {state.meta.activeView === 'questions' && <QuestionsView state={state} />}
          {state.meta.activeView === 'risks' && <RisksView state={state} />}
          {state.meta.activeView === 'meetings' && <MeetingsView state={state} onOpenProject={(id) => setView('project', id)} onOpenTask={setTaskModalId} />}
          {state.meta.activeView === 'search' && <SearchView state={state} initialQ={topSearchQ} />}
          {state.meta.activeView === 'review' && <ReviewView state={state} />}
          {state.meta.activeView === 'assistant' && <Assistant state={state} />}
          {state.meta.activeView === 'jira' && <JiraView state={state} onOpenProject={(id) => setView('project', id)} />}
          {state.meta.activeView === 'confluence' && <ConfluenceView state={state} />}
          {state.meta.activeView === 'project' && activeProject && (
            <ProjectView state={state} projectId={activeProject.id} onOpenTask={setTaskModalId} onBack={() => setView('portfolio')} />
          )}
        </div>
      </main>

      {taskModalId && <TaskModal taskId={taskModalId} state={state} onClose={() => setTaskModalId(null)} />}
      {showQuickTask && <QuickTaskModal state={state} onClose={() => setShowQuickTask(false)} onCreated={(id) => { setShowQuickTask(false); setTaskModalId(id); }} />}
      {tweaksOpen && <TweaksPanel state={state} onClose={() => setTweaksOpen(false)} />}
    </div>
  );
}

function QuickTaskModal({ state, onClose, onCreated }) {
  const activeProjects = state.projects.filter((p) => p.status !== 'done');
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState('high');
  const [pid, setPid] = React.useState(activeProjects[0]?.id || '');
  const [due, setDue] = React.useState('');

  const submit = () => {
    if (!title.trim() || !pid) return;
    const t = actions.addTask({ title: title.trim(), priority, projectId: pid, dueDate: due || null });
    onCreated(t.id);
  };

  return (
    <Modal open={true} onClose={onClose} title="New task">
      <div className="field">
        <span className="field-label">Title</span>
        <input className="input" placeholder="Task title…" value={title} autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); }} />
      </div>
      <div className="row-2">
        <div className="field">
          <span className="field-label">Project</span>
          <select className="select" value={pid} onChange={(e) => setPid(e.target.value)}>
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name.split('—')[1]?.trim() || p.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="field-label">Priority</span>
          <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="field">
          <span className="field-label">Due date</span>
          <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={!title.trim() || !pid}>Add task</button>
      </div>
    </Modal>
  );
}

function TweaksPanel({ state, onClose }) {
  return (
    <div className="tweaks">
      <div className="tweaks-head">
        <div>
          <div className="tweaks-title">Tweaks</div>
          <div className="tweaks-sub">persistent · localStorage</div>
        </div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
      </div>
      <div className="tweaks-body">
        <div className="tweak-row">
          <span className="tweak-row-label">Theme</span>
          <div className="seg">
            {['dark', 'light'].map((t) =>
              <button key={t} className={`seg-btn ${state.meta.theme === t ? 'active' : ''}`} onClick={() => actions.setMeta({ theme: t })}>{t}</button>
            )}
          </div>
        </div>
        <div className="tweak-row">
          <span className="tweak-row-label">Density</span>
          <div className="seg">
            {['compact', 'comfortable'].map((d) =>
              <button key={d} className={`seg-btn ${state.meta.density === d ? 'active' : ''}`} onClick={() => actions.setMeta({ density: d })}>{d}</button>
            )}
          </div>
        </div>
        <div className="tweak-row">
          <span className="tweak-row-label">Accent</span>
          <div className="hues">
            {['amber', 'rose', 'sky', 'violet', 'emerald'].map((h) =>
              <button
                key={h}
                className={`hue pc-${h} ${state.meta.accent === h ? 'active' : ''}`}
                onClick={() => actions.setMeta({ accent: h })}
                aria-label={h}
              />
            )}
          </div>
        </div>
        <div className="tweak-row">
          <span className="tweak-row-label">Landing view</span>
          <div className="seg">
            {[['today', 'Today'], ['portfolio', 'Portfolio'], ['calendar', 'Calendar']].map(([v, l]) =>
              <button key={v} className={`seg-btn ${state.meta.activeView === v ? 'active' : ''}`} onClick={() => actions.setMeta({ activeView: v })}>{l}</button>
            )}
          </div>
        </div>
        <div className="hr" />
        <button className="btn btn-danger btn-sm" onClick={() => {
          if (confirm('Reset all data to seed? Cannot be undone.')) actions.resetAll();
        }}>
          <Icon name="trash" size={11} /> Reset to seed
        </button>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 2 }}>
          Data lives in localStorage["{window.STORAGE_KEY}"]
        </div>
      </div>
    </div>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
