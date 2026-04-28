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

// ── Type filter dropdown ────────────────────────────────────────────────────

function JiraTypeFilter({ issues, selectedTypes, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const types = [...new Set(issues.map(i => i.type))].sort();
  const isAll = selectedTypes.size === 0;
  const toggle = (t) => { const next = new Set(selectedTypes); if (next.has(t)) next.delete(t); else next.add(t); onChange(next); };
  const filterLabel = isAll ? 'All types' : (() => { const t = [...selectedTypes]; return t.length <= 2 ? t.join(', ') : `${t.slice(0, 2).join(', ')} +${t.length - 2}`; })();
  const Chk = ({ on }) => <span style={{ width: 14, height: 14, borderRadius: 3, border: '1.5px solid var(--line)', background: on ? 'var(--accent)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on && <Icon name="check" size={9} style={{ color: '#fff' }} />}</span>;

  if (types.length <= 1) return null;
  return (
    <div style={{ position: 'relative', flexShrink: 0 }} ref={ref}>
      <button className={`btn btn-sm${!isAll ? ' btn-primary' : ''}`} style={{ fontSize: 11, gap: 5 }} onClick={() => setOpen(v => !v)}>
        <Icon name="filter" size={10} /> {filterLabel} <Icon name={open ? 'chevronD' : 'chevronR'} size={9} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200, background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', minWidth: 200, maxHeight: 380, overflowY: 'auto', padding: '6px 0' }}>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', padding: '5px 12px', borderRadius: 0, fontSize: 11, gap: 7 }} onClick={() => { onChange(new Set()); setOpen(false); }}><Chk on={isAll} /> All types</button>
          {types.map(t => (
            <button key={t} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', padding: '5px 12px', borderRadius: 0, fontSize: 11, gap: 7 }} onClick={() => toggle(t)}>
              <Chk on={selectedTypes.has(t)} />
              <IssueTypeBadge type={t} small />
              <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', marginLeft: 'auto' }}>{issues.filter(i => i.type === t).length}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Jira view ───────────────────────────────────────────────────────────

function JiraView({ state, onOpenProject }) {
  const jiraProjects = state.jiraProjects || [];
  const allSprints = state.sprints || [];
  const allIssues = state.jiraIssues || [];
  const boardColumns = state.jiraBoardColumns || [];
  const boardColumnsByProject = state.jiraBoardColumnsByProject || {};
  const savedScopes = state.meta.integrations?.jira?.selectedScopes || [];
  const savedTypeFilters = state.meta.integrations?.jira?.typeFilters || {};
  const [selectedProjectKeys, setSelectedProjectKeys] = React.useState(() => new Set(savedScopes));
  const [selectedTypes, setSelectedTypes] = React.useState(() => new Set(savedTypeFilters[savedScopes.join(',') || '_all'] || []));
  const [viewMode, setViewMode] = React.useState('board');
  const [openIssue, setOpenIssue] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [syncing, setSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState(null);
  const [activeSprintId, setActiveSprintId] = React.useState(null);
  const [collapsedSprints, setCollapsedSprints] = React.useState(new Set());
  const [listSort, setListSort] = React.useState({ col: 'status', asc: true });

  const scopeKey = [...selectedProjectKeys].sort().join(',') || '_all';

  const updateProjectFilter = (nextKeys) => {
    setSelectedProjectKeys(nextKeys);
    actions.setMeta({ integrations: { ...state.meta.integrations, jira: { ...state.meta.integrations?.jira, selectedScopes: [...nextKeys] } } });
    // Restore saved type filter for new scope
    const nk = [...nextKeys].sort().join(',') || '_all';
    const saved = (state.meta.integrations?.jira?.typeFilters || {})[nk] || [];
    setSelectedTypes(new Set(saved));
  };

  const updateTypeFilter = (nextTypes) => {
    setSelectedTypes(nextTypes);
    const tf = { ...(state.meta.integrations?.jira?.typeFilters || {}), [scopeKey]: [...nextTypes] };
    actions.setMeta({ integrations: { ...state.meta.integrations, jira: { ...state.meta.integrations?.jira, typeFilters: tf } } });
  };

  const syncJira = async () => {
    setSyncing(true); setSyncError(null);
    try {
      const projectKeys = [...selectedProjectKeys];
      // Send active type filters so the server can narrow the JQL
      const tfMap = state.meta.integrations?.jira?.typeFilters || {};
      const typeFilterPayload = {};
      projectKeys.forEach(k => {
        const scopeKey = k; // per-project key
        const saved = tfMap[scopeKey] || tfMap[projectKeys.join(',')] || [];
        if (saved.length) typeFilterPayload[k] = saved;
      });
      // If single project or "all" with a scope key, also check the current active scope
      if (!projectKeys.length && selectedTypes.size > 0) {
        typeFilterPayload['_all'] = [...selectedTypes];
      }
      const res = await fetch('/api/jira/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(projectKeys.length ? { projectKeys } : {}), typeFilters: typeFilterPayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      actions.setJiraData(data);
      actions.setMeta({ integrations: { ...state.meta.integrations, jira: { ...state.meta.integrations?.jira, syncedAt: new Date().toISOString().slice(0, 10) } } });
    } catch (e) {
      setSyncError(e.message);
    } finally { setSyncing(false); }
  };

  // Filtered issues — project filter, then type filter, then search
  const isAllProjects = selectedProjectKeys.size === 0;
  const projectFilteredIssues = allIssues.filter(i =>
    (isAllProjects || selectedProjectKeys.has(i.projectKey)) &&
    (!search || i.summary.toLowerCase().includes(search.toLowerCase()) || i.key.toLowerCase().includes(search.toLowerCase()))
  );
  const issues = selectedTypes.size === 0
    ? projectFilteredIssues
    : projectFilteredIssues.filter(i => selectedTypes.has(i.type));

  // Derive board columns dynamically from selected projects
  const derivedColumns = React.useMemo(() => {
    const keys = isAllProjects ? Object.keys(boardColumnsByProject) : [...selectedProjectKeys];
    // Collect columns from all selected projects
    const colMap = new Map(); // name → Set<status>
    let hasConfig = false;
    keys.forEach(k => {
      const cols = boardColumnsByProject[k];
      if (cols && cols.length) {
        hasConfig = true;
        cols.forEach(c => {
          if (!colMap.has(c.name)) colMap.set(c.name, new Set());
          (c.statuses || []).forEach(s => colMap.get(c.name).add(s));
        });
      }
    });
    // If we have per-project config, use it
    if (hasConfig) {
      return [...colMap.entries()].map(([name, statuses]) => ({ name, statuses: [...statuses] }));
    }
    // Fallback to global boardColumns
    if (boardColumns.length) {
      return boardColumns.map(c => ({ name: c.name, statuses: c.statuses || [] }));
    }
    // Last resort: extract unique statuses from issues
    const uniqueStatuses = [...new Set(issues.map(i => i.status))];
    return uniqueStatuses.map(s => ({ name: s, statuses: [s] }));
  }, [isAllProjects, selectedProjectKeys, boardColumnsByProject, boardColumns, issues.length]);

  // Build status→column mapping from derived columns
  const statusToColumn = React.useMemo(() => {
    const map = {};
    derivedColumns.forEach(col => {
      (col.statuses || []).forEach(st => { map[st] = col.name; });
    });
    return map;
  }, [derivedColumns]);

  const columnNames = derivedColumns.map(c => c.name);

  const mapToColumn = (status) => {
    if (statusToColumn[status]) return statusToColumn[status];
    // Fallback heuristics for unmapped statuses
    if (/done|closed|released|ready for release|resolved/i.test(status)) return columnNames.find(c => /done|closed|released/i.test(c)) || columnNames[columnNames.length - 1] || 'Done';
    if (/progress|development|dev|in dev/i.test(status)) return columnNames.find(c => /progress|dev/i.test(c)) || columnNames[1] || 'In Progress';
    return columnNames[0] || 'To Do';
  };

  // Sprint navigation
  const chronoSprints = [...allSprints].sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  const activeSprint = chronoSprints.find(s => s.state === 'active');
  React.useEffect(() => {
    if (!activeSprintId && activeSprint) setActiveSprintId(activeSprint.id);
  }, [activeSprint?.id]);

  const currentSprint = allSprints.find(s => s.id === activeSprintId);
  const currentIdx = chronoSprints.findIndex(s => s.id === activeSprintId);
  const prevSprint = currentIdx > 0 ? chronoSprints[currentIdx - 1] : null;
  const nextSprint = currentIdx >= 0 && currentIdx < chronoSprints.length - 1 ? chronoSprints[currentIdx + 1] : null;
  const seenIds = new Set();
  const uniqueSprintOptions = [prevSprint, currentSprint, nextSprint].filter(Boolean).filter(s => { if (seenIds.has(s.id)) return false; seenIds.add(s.id); return true; });

  const sprintIssues = currentSprint ? issues.filter(i => i.sprintId === currentSprint.id) : [];

  // Sprint stats
  const totalPts = sprintIssues.reduce((a, b) => a + (b.storyPoints || 0), 0);
  const doneCol = columnNames[columnNames.length - 1] || 'Done';
  const donePts = sprintIssues.filter(i => mapToColumn(i.status) === doneCol).reduce((a, b) => a + (b.storyPoints || 0), 0);
  const sprintDays = currentSprint ? daysBetween(currentSprint.start, currentSprint.end) : 14;
  const sprintElapsed = currentSprint ? Math.max(0, Math.min(sprintDays, daysBetween(currentSprint.start, new Date().toISOString().slice(0, 10)))) : 0;
  const timePct = sprintDays > 0 ? Math.round((sprintElapsed / sprintDays) * 100) : 0;
  const ptsPct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;

  // Backlog groups
  const backlogGroups = (() => {
    const groups = [];
    const activeAndFuture = chronoSprints.filter(s => s.state === 'active' || s.state === 'future');
    activeAndFuture.forEach(sp => {
      const spIssues = issues.filter(i => i.sprintId === sp.id);
      groups.push({ sprint: sp, issues: spIssues });
    });
    const backlogIssues = issues.filter(i => !i.sprintId);
    if (backlogIssues.length) groups.push({ sprint: null, issues: backlogIssues });
    return groups;
  })();

  const toggleCollapse = (key) => {
    setCollapsedSprints(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };

  // List view sorting
  const sortedListIssues = React.useMemo(() => {
    const colOrder = {};
    columnNames.forEach((c, i) => { colOrder[c] = i; });
    const prioOrder = { Highest: 0, High: 1, Medium: 2, Low: 3, Lowest: 4 };
    const sorted = [...issues];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (listSort.col) {
        case 'key': cmp = a.key.localeCompare(b.key); break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'summary': cmp = a.summary.localeCompare(b.summary); break;
        case 'status': {
          const ai = colOrder[mapToColumn(a.status)] ?? 999;
          const bi = colOrder[mapToColumn(b.status)] ?? 999;
          cmp = ai - bi;
          break;
        }
        case 'priority': cmp = (prioOrder[a.priority] ?? 5) - (prioOrder[b.priority] ?? 5); break;
        case 'assignee': cmp = (a.assignee || '').localeCompare(b.assignee || ''); break;
        case 'sprint': cmp = (a.sprintName || '').localeCompare(b.sprintName || ''); break;
        case 'points': cmp = (b.storyPoints || 0) - (a.storyPoints || 0); break;
        default: cmp = 0;
      }
      return listSort.asc ? cmp : -cmp;
    });
    return sorted;
  }, [issues, listSort, columnNames]);

  const toggleSort = (col) => {
    setListSort(prev => prev.col === col ? { col, asc: !prev.asc } : { col, asc: true });
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

  const viewTitles = { board: 'Sprint board', backlog: 'Backlog', list: 'Issues' };

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
          <div className="title-h1">{viewTitles[viewMode] || 'Jira'}</div>
          <div className="title-sub">Read-only · view your team's work without leaving Operator</div>
        </div>
        <div className="row-flex" style={{ gap: 8 }}>
          <div className="seg">
            <button className={`seg-btn ${viewMode === 'board' ? 'active' : ''}`} onClick={() => setViewMode('board')}>Board</button>
            <button className={`seg-btn ${viewMode === 'backlog' ? 'active' : ''}`} onClick={() => setViewMode('backlog')}>Backlog</button>
            <button className={`seg-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>List</button>
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
        <JiraTypeFilter issues={projectFilteredIssues} selectedTypes={selectedTypes} onChange={updateTypeFilter} />
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

          {/* Kanban columns — dynamic from Jira board config */}
          {(() => {
            const visibleCols = columnNames.filter(colName => sprintIssues.some(i => mapToColumn(i.status) === colName));
            const cols = visibleCols.length > 0 ? visibleCols : columnNames;
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
                {!isCollapsed && grpIssues.length > 0 && (
                  <div>
                    {[...grpIssues].sort((a, b) => {
                      const colOrder = {};
                      columnNames.forEach((c, i) => { colOrder[c] = i; });
                      const ai = colOrder[mapToColumn(a.status)] ?? 999;
                      const bi = colOrder[mapToColumn(b.status)] ?? 999;
                      return ai - bi;
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

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {[
                    { key: 'key', label: 'Key', width: 80 },
                    { key: 'type', label: 'Type', width: 80 },
                    { key: 'summary', label: 'Summary' },
                    { key: 'status', label: 'Status', width: 120 },
                    { key: 'priority', label: 'Pri', width: 40 },
                    { key: 'assignee', label: 'Assignee', width: 120 },
                    { key: 'sprint', label: 'Sprint', width: 140 },
                    { key: 'points', label: 'Pts', width: 40 },
                  ].map(col => (
                    <th key={col.key} style={{ padding: '8px 10px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-4)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', width: col.width || 'auto' }}
                      onClick={() => toggleSort(col.key)}>
                      {col.label} {listSort.col === col.key ? (listSort.asc ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedListIssues.map(iss => (
                  <tr key={iss.id} style={{ borderBottom: '1px solid var(--line-2)', cursor: 'pointer' }}
                    onClick={() => setOpenIssue(iss.id)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '7px 10px' }}><span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{iss.key}</span></td>
                    <td style={{ padding: '7px 10px' }}><IssueTypeBadge type={iss.type} small /></td>
                    <td style={{ padding: '7px 10px', fontWeight: 500, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{iss.summary}</td>
                    <td style={{ padding: '7px 10px' }}><JiraStatusBadge status={iss.status} /></td>
                    <td style={{ padding: '7px 10px' }}><JiraPriorityDot priority={iss.priority} /></td>
                    <td style={{ padding: '7px 10px' }}><div className="row-flex" style={{ gap: 5 }}><JiraAvatar name={iss.assignee} size={18} /><span className="truncate" style={{ fontSize: 11.5, maxWidth: 90 }}>{iss.assignee}</span></div></td>
                    <td style={{ padding: '7px 10px' }}><span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{iss.sprintName || '—'}</span></td>
                    <td style={{ padding: '7px 10px', textAlign: 'right' }}><span className="mono" style={{ fontSize: 11 }}>{iss.storyPoints || '–'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedListIssues.length === 0 && (
              <div style={{ padding: '28px 14px', textAlign: 'center', color: 'var(--fg-4)', fontSize: 12 }}>No issues match the current filters.</div>
            )}
          </div>
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

Object.assign(window, { JiraView, JiraProjectFilter, JiraTypeFilter, IssueCard, IssueDrawer, IssueTypeBadge, JiraStatusBadge, JiraPriorityDot, JiraAvatar });
