// Jira integration — read-only viewer + sprint board + issue drawer.

function JiraView({ state, onOpenProject }) {
  const jiraProjects = state.jiraProjects || [];
  const allSprints = state.sprints || [];
  const allIssues = state.jiraIssues || [];
  const [activeJp, setActiveJp] = React.useState(jiraProjects[0]?.id);
  const [viewMode, setViewMode] = React.useState('board');
  const [openIssue, setOpenIssue] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [syncing, setSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState(null);

  const syncJira = async () => {
    setSyncing(true); setSyncError(null);
    try {
      const res = await fetch('/api/jira/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      actions.setJiraData(data);
      actions.setMeta({ integrations: { ...state.meta.integrations, jira: { syncedAt: new Date().toISOString().slice(0, 10) } } });
      if (data.jiraProjects?.[0]) setActiveJp(data.jiraProjects[0].id);
    } catch (e) {
      setSyncError(e.message);
    } finally { setSyncing(false); }
  };

  if (!jiraProjects.length) {
    return (
      <div className="content-narrow">
        <EmptyState title="Jira not connected" body="Add your credentials to .env and click Sync to load your Jira data." icon="bolt" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={syncJira} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync from Jira'}
          </button>
          {syncError && <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 12 }}>{syncError}</div>}
        </div>
      </div>
    );
  }

  const jp = jiraProjects.find((p) => p.id === activeJp);
  const sprints = allSprints.filter((s) => s.jiraProjectId === activeJp);
  const activeSprint = sprints.find((s) => s.state === 'active') || sprints[0];
  const [activeSprintId, setActiveSprintId] = React.useState(activeSprint?.id);
  React.useEffect(() => { setActiveSprintId((sprints.find((s) => s.state === 'active') || sprints[0])?.id); }, [activeJp]);

  const sprint = allSprints.find((s) => s.id === activeSprintId);
  const issues = allIssues.filter((i) =>
    i.projectKey === jp?.key &&
    (!sprint || i.sprintId === sprint.id) &&
    (!search || i.summary.toLowerCase().includes(search.toLowerCase()) || i.key.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPts = issues.reduce((a, b) => a + (b.storyPoints || 0), 0);
  const donePts = issues.filter((i) => i.status === 'Done').reduce((a, b) => a + (b.storyPoints || 0), 0);
  const inProg = issues.filter((i) => i.status === 'In Progress').length;
  const blocked = issues.filter((i) => i.status === 'Blocked').length;
  const sprintDays = sprint ? daysBetween(sprint.start, sprint.end) : 14;
  const sprintElapsed = sprint ? Math.max(0, Math.min(sprintDays, daysBetween(sprint.start, new Date().toISOString().slice(0, 10)))) : 0;
  const timePct = sprintDays > 0 ? Math.round((sprintElapsed / sprintDays) * 100) : 0;
  const ptsPct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;

  const columns = ['To Do', 'In Progress', 'In Review', 'Blocked', 'Done'];
  const linkedProject = jp?.projectId ? state.projects.find((p) => p.id === jp.projectId) : null;

  return (
    <div className="content-narrow">
      <div className="row-flex-sb" style={{ marginBottom: 14, alignItems: 'flex-start' }}>
        <div>
          <div className="row-flex" style={{ marginBottom: 4 }}>
            <Pill tone="info"><Icon name="grid" size={10} /> Jira</Pill>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
              {state.meta.integrations?.jira?.site} · synced {fmtRelative(state.meta.integrations?.jira?.syncedAt)}
            </span>
          </div>
          <div className="title-h1">Sprint board</div>
          <div className="title-sub">Read-only · view your team's work without leaving Operator</div>
        </div>
        <div className="row-flex" style={{ gap: 8 }}>
          <div className="seg">
            <button className={`seg-btn ${viewMode === 'board' ? 'active' : ''}`} onClick={() => setViewMode('board')}>Board</button>
            <button className={`seg-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>List</button>
          </div>
          <button className="btn btn-sm" onClick={syncJira} disabled={syncing} title="Pull latest data from Jira">
            {syncing ? '…' : <><Icon name="download" size={11} /> Sync</>}
          </button>
        </div>
      </div>
      {syncError && <div style={{ marginBottom: 10, color: 'var(--danger)', fontSize: 12 }}>{syncError}</div>}

      <div className="tabs">
        {jiraProjects.map((p) => (
          <button key={p.id} className={`tab ${activeJp === p.id ? 'active' : ''}`} onClick={() => setActiveJp(p.id)}>
            <span className="mono" style={{ fontSize: 10.5 }}>{p.key}</span>
            <span>{p.name}</span>
            <span className="tab-count">{allIssues.filter((i) => i.projectKey === p.key).length}</span>
          </button>
        ))}
      </div>

      {sprint && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-head">
            <div className="row-flex">
              <select className="select" style={{ padding: '3px 8px', fontSize: 12 }} value={activeSprintId} onChange={(e) => setActiveSprintId(e.target.value)}>
                {sprints.map((s) => <option key={s.id} value={s.id}>{s.name} {s.state === 'active' ? '· active' : s.state === 'closed' ? '· closed' : ''}</option>)}
              </select>
              <Pill tone={sprint.state === 'active' ? 'ok' : 'neutral'}>{sprint.state}</Pill>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
                {fmtDate(sprint.start)} → {fmtDate(sprint.end)}
              </span>
              {linkedProject && (
                <>
                  <span style={{ color: 'var(--fg-4)' }}>·</span>
                  <ProjectChip project={linkedProject} onClick={() => onOpenProject(linkedProject.id)} />
                </>
              )}
            </div>
            <input className="input" style={{ padding: '4px 8px', fontSize: 12, width: 180 }} placeholder="Search issues…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', color: 'var(--fg-2)', fontSize: 12.5, fontStyle: 'italic' }}>
            "{sprint.goal}"
          </div>
          <div className="pcard-metrics" style={{ borderTop: 'none' }}>
            <div className="pcard-metric">
              <span className="pcard-metric-label">Points done</span>
              <span className="pcard-metric-val">{donePts}<span style={{ color: 'var(--fg-4)', fontSize: 12 }}>/{totalPts}</span></span>
              <Progress value={ptsPct} tone={ptsPct >= timePct - 10 ? 'ok' : 'warn'} />
            </div>
            <div className="pcard-metric">
              <span className="pcard-metric-label">Sprint elapsed</span>
              <span className="pcard-metric-val">{sprintElapsed}<span style={{ color: 'var(--fg-4)', fontSize: 12 }}>/{sprintDays}d</span></span>
              <Progress value={timePct} />
            </div>
            <div className="pcard-metric">
              <span className="pcard-metric-label">In progress</span>
              <span className="pcard-metric-val">{inProg}</span>
              <span className="metric-delta">{issues.length} total issues</span>
            </div>
            <div className="pcard-metric">
              <span className="pcard-metric-label">Blocked</span>
              <span className="pcard-metric-val" style={{ color: blocked ? 'var(--danger)' : 'var(--fg)' }}>{blocked}</span>
              <span className="metric-delta">{issues.filter((i) => i.priority === 'Highest' || i.priority === 'High').length} high priority</span>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'board' ? (
        <div className="jira-board">
          {columns.map((col) => {
            const colIssues = issues.filter((i) => i.status === col);
            return (
              <div key={col} className="jira-col">
                <div className="jira-col-head">
                  <span>{col}</span>
                  <span className="tgroup-head-count">{colIssues.length}</span>
                </div>
                <div className="jira-col-body">
                  {colIssues.map((iss) => (
                    <IssueCard key={iss.id} issue={iss} onClick={() => setOpenIssue(iss.id)} />
                  ))}
                  {colIssues.length === 0 && (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--fg-4)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="jira-list-head">
            <span>Key</span><span>Summary</span><span>Type</span><span>Status</span><span>Assignee</span><span>Pts</span><span>Updated</span>
          </div>
          {issues.map((iss) => (
            <div key={iss.id} className="jira-list-row" onClick={() => setOpenIssue(iss.id)}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{iss.key}</span>
              <span className="truncate" style={{ fontWeight: 500 }}>{iss.summary}</span>
              <span><IssueTypeBadge type={iss.type} /></span>
              <span><JiraStatusBadge status={iss.status} /></span>
              <span className="truncate" style={{ color: 'var(--fg-2)', fontSize: 12 }}>{iss.assignee}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{iss.storyPoints || '—'}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{fmtRelative(iss.updated)}</span>
            </div>
          ))}
          {issues.length === 0 && <EmptyState title="No issues" body="Try switching sprints or clearing the search filter." />}
        </div>
      )}

      {openIssue && <IssueDrawer issueId={openIssue} state={state} onClose={() => setOpenIssue(null)} />}
    </div>
  );
}

function IssueCard({ issue, onClick }) {
  return (
    <div className="issue-card" onClick={onClick}>
      <div className="row-flex-sb" style={{ marginBottom: 6 }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{issue.key}</span>
        <IssueTypeBadge type={issue.type} small />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35, marginBottom: 8, textWrap: 'pretty' }}>
        {issue.summary}
      </div>
      <div className="row-flex-sb">
        <div className="row-flex" style={{ gap: 5 }}>
          <JiraPriorityDot priority={issue.priority} />
          <JiraAvatar name={issue.assignee} size={18} />
          {issue.storyPoints && <span className="pill pill-neutral" style={{ fontSize: 9.5, padding: '0 5px' }}>{issue.storyPoints}</span>}
        </div>
      </div>
    </div>
  );
}

function IssueDrawer({ issueId, state, onClose }) {
  const issue = state.jiraIssues.find((i) => i.id === issueId);
  if (!issue) return null;
  const sprint = state.sprints.find((s) => s.id === issue.sprintId);

  return (
    <Modal open={true} onClose={onClose} title={
      <span className="row-flex">
        <IssueTypeBadge type={issue.type} />
        <span className="mono" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{issue.key}</span>
        <a href={`https://${state.meta.integrations?.jira?.site}/browse/${issue.key}`} target="_blank" rel="noopener" className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', textDecoration: 'none' }}>↗ open in Jira</a>
      </span>
    } wide>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 14, textWrap: 'pretty' }}>
        {issue.summary}
      </div>
      <div className="row-flex" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <JiraStatusBadge status={issue.status} />
        <span className="pill pill-neutral"><JiraPriorityDot priority={issue.priority} /> {issue.priority}</span>
        {issue.storyPoints && <span className="pill pill-neutral">{issue.storyPoints} pts</span>}
        {issue.labels?.map((l) => <span key={l} className="tag">{l}</span>)}
      </div>
      <div className="grid g-2" style={{ marginBottom: 16, gap: 12 }}>
        <div><div className="field-label" style={{ marginBottom: 6 }}>Assignee</div><div className="row-flex"><JiraAvatar name={issue.assignee} /> <span>{issue.assignee}</span></div></div>
        <div><div className="field-label" style={{ marginBottom: 6 }}>Reporter</div><div className="row-flex"><JiraAvatar name={issue.reporter} /> <span>{issue.reporter}</span></div></div>
        <div><div className="field-label" style={{ marginBottom: 6 }}>Sprint</div><div style={{ fontSize: 12.5 }}>{sprint?.name || '—'}</div></div>
        <div><div className="field-label" style={{ marginBottom: 6 }}>Updated</div><div className="mono" style={{ fontSize: 12 }}>{fmtRelative(issue.updated)}</div></div>
      </div>
      <div className="field-label" style={{ marginBottom: 6 }}>Description</div>
      <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: 12, background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--line)' }}>
        {issue.description}
      </div>
    </Modal>
  );
}

function IssueTypeBadge({ type, small }) {
  const s = {
    Story: { bg: 'oklch(72% 0.12 155 / 0.2)', color: 'oklch(72% 0.12 155)', icon: 'note' },
    Task:  { bg: 'oklch(72% 0.10 240 / 0.2)', color: 'oklch(72% 0.10 240)', icon: 'check' },
    Bug:   { bg: 'oklch(66% 0.17 26 / 0.2)',  color: 'oklch(70% 0.17 26)',  icon: 'warn' },
    Epic:  { bg: 'oklch(72% 0.12 300 / 0.2)', color: 'oklch(72% 0.12 300)', icon: 'bolt' },
  }[type] || { bg: 'var(--bg-2)', color: 'var(--fg-2)', icon: 'dot' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: small ? '1px 5px' : '1px 7px', borderRadius: 3, background: s.bg, color: s.color, fontSize: small ? 10 : 10.5, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
      <Icon name={s.icon} size={9} /> {type}
    </span>
  );
}

function JiraStatusBadge({ status }) {
  const t = { 'To Do': 'neutral', 'In Progress': 'info', 'In Review': 'accent', 'Blocked': 'danger', 'Done': 'ok' }[status] || 'neutral';
  return <Pill tone={t}>{status}</Pill>;
}

function JiraPriorityDot({ priority }) {
  const color = { Highest: 'oklch(66% 0.17 26)', High: 'oklch(70% 0.17 26)', Medium: 'oklch(78% 0.14 70)', Low: 'var(--fg-4)', Lowest: 'var(--fg-4)' }[priority] || 'var(--fg-4)';
  return <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} title={priority} />;
}

function JiraAvatar({ name, size = 20 }) {
  const initials = name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', background: `oklch(65% 0.08 ${hue})`, color: 'white', fontSize: size * 0.45, fontWeight: 600, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
      {initials}
    </span>
  );
}

Object.assign(window, { JiraView, IssueCard, IssueDrawer, IssueTypeBadge, JiraStatusBadge, JiraPriorityDot, JiraAvatar });
