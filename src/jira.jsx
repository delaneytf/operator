// Jira integration — sprint board + backlog + list views.

// ── Project filter dropdown ──────────────────────────────────────────────────

function JiraProjectFilter({ jiraProjects, allIssues, selectedKeys, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isAll = selectedKeys.size === 0;
  const toggle = (key) => { const next = new Set(selectedKeys); if (next.has(key)) next.delete(key); else next.add(key); onChange(next); };
  const projectsWithIssues = jiraProjects.filter(p => allIssues.some(i => i.projectKey === p.key));
  const filterLabel = isAll ? 'All projects' : (() => { const p = [...selectedKeys]; return p.length <= 2 ? p.join(', ') : `${p.slice(0, 2).join(', ')} +${p.length - 2}`; })();
  const Chk = ({ on }) => <span style={{ width: 14, height: 14, borderRadius: 3, border: '1.5px solid var(--line)', background: on ? 'var(--accent)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on && <Icon name="check" size={9} style={{ color: '#fff' }} />}</span>;

  return (
    <div style={{ position: 'relative', flexShrink: 0 }} ref={ref}>
      <button className={`btn btn-sm${!isAll ? ' btn-primary' : ''}`} style={{ fontSize: 11, gap: 5 }} onClick={() => setOpen(v => !v)}>
        <Icon name="filter" size={10} /> {filterLabel} <Icon name={open ? 'chevronD' : 'chevronR'} size={9} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200, background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', minWidth: 260, maxHeight: 380, overflowY: 'auto', padding: '6px 0' }}>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', padding: '5px 12px', borderRadius: 0, fontSize: 11, gap: 7 }} onClick={() => { onChange(new Set()); setOpen(false); }}><Chk on={isAll} /> All projects</button>
          <div style={{ padding: '4px 12px 2px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginTop: 2 }}>Jira projects</div>
          {projectsWithIssues.map(p => {
            const count = allIssues.filter(i => i.projectKey === p.key).length;
            return (
              <button key={p.key} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', padding: '5px 12px', borderRadius: 0, fontSize: 11, gap: 7 }} onClick={() => toggle(p.key)}>
                <Chk on={selectedKeys.has(p.key)} />
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0, minWidth: 40 }}>{p.key}</span>
                <span className="truncate" style={{ fontSize: 11 }}>{p.name}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', marginLeft: 'auto', flexShrink: 0 }}>{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Jira view ───────────────────────────────────────────────────────────

const BOARD_COLUMNS = ['To Do', 'In Progress', 'In Review', 'Ready for QA', 'In QA', 'Done'];

function JiraView({ state, onOpenProject }) {
  const jiraProjects = state.jiraProjects || [];
  const allSprints = state.sprints || [];
  const allIssues = state.jiraIssues || [];
  const boardColumns = state.jiraBoardColumns || [];
  const savedScopes = state.meta.integrations?.jira?.selectedScopes || [];
  const [selectedProjectKeys, setSelectedProjectKeys] = React.useState(() => new Set(savedScopes));
  const [viewMode, setViewMode] = React.useState('board');
  const [openIssue, setOpenIssue] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [syncing, setSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState(null);
  const [activeSprintId, setActiveSprintId] = React.useState(null);
  const [collapsedSprints, setCollapsedSprints] = React.useState(new Set());

  const updateProjectFilter = (nextKeys) => {
    setSelectedProjectKeys(nextKeys);
    actions.setMeta({ integrations: { ...state.meta.integrations, jira: { ...state.meta.integrations?.jira, selectedScopes: [...nextKeys] } } });
  };

  const syncJira = async () => {
    setSyncing(true); setSyncError(null);
    try {
      const projectKeys = [...selectedProjectKeys];
      const res = await fetch('/api/jira/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectKeys.length ? { projectKeys } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      actions.setJiraData(data);
      actions.setMeta({ integrations: { ...state.meta.integrations, jira: { ...state.meta.integrations?.jira, syncedAt: new Date().toISOString().slice(0, 10) } } });
    } catch (e) {
      setSyncError(e.message);
    } finally { setSyncing(false); }
  };

  // Filtered issues
  const isAllProjects = selectedProjectKeys.size === 0;
  const issues = allIssues.filter(i =>
    (isAllProjects || selectedProjectKeys.has(i.projectKey)) &&
    (!search || i.summary.toLowerCase().includes(search.toLowerCase()) || i.key.toLowerCase().includes(search.toLowerCase()))
  );

  // Sprint navigation — chronological, show prev/current/next in dropdown
  const chronoSprints = [...allSprints].sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  const activeSprint = chronoSprints.find(s => s.state === 'active');
  React.useEffect(() => {
    if (!activeSprintId && activeSprint) setActiveSprintId(activeSprint.id);
  }, [activeSprint?.id]);

  const currentSprint = allSprints.find(s => s.id === activeSprintId);
  const currentIdx = chronoSprints.findIndex(s => s.id === activeSprintId);
  const prevSprint = currentIdx > 0 ? chronoSprints[currentIdx - 1] : null;
  const nextSprint = currentIdx >= 0 && currentIdx < chronoSprints.length - 1 ? chronoSprints[currentIdx + 1] : null;

  // Dropdown options: prev + current + next (deduped, only existing)
  const sprintDropdownOptions = [prevSprint, currentSprint, nextSprint].filter(Boolean);
  // Dedupe by ID
  const seenIds = new Set();
  const uniqueSprintOptions = sprintDropdownOptions.filter(s => { if (seenIds.has(s.id)) return false; seenIds.add(s.id); return true; });

  // Issues for current sprint board view
  const sprintIssues = currentSprint ? issues.filter(i => i.sprintId === currentSprint.id) : [];

  // Build column→status mapping from board config
  const statusToColumn = {};
  if (boardColumns.length) {
    boardColumns.forEach(col => {
      (col.statuses || []).forEach(st => { statusToColumn[st] = col.name; });
    });
  }

  // Map issues to fixed board columns
  const mapToColumn = (status) => {
    // First check board config mapping
    const mapped = statusToColumn[status];
    if (mapped && BOARD_COLUMNS.includes(mapped)) return mapped;
    // Fallback heuristics
    if (/done|closed|released|ready for release|resolved/i.test(status)) return 'Done';
    if (/qa|testing|regression/i.test(status)) return BOARD_COLUMNS.includes('In QA') ? 'In QA' : 'Ready for QA';
    if (/review/i.test(status)) return 'In Review';
    if (/progress|development|dev|in dev/i.test(status)) return 'In Progress';
    return 'To Do';
  };

  // Sprint stats
  const totalPts = sprintIssues.reduce((a, b) => a + (b.storyPoints || 0), 0);
  const donePts = sprintIssues.filter(i => mapToColumn(i.status) === 'Done').reduce((a, b) => a + (b.storyPoints || 0), 0);
  const sprintDays = currentSprint ? daysBetween(currentSprint.start, currentSprint.end) : 14;
  const sprintElapsed = currentSprint ? Math.max(0, Math.min(sprintDays, daysBetween(currentSprint.start, new Date().toISOString().slice(0, 10)))) : 0;
  const timePct = sprintDays > 0 ? Math.round((sprintElapsed / sprintDays) * 100) : 0;
  const ptsPct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;

  // Backlog groups
  const backlogGroups = (() => {
    const groups = [];
    // Show active sprint first, then future sprints, then backlog
    const activeAndFuture = chronoSprints.filter(s => s.state === 'active' || s.state === 'future');
    activeAndFuture.forEach(sp => {
      const spIssues = issues.filter(i => i.sprintId === sp.id);
      groups.push({ sprint: sp, issues: spIssues });
    });
    const backlogIssues = issues.filter(i => !i.sprintId);
    if (backlogIssues.length) {
      groups.push({ sprint: null, issues: backlogIssues });
    }
    return groups;
  })();

  const toggleCollapse = (key) => {
    setCollapsedSprints(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };

  // Empty state
  if (!jiraProjects.length) {
    return (
      <div className="content-narrow">
        <EmptyState title="Jira not connected" body="Add your credentials to .env and click Sync to load your Jira data." icon="bolt" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={syncJira} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync from Jira'}</button>
          {syncError && <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 12 }}>{syncError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="content-narrow">
      {/* Header */}
      <div className="row-flex-sb" style={{ marginBottom: 14, alignItems: 'flex-start' }}>
        <div>
          <div className="row-flex" style={{ marginBottom: 4 }}>
            <Pill tone="info"><Icon name="grid" size={10} /> Jira</Pill>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
              {state.meta.integrations?.jira?.site} · synced {fmtRelative(state.meta.integrations?.jira?.syncedAt)}
            </span>
          </div>
          <div className="title-h1">{viewMode === 'backlog' ? 'Backlog' : 'Sprint board'}</div>
          <div className="title-sub">Read-only · view your team's work without leaving Operator</div>
        </div>
        <div className="row-flex" style={{ gap: 8 }}>
          <div className="seg">
            <button className={`seg-btn ${viewMode === 'board' ? 'active' : ''}`} onClick={() => setViewMode('board')}>Board</button>
            <button className={`seg-btn ${viewMode === 'backlog' ? 'active' : ''}`} onClick={() => setViewMode('backlog')}>Backlog</button>
          </div>
          <button className="btn btn-sm" onClick={syncJira} disabled={syncing} title="Pull latest data from Jira">
            {syncing ? '…' : <><Icon name="download" size={11} /> Sync</>}
          </button>
        </div>
      </div>
      {syncError && <div style={{ marginBottom: 10, color: 'var(--danger)', fontSize: 12 }}>{syncError}</div>}

      {/* Filters */}
      <div className="row-flex" style={{ marginBottom: 14, gap: 8 }}>
        <JiraProjectFilter jiraProjects={jiraProjects} allIssues={allIssues} selectedKeys={selectedProjectKeys} onChange={updateProjectFilter} />
        <input className="input" style={{ padding: '4px 8px', fontSize: 12, width: 200 }} placeholder="Search issues…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginLeft: 'auto' }}>
          {viewMode === 'board' ? `${sprintIssues.length} in sprint` : `${issues.length} issue${issues.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* ── BOARD VIEW ── */}
      {viewMode === 'board' && (
        <>
          {/* Sprint selector */}
          {allSprints.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-head">
                <div className="row-flex" style={{ gap: 8 }}>
                  <button className="btn btn-sm" disabled={!prevSprint} onClick={() => prevSprint && setActiveSprintId(prevSprint.id)} title={prevSprint?.name}>
                    <Icon name="chevronL" size={10} />
                  </button>
                  <select className="select" style={{ padding: '3px 8px', fontSize: 12, maxWidth: 300 }} value={activeSprintId || ''} onChange={(e) => setActiveSprintId(e.target.value)}>
                    {uniqueSprintOptions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.state === 'active' ? '(active)' : s.state === 'future' ? '(next)' : '(previous)'}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-sm" disabled={!nextSprint} onClick={() => nextSprint && setActiveSprintId(nextSprint.id)} title={nextSprint?.name}>
                    <Icon name="chevronR" size={10} />
                  </button>
                  {currentSprint && (
                    <>
                      <Pill tone={currentSprint.state === 'active' ? 'ok' : currentSprint.state === 'future' ? 'info' : 'neutral'}>{currentSprint.state}</Pill>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
                        {fmtDate(currentSprint.start)} → {fmtDate(currentSprint.end)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="pcard-metrics" style={{ borderTop: 'none', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="pcard-metric">
                  <span className="pcard-metric-label">Points</span>
                  <span className="pcard-metric-val">{donePts}<span style={{ color: 'var(--fg-4)', fontSize: 12 }}>/{totalPts}</span></span>
                  <Progress value={ptsPct} tone={ptsPct >= timePct - 10 ? 'ok' : 'warn'} />
                </div>
                <div className="pcard-metric">
                  <span className="pcard-metric-label">Elapsed</span>
                  <span className="pcard-metric-val">{sprintElapsed}<span style={{ color: 'var(--fg-4)', fontSize: 12 }}>/{sprintDays}d</span></span>
                  <Progress value={timePct} />
                </div>
                <div className="pcard-metric">
                  <span className="pcard-metric-label">Issues</span>
                  <span className="pcard-metric-val">{sprintIssues.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Kanban columns — only show columns that have issues */}
          {(() => {
            const visibleCols = BOARD_COLUMNS.filter(colName => sprintIssues.some(i => mapToColumn(i.status) === colName));
            const cols = visibleCols.length > 0 ? visibleCols : BOARD_COLUMNS;
            return (
          <div className="jira-board" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
            {cols.map(colName => {
              const colIssues = sprintIssues.filter(i => mapToColumn(i.status) === colName);
              return (
                <div key={colName} className="jira-col">
                  <div className="jira-col-head">
                    <span>{colName}</span>
                    <span className="tgroup-head-count">{colIssues.length}</span>
                  </div>
                  <div className="jira-col-body">
                    {colIssues.map(iss => <IssueCard key={iss.id} issue={iss} onClick={() => setOpenIssue(iss.id)} />)}
                  </div>
                </div>
              );
            })}
          </div>
            );
          })()}
        </>
      )}

      {/* ── BACKLOG VIEW ── */}
      {viewMode === 'backlog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {backlogGroups.map(({ sprint: sp, issues: grpIssues }) => {
            const key = sp?.id || 'backlog';
            const isCollapsed = collapsedSprints.has(key);
            const pts = grpIssues.reduce((a, b) => a + (b.storyPoints || 0), 0);
            return (
              <div key={key} className="card" style={{ overflow: 'hidden' }}>
                {/* Sprint header */}
                <div className="card-head" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleCollapse(key)}>
                  <div className="row-flex" style={{ gap: 8 }}>
                    <Icon name={isCollapsed ? 'chevronR' : 'chevronD'} size={10} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{sp?.name || 'Backlog'}</span>
                    {sp && <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{fmtDate(sp.start)} – {fmtDate(sp.end)}</span>}
                    {sp && <Pill tone={sp.state === 'active' ? 'ok' : sp.state === 'future' ? 'info' : 'neutral'}>{sp.state}</Pill>}
                    {!sp && <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>unassigned</span>}
                  </div>
                  <div className="row-flex" style={{ gap: 10 }}>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{grpIssues.length} item{grpIssues.length !== 1 ? 's' : ''}</span>
                    {pts > 0 && <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>Est: {pts}</span>}
                  </div>
                </div>
                {/* Issue rows */}
                {!isCollapsed && grpIssues.length > 0 && (
                  <div>
                    {[...grpIssues].sort((a, b) => {
                      const ORDER = ['To Do', 'In Progress', 'In Review', 'Ready for QA', 'In QA', 'Prod Review', 'Released', 'Closed'];
                      const ai = ORDER.indexOf(a.status), bi = ORDER.indexOf(b.status);
                      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                    }).map(iss => (
                      <div key={iss.id} className="jira-backlog-row" onClick={() => setOpenIssue(iss.id)}>
                        <IssueTypeBadge type={iss.type} small />
                        <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', flexShrink: 0 }}>{iss.key}</span>
                        <span className="truncate" style={{ fontWeight: 500, fontSize: 12.5, flex: 1 }}>{iss.summary}</span>
                        {iss.parentKey && (
                          <span className="pill pill-ghost mono" style={{ fontSize: 9, padding: '0 5px', flexShrink: 0 }}>{iss.parentKey}</span>
                        )}
                        <JiraStatusBadge status={iss.status} />
                        <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', width: 20, textAlign: 'right', flexShrink: 0 }}>{iss.storyPoints || '–'}</span>
                        <JiraPriorityDot priority={iss.priority} />
                        <JiraAvatar name={iss.assignee} size={20} />
                      </div>
                    ))}
                  </div>
                )}
                {!isCollapsed && grpIssues.length === 0 && (
                  <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--fg-4)', fontSize: 12 }}>No issues</div>
                )}
              </div>
            );
          })}
          {backlogGroups.length === 0 && <EmptyState title="No issues" body="Try adjusting the project filter or syncing." />}
        </div>
      )}

      {openIssue && <IssueDrawer issueId={openIssue} state={state} onClose={() => setOpenIssue(null)} />}
    </div>
  );
}

// ── Issue card (board view) ──────────────────────────────────────────────────

function IssueCard({ issue, onClick }) {
  return (
    <div className="issue-card" onClick={onClick}>
      <div className="row-flex-sb" style={{ marginBottom: 4 }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{issue.key}</span>
        <IssueTypeBadge type={issue.type} small />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35, marginBottom: 6, textWrap: 'pretty' }}>
        {issue.summary}
      </div>
      {issue.parentKey && (
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', marginBottom: 6 }}>
          ↑ {issue.parentKey}{issue.parentSummary ? `: ${issue.parentSummary}` : ''}
        </div>
      )}
      <div className="row-flex-sb">
        <div className="row-flex" style={{ gap: 5 }}>
          <JiraPriorityDot priority={issue.priority} />
          <JiraAvatar name={issue.assignee} size={18} />
        </div>
        {issue.storyPoints > 0 && (
          <span className="mono" style={{ fontSize: 10, background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 3 }}>{issue.storyPoints}</span>
        )}
      </div>
    </div>
  );
}

// ── Issue drawer with parent, description, comments ──────────────────────────

function IssueDrawer({ issueId, state, onClose }) {
  const issue = state.jiraIssues.find(i => i.id === issueId);
  const [comments, setComments] = React.useState(null);
  const [loadingComments, setLoadingComments] = React.useState(false);

  React.useEffect(() => {
    if (!issue) return;
    setComments(null);
    setLoadingComments(true);
    fetch(`/api/jira/comments/${issue.key}`)
      .then(r => r.ok ? r.json() : [])
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [issue?.key]);

  if (!issue) return null;
  const sprint = state.sprints.find(s => s.id === issue.sprintId);
  const project = (state.jiraProjects || []).find(p => p.key === issue.projectKey);
  const site = state.meta.integrations?.jira?.site || 'flyreel.atlassian.net';

  return (
    <Modal open={true} onClose={onClose} title={
      <span className="row-flex">
        <IssueTypeBadge type={issue.type} />
        <span className="mono" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{issue.key}</span>
        <a href={`https://${site}/browse/${issue.key}`} target="_blank" rel="noopener" className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', textDecoration: 'none' }}>↗ Jira</a>
      </span>
    } wide>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 14, textWrap: 'pretty' }}>
        {issue.summary}
      </div>

      {/* Badges */}
      <div className="row-flex" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <JiraStatusBadge status={issue.status} />
        <span className="pill pill-neutral"><JiraPriorityDot priority={issue.priority} /> {issue.priority}</span>
        {issue.storyPoints > 0 && <span className="pill pill-neutral">{issue.storyPoints} pts</span>}
        {project && <span className="pill pill-ghost mono" style={{ fontSize: 10 }}>{project.key}</span>}
        {issue.labels?.map(l => <span key={l} className="tag">{l}</span>)}
      </div>

      {/* Parent */}
      {issue.parentKey && (
        <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--line)' }}>
          <div className="field-label" style={{ marginBottom: 4 }}>Parent</div>
          <div className="row-flex" style={{ gap: 8 }}>
            {issue.parentType && <IssueTypeBadge type={issue.parentType} small />}
            <a href={`https://${site}/browse/${issue.parentKey}`} target="_blank" rel="noopener" className="mono" style={{ fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none' }}>{issue.parentKey}</a>
            <span style={{ fontSize: 12.5 }}>{issue.parentSummary}</span>
          </div>
        </div>
      )}

      {/* Fields grid */}
      <div className="grid g-2" style={{ marginBottom: 16, gap: 12 }}>
        <div><div className="field-label" style={{ marginBottom: 6 }}>Assignee</div><div className="row-flex"><JiraAvatar name={issue.assignee} /> <span>{issue.assignee}</span></div></div>
        <div><div className="field-label" style={{ marginBottom: 6 }}>Reporter</div><div className="row-flex"><JiraAvatar name={issue.reporter} /> <span>{issue.reporter}</span></div></div>
        <div><div className="field-label" style={{ marginBottom: 6 }}>Sprint</div><div style={{ fontSize: 12.5 }}>{sprint?.name || '—'}</div></div>
        <div><div className="field-label" style={{ marginBottom: 6 }}>Updated</div><div className="mono" style={{ fontSize: 12 }}>{fmtRelative(issue.updated)}</div></div>
      </div>

      {/* Description */}
      {issue.description && (
        <div style={{ marginBottom: 16 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Description</div>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: 12, background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--line)' }}>
            {issue.description}
          </div>
        </div>
      )}

      {/* Comments */}
      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>
          Comments {comments ? `(${comments.length})` : ''}
        </div>
        {loadingComments && <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>Loading…</div>}
        {comments && comments.length === 0 && <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>No comments</div>}
        {comments && comments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {comments.map(c => (
              <div key={c.id} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--line)' }}>
                <div className="row-flex" style={{ marginBottom: 6, gap: 6 }}>
                  <JiraAvatar name={c.author} size={18} />
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{c.author}</span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{fmtRelative(c.created)}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Shared components ────────────────────────────────────────────────────────

function IssueTypeBadge({ type, small }) {
  const s = {
    Story: { bg: 'oklch(72% 0.12 155 / 0.2)', color: 'oklch(72% 0.12 155)', icon: 'note' },
    Task:  { bg: 'oklch(72% 0.10 240 / 0.2)', color: 'oklch(72% 0.10 240)', icon: 'check' },
    Bug:   { bg: 'oklch(66% 0.17 26 / 0.2)',  color: 'oklch(70% 0.17 26)',  icon: 'warn' },
    Epic:  { bg: 'oklch(72% 0.12 300 / 0.2)', color: 'oklch(72% 0.12 300)', icon: 'bolt' },
    'Sub-task': { bg: 'oklch(72% 0.08 220 / 0.2)', color: 'oklch(72% 0.08 220)', icon: 'check' },
  }[type] || { bg: 'var(--bg-2)', color: 'var(--fg-2)', icon: 'dot' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: small ? '1px 5px' : '1px 7px', borderRadius: 3, background: s.bg, color: s.color, fontSize: small ? 10 : 10.5, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
      <Icon name={s.icon} size={9} /> {type}
    </span>
  );
}

function JiraStatusBadge({ status }) {
  const toneMap = {
    'To Do': 'neutral', 'Open': 'neutral', 'Backlog': 'neutral', 'New': 'neutral',
    'In Progress': 'info', 'Development': 'info', 'In Development': 'info',
    'In Review': 'accent', 'Code Review': 'accent', 'Review': 'accent',
    'Ready for QA': 'warn', 'QA': 'warn', 'In QA': 'warn', 'Regression Testing': 'warn', 'Testing': 'warn',
    'Prod Review': 'accent', 'QA Completed': 'accent',
    'Blocked': 'danger',
    'Done': 'ok', 'Closed': 'ok', 'Released': 'ok', 'Ready for Release': 'ok', 'Resolved': 'ok',
  };
  return <Pill tone={toneMap[status] || 'neutral'}>{status}</Pill>;
}

function JiraPriorityDot({ priority }) {
  const color = { Highest: 'oklch(66% 0.17 26)', High: 'oklch(70% 0.17 26)', Medium: 'oklch(78% 0.14 70)', Low: 'var(--fg-4)', Lowest: 'var(--fg-4)' }[priority] || 'var(--fg-4)';
  return <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block', flexShrink: 0 }} title={priority} />;
}

function JiraAvatar({ name, size = 20 }) {
  if (!name || name === 'Unassigned') {
    return <span style={{ width: size, height: size, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', background: 'var(--bg-2)', color: 'var(--fg-4)', fontSize: size * 0.45, fontWeight: 600, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>?</span>;
  }
  const initials = name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <span style={{ width: size, height: size, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', background: `oklch(65% 0.08 ${hue})`, color: 'white', fontSize: size * 0.45, fontWeight: 600, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{initials}</span>;
}

Object.assign(window, { JiraView, JiraProjectFilter, IssueCard, IssueDrawer, IssueTypeBadge, JiraStatusBadge, JiraPriorityDot, JiraAvatar });
