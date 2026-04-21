// Roadmap — program Gantt: bars, milestones, dependencies (Hover/Always/Off), critical path.

const RM = {
  LABEL_W:  240,
  PROG_H:   40,
  PROJ_H:   56,
  BAR_H:    34,
  MS_H:     9,
  HDR_H:    56,
  DAY_PX:   { week: 28, month: 9, quarter: 3.5, year: 1.8 },
  DAYS:     { week: 70, month: 168, quarter: 392, year: 730 },
  MS_CLR:   'oklch(65% 0.10 280)',
  MS_DONE:  'oklch(72% 0.05 280)',
};

const STATUS_CLR = {
  'on-track': 'var(--ok)',
  'at-risk':  'var(--warn)',
  'blocked':  'var(--danger)',
  'done':     'var(--fg-4)',
};

function RoadmapView({ state }) {
  const [zoom, setZoom]            = React.useState('month');
  const [programFilter, setFilter] = React.useState(null);
  const [collapsed, setCollapsed]  = React.useState({});
  const [showMilestones, setShowMs]     = React.useState(true);
  const [showCritPath, setShowCP]       = React.useState(false);
  const [showViolations, setShowViol]   = React.useState(true);
  const [depsMode, setDepsMode]         = React.useState('hover');
  const [hoveredId, setHoveredId]       = React.useState(null);
  const [ganttScroll, setGanttScroll]   = React.useState(0);
  const [dragging, setDragging]         = React.useState(null); // { projId, startX, deltaX }
  const didDragRef                      = React.useRef(false);
  const bodyRef = React.useRef(null);

  const programs   = state.programs  || [];
  const projects   = state.projects  || [];
  const milestones = state.milestones || [];

  // ── geometry ──────────────────────────────────────────────────────────────
  const dayPx     = RM.DAY_PX[zoom];
  const rangeDays = RM.DAYS[zoom];

  const today = React.useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const viewStart = React.useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - Math.round(rangeDays * 0.22));
    return d;
  }, [today.getTime(), rangeDays]);

  const totalWidth = rangeDays * dayPx;

  const dateToX = React.useCallback((s) => {
    if (!s) return null;
    const d = new Date(s + 'T00:00:00');
    return Math.round((d - viewStart) / 86400000 * dayPx);
  }, [viewStart.getTime(), dayPx]);

  const todayX = Math.round((today - viewStart) / 86400000 * dayPx);

  React.useEffect(() => {
    if (bodyRef.current) {
      const sl = Math.max(0, todayX - 200);
      bodyRef.current.scrollLeft = sl;
      setGanttScroll(sl);
    }
  }, [zoom]);

  // ── drag-to-move bar ───────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => setDragging(prev => ({ ...prev, deltaX: e.clientX - prev.startX }));
    const onUp   = (e) => {
      const deltaDays = Math.round((e.clientX - dragging.startX) / dayPx);
      if (deltaDays !== 0) {
        didDragRef.current = true;
        actions.shiftProjectDates(dragging.projId, deltaDays);
      }
      setDragging(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
  }, [dragging, dayPx, projects, milestones]);

  // ── filtered rows ──────────────────────────────────────────────────────────
  const visibleProjects = projects.filter(p =>
    !programFilter || p.programId === programFilter
  );

  const rows = [];
  const assignedIds = new Set();

  for (const pg of programs) {
    if (programFilter && pg.id !== programFilter) continue;
    const pgProjs = visibleProjects.filter(p => p.programId === pg.id);
    rows.push({ type: 'program', pg, pgProjs });
    pgProjs.forEach(p => assignedIds.add(p.id));
    if (!collapsed[pg.id]) pgProjs.forEach(p => rows.push({ type: 'project', proj: p }));
  }
  const ungrouped = visibleProjects.filter(p => !assignedIds.has(p.id));
  if (ungrouped.length > 0) {
    if (programs.length > 0 && !programFilter) rows.push({ type: 'divider' });
    ungrouped.forEach(p => rows.push({ type: 'project', proj: p }));
  }

  // ── row Y for dep arrows ───────────────────────────────────────────────────
  const rowY = {};
  let curY = 0;
  const barTop = Math.floor((RM.PROJ_H - RM.BAR_H) / 2);
  for (const row of rows) {
    if (row.type === 'program')      curY += RM.PROG_H;
    else if (row.type === 'divider') curY += 12;
    else if (row.type === 'project') {
      rowY[row.proj.id] = curY + barTop + RM.BAR_H / 2;
      curY += RM.PROJ_H;
    }
  }
  const rowsHeight = curY;

  // ── critical path ──────────────────────────────────────────────────────────
  const criticalPath = React.useMemo(() => {
    const cp = new Set(), memo = {};
    const daysOf = (id) => {
      const p = projects.find(x => x.id === id);
      return (!p || !p.startDate || !p.dueDate) ? 0
        : Math.max(0, (new Date(p.dueDate) - new Date(p.startDate)) / 86400000);
    };
    const longest = (id, seen = new Set()) => {
      if (memo[id] !== undefined) return memo[id];
      if (seen.has(id)) return 0;
      const deps = projects.find(p => p.id === id)?.dependsOn || [];
      const self = daysOf(id);
      if (!deps.length) return (memo[id] = self);
      return (memo[id] = self + Math.max(...deps.map(d => longest(d, new Set([...seen, id])))));
    };
    let maxLen = 0, endNode = null;
    projects.forEach(p => { const l = longest(p.id); if (l > maxLen) { maxLen = l; endNode = p.id; } });
    if (!endNode || maxLen === 0) return cp;
    const trace = (id) => {
      cp.add(id);
      const deps = projects.find(p => p.id === id)?.dependsOn || [];
      if (!deps.length) return;
      trace(deps.reduce((b, d) => longest(d) > longest(b) ? d : b, deps[0]));
    };
    trace(endNode);
    return cp;
  }, [projects]);

  // ── successors map & violations ────────────────────────────────────────────
  const successors = React.useMemo(() => {
    const m = {};
    projects.forEach(p => { m[p.id] = []; });
    projects.forEach(p => (p.dependsOn || []).forEach(d => { if (m[d]) m[d].push(p.id); }));
    return m;
  }, [projects]);

  const violations = React.useMemo(() => {
    const v = new Set();
    projects.forEach(p => (p.dependsOn || []).forEach(depId => {
      const pred = projects.find(x => x.id === depId);
      if (pred?.dueDate && p.startDate && pred.dueDate > p.startDate) v.add(`${depId}-${p.id}`);
    }));
    return v;
  }, [projects]);

  // ── hover chain ────────────────────────────────────────────────────────────
  const hoveredChain = React.useMemo(() => {
    if (!hoveredId || depsMode !== 'hover') return { up: new Set(), down: new Set() };
    const up = new Set(), down = new Set();
    const walkUp   = (id) => (projects.find(p => p.id === id)?.dependsOn || []).forEach(d => { up.add(d); walkUp(d); });
    const walkDown = (id) => (successors[id] || []).forEach(s => { down.add(s); walkDown(s); });
    walkUp(hoveredId); walkDown(hoveredId);
    return { up, down };
  }, [hoveredId, depsMode, projects, successors]);

  // ── metrics ────────────────────────────────────────────────────────────────
  const todayStr   = today.toISOString().slice(0, 10);
  const todayLabel = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  const allActive  = projects.filter(p => p.status !== 'done');
  const atRiskProjs  = allActive.filter(p => p.status === 'at-risk');
  const blockedProjs = allActive.filter(p => p.status === 'blocked');
  const activePgCount = programs.filter(pg => visibleProjects.some(p => p.programId === pg.id)).length || (visibleProjects.length > 0 ? 1 : 0);

  // ── timeline header ────────────────────────────────────────────────────────
  const { h1, h2 } = React.useMemo(() => {
    const h1 = [], h2 = [];
    const px = (d) => Math.round((d - viewStart) / 86400000 * dayPx);
    if (zoom === 'year') {
      let yd = new Date(viewStart); yd.setMonth(0, 1);
      while (px(yd) < totalWidth + dayPx * 366) { h1.push({ x: px(yd), label: String(yd.getFullYear()) }); yd.setFullYear(yd.getFullYear() + 1); }
      let qd = new Date(viewStart); qd.setDate(1); qd.setMonth(Math.floor(qd.getMonth() / 3) * 3);
      while (px(qd) < totalWidth + dayPx * 93) { h2.push({ x: px(qd), label: `Q${Math.floor(qd.getMonth() / 3) + 1}` }); qd.setMonth(qd.getMonth() + 3); }
    } else if (zoom === 'quarter') {
      let qd = new Date(viewStart); qd.setDate(1); qd.setMonth(Math.floor(qd.getMonth() / 3) * 3);
      while (px(qd) < totalWidth + dayPx * 93) { h1.push({ x: px(qd), label: `Q${Math.floor(qd.getMonth() / 3) + 1} ${qd.getFullYear()}` }); qd.setMonth(qd.getMonth() + 3); }
      let md = new Date(viewStart); md.setDate(1);
      while (px(md) < totalWidth + dayPx * 31) { h2.push({ x: px(md), label: md.toLocaleDateString('en-US', { month: 'short' }) }); md.setMonth(md.getMonth() + 1); }
    } else if (zoom === 'month') {
      let md = new Date(viewStart); md.setDate(1);
      while (px(md) < totalWidth + dayPx * 31) { h1.push({ x: px(md), label: md.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase() }); md.setMonth(md.getMonth() + 1); }
      let wd = new Date(viewStart); const dow = wd.getDay(); wd.setDate(wd.getDate() - (dow === 0 ? 6 : dow - 1));
      while (px(wd) < totalWidth) { if (px(wd) >= -50) h2.push({ x: px(wd), label: wd.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) }); wd.setDate(wd.getDate() + 7); }
    } else {
      let wd = new Date(viewStart); const dow = wd.getDay(); wd.setDate(wd.getDate() - (dow === 0 ? 6 : dow - 1));
      while (px(wd) < totalWidth) { h1.push({ x: px(wd), label: wd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }); wd.setDate(wd.getDate() + 7); }
      let dd = new Date(viewStart);
      while (px(dd) < totalWidth) { const x = px(dd); if (x >= 0) h2.push({ x, label: dd.toLocaleDateString('en-US', { weekday: 'narrow' }), weekend: dd.getDay() === 0 || dd.getDay() === 6 }); dd.setDate(dd.getDate() + 1); }
    }
    for (let i = 0; i < h1.length; i++) h1[i].w = i < h1.length - 1 ? h1[i + 1].x - h1[i].x : totalWidth - h1[i].x;
    return { h1, h2 };
  }, [zoom, viewStart.getTime(), dayPx, totalWidth]);

  const viewEnd    = new Date(viewStart.getTime() + rangeDays * 86400000);
  const rangeStr   = `${viewStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase()} → ${viewEnd.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase()}`;

  // ── row renderers ──────────────────────────────────────────────────────────
  const renderProgramRow = (row) => {
    const { pg, pgProjs } = row;
    const isCollapsed = collapsed[pg.id];
    const pgProgress  = pgProjs.length
      ? Math.round(pgProjs.reduce((s, p) => s + (projectProgress(state, p.id).pct || 0), 0) / pgProjs.length)
      : 0;
    const starts = pgProjs.map(p => p.startDate).filter(Boolean).sort();
    const ends   = pgProjs.map(p => p.dueDate).filter(Boolean).sort();
    const pgX1   = starts.length ? dateToX(starts[0]) : null;
    const pgX2   = ends.length   ? dateToX(ends[ends.length - 1]) : null;
    const pgW    = pgX1 != null && pgX2 != null ? Math.max(pgX2 - pgX1, 0) : 0;
    const pctColor = pgProgress < 25 ? 'var(--danger)' : pgProgress < 60 ? 'var(--warn)' : 'var(--ok)';

    return (
      <div key={pg.id} style={{ display: 'flex', height: RM.PROG_H, alignItems: 'stretch' }}>
        <div className="rm-label rm-label-program"
          onClick={() => setCollapsed(c => ({ ...c, [pg.id]: !c[pg.id] }))}>
          <Icon name={isCollapsed ? 'chevronR' : 'chevronD'} size={9} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={pg.description || undefined}>{pg.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>· {pgProjs.length}P</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: pctColor, flexShrink: 0, marginLeft: 5 }}>{pgProgress}%</span>
        </div>
        <div style={{ flex: 1, position: 'relative', minWidth: totalWidth }}>
          {pgW > 0 && pgX1 != null && (
            <div style={{
              position: 'absolute', left: pgX1, top: '50%', transform: 'translateY(-50%)',
              width: pgW, height: 6, borderRadius: 3, overflow: 'hidden',
              background: `color-mix(in oklch, ${pctColor} 25%, var(--bg-2))`,
              border: `1px solid color-mix(in oklch, ${pctColor} 40%, transparent)`,
            }}>
              <div style={{ width: `${pgProgress}%`, height: '100%', background: pctColor }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProjectRow = (row) => {
    const { proj } = row;
    const x1      = dateToX(proj.startDate);
    const x2      = dateToX(proj.dueDate);
    const barW    = x1 != null && x2 != null ? Math.max(x2 - x1, 40) : 0;
    const color   = STATUS_CLR[proj.status] || 'var(--accent)';
    const prog    = projectProgress(state, proj.id);
    const onCP    = showCritPath && criticalPath.has(proj.id);
    const overdue = proj.dueDate && proj.dueDate < todayStr && proj.status !== 'done';
    const isActive = state.meta.activeView === 'project' && state.meta.activeProjectId === proj.id;
    const indent   = !!proj.programId;
    const projMs   = showMilestones ? milestones.filter(m => m.projectId === proj.id) : [];
    const depCount = (proj.dependsOn || []).length;

    const isHovered    = hoveredId === proj.id;
    const inUpstream   = !!(hoveredId && hoveredChain.up.has(proj.id));
    const inDownstream = !!(hoveredId && hoveredChain.down.has(proj.id));
    const isDimmed     = depsMode === 'hover' && !!hoveredId && !isHovered && !inUpstream && !inDownstream;
    const outlineColor = inUpstream ? 'var(--ok)' : inDownstream ? 'var(--warn)' : null;
    const isDragging   = dragging?.projId === proj.id;
    const dragOffsetPx = isDragging ? dragging.deltaX : 0;
    const dragDays     = isDragging ? Math.round(dragging.deltaX / dayPx) : 0;

    return (
      <div key={proj.id} style={{ display: 'flex', height: RM.PROJ_H, alignItems: 'stretch' }}>
        <div
          className={`rm-label rm-label-project${isActive ? ' active' : ''}`}
          style={{ paddingLeft: indent ? 28 : 14, opacity: isDimmed ? 0.3 : 1, transition: 'opacity 150ms' }}
          onClick={() => actions.setMeta({ activeView: 'project', activeProjectId: proj.id })}
        >
          <span className={`sb-proj-dot pc-${proj.status}`} style={{ width: 8, height: 8, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--fg-2)', flexShrink: 0 }}>{proj.code}</span>
          <span className="rm-proj-name">{proj.name.split('—')[1]?.trim() || proj.name}</span>
          <span className="rm-proj-pct">{prog.pct}%</span>
        </div>

        <div
          style={{ flex: 1, position: 'relative', minWidth: totalWidth, opacity: isDimmed ? 0.2 : 1, transition: 'opacity 150ms' }}
          onMouseEnter={() => depsMode === 'hover' && setHoveredId(proj.id)}
          onMouseLeave={() => depsMode === 'hover' && setHoveredId(null)}
        >
          {x1 != null && barW > 0 && (
            <div
              title={isDragging && dragDays !== 0
                ? `${proj.name} · ${dragDays > 0 ? '+' : ''}${dragDays}d`
                : `${proj.name} · ${prog.pct}%${overdue ? ' · OVERDUE' : ''}`}
              style={{
                position: 'absolute', left: x1 + dragOffsetPx, top: barTop,
                width: barW, height: RM.BAR_H, borderRadius: 5, overflow: 'visible',
                cursor: isDragging ? 'grabbing' : 'grab',
                background: `color-mix(in oklch, ${color} 28%, transparent)`,
                border: `1px solid color-mix(in oklch, ${color} 55%, transparent)`,
                opacity: isDragging ? 0.85 : 1,
                transition: isDragging ? 'none' : 'opacity 150ms',
                boxShadow: isDragging
                  ? `0 4px 16px rgba(0,0,0,0.3), 0 0 0 2px ${color}`
                  : onCP
                    ? `0 0 0 2px var(--danger), inset 0 0 0 1px color-mix(in oklch, var(--danger) 30%, transparent)`
                    : outlineColor
                      ? `0 0 0 2px ${outlineColor}`
                      : overdue
                        ? `0 0 0 1.5px var(--danger)`
                        : 'none',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                didDragRef.current = false;
                setDragging({ projId: proj.id, startX: e.clientX, deltaX: 0 });
              }}
              onClick={() => {
                if (didDragRef.current) { didDragRef.current = false; return; }
                actions.setMeta({ activeView: 'project', activeProjectId: proj.id });
              }}
            >
              {/* Clipping container for progress fill (no overflow visible inside) */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${prog.pct}%`, background: `color-mix(in oklch, ${color} 68%, transparent)` }} />
              </div>

              {/* Bar label at bottom — left padding shifts right when bar extends off-screen left */}
              <div style={{
                position: 'absolute', inset: 0, overflow: 'hidden',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                paddingTop: 0, paddingRight: 8, paddingBottom: 5,
                paddingLeft: Math.max(8, ganttScroll - x1 + 10),
                pointerEvents: 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                  {depCount > 0 && (
                    <span style={{
                      fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600,
                      color: 'var(--fg-2)', background: 'color-mix(in oklch, var(--bg) 55%, transparent)',
                      padding: '1px 4px', borderRadius: 3, flexShrink: 0, lineHeight: 1.5,
                    }}>↵ {depCount}</span>
                  )}
                  {barW > 60 && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {proj.code}{barW > 130 ? ` · ${proj.name.split('—')[1]?.trim() || proj.name}` : ''}
                    </span>
                  )}
                </div>
                {barW > 80 && (
                  <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--fg-2)', flexShrink: 0, marginLeft: 4 }}>{prog.pct}%</span>
                )}
              </div>

              {/* Drag delta indicator */}
              {isDragging && dragDays !== 0 && (
                <div style={{
                  position: 'absolute', left: '50%', top: -20, transform: 'translateX(-50%)',
                  background: 'var(--bg)', border: '1px solid var(--line)',
                  fontSize: 9.5, fontFamily: 'var(--font-mono)', fontWeight: 600,
                  color: dragDays > 0 ? 'var(--warn)' : 'var(--ok)',
                  padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10,
                }}>{dragDays > 0 ? '+' : ''}{dragDays}d</div>
              )}

              {/* Milestone diamonds — at top of bar */}
              {projMs.map(m => {
                const mx = dateToX(m.date);
                if (mx == null) return null;
                const relX = mx - x1; // relative to bar left
                if (relX < -4 || relX > barW + 4) return null;
                const done = m.status === 'done';
                return (
                  <div key={m.id} title={m.name} style={{
                    position: 'absolute',
                    left: relX - RM.MS_H / 2,
                    top: -RM.MS_H / 2 + 1,
                    transform: 'rotate(45deg)',
                    width: RM.MS_H, height: RM.MS_H,
                    borderRadius: 1.5,
                    background: done ? RM.MS_DONE : RM.MS_CLR,
                    border: '1.5px solid var(--bg)',
                    zIndex: 3, cursor: 'default', flexShrink: 0,
                  }} />
                );
              })}
            </div>
          )}

          {/* Milestones outside bar */}
          {projMs.map(m => {
            const mx = dateToX(m.date);
            if (mx == null) return null;
            if (x1 != null && mx >= x1 - 4 && mx <= x1 + barW + 4) return null;
            const done = m.status === 'done';
            return (
              <div key={`ext-${m.id}`} title={m.name} style={{
                position: 'absolute', left: mx - RM.MS_H / 2, top: barTop - RM.MS_H / 2 + 1,
                transform: 'rotate(45deg)', width: RM.MS_H, height: RM.MS_H,
                borderRadius: 1.5, background: done ? RM.MS_DONE : RM.MS_CLR,
                border: '1.5px solid var(--bg)', zIndex: 3,
              }} />
            );
          })}
        </div>
      </div>
    );
  };

  // ── dep arrows SVG ─────────────────────────────────────────────────────────
  const depEdges = [];
  rows.filter(r => r.type === 'project').forEach(r => {
    (r.proj.dependsOn || []).forEach(depId => {
      const from = projects.find(p => p.id === depId);
      if (!from || rowY[depId] == null || rowY[r.proj.id] == null) return;
      const ex1 = dateToX(from.dueDate), ex2 = dateToX(r.proj.startDate);
      if (ex1 == null || ex2 == null) return;
      depEdges.push({ fromId: depId, toId: r.proj.id, x1: ex1, y1: rowY[depId], x2: ex2, y2: rowY[r.proj.id], isViolation: violations.has(`${depId}-${r.proj.id}`) });
    });
  });

  const renderArrows = () => {
    if (rowsHeight <= 0) return null;
    return (
      <svg style={{ position: 'absolute', left: RM.LABEL_W, top: 0, width: totalWidth, height: Math.max(rowsHeight, 1), pointerEvents: 'none', overflow: 'visible', zIndex: 4 }}>
        <defs>
          {[['n','color-mix(in oklch, var(--fg-3) 55%, transparent)'],['ok','var(--ok)'],['warn','var(--warn)'],['danger','var(--danger)']].map(([id, fill]) => (
            <marker key={id} id={`rm-arr-${id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,1 L0,5 L5,3 Z" fill={fill} />
            </marker>
          ))}
        </defs>

        {depEdges.map(({ fromId, toId, x1, y1, x2, y2, isViolation }) => {
          let opacity = 0, stroke = 'color-mix(in oklch, var(--fg-3) 55%, transparent)', dash = '5 3', markerId = 'n', strokeW = 1.5;

          if (isViolation) {
            if (!showViolations) return null;
            opacity = 1; stroke = 'var(--danger)'; dash = '0'; markerId = 'danger'; strokeW = 2;
          } else if (depsMode === 'always') {
            opacity = 0.45;
          } else if (depsMode === 'hover' && hoveredId) {
            const chain = fromId === hoveredId || toId === hoveredId
              || (hoveredChain.up.has(fromId) && (toId === hoveredId || hoveredChain.up.has(toId)))
              || (hoveredChain.down.has(toId) && (fromId === hoveredId || hoveredChain.down.has(fromId)));
            if (chain) {
              opacity = 0.85;
              if (hoveredChain.up.has(fromId) || fromId === hoveredId) { stroke = 'var(--ok)'; markerId = 'ok'; }
              else { stroke = 'var(--warn)'; markerId = 'warn'; }
            }
          }

          if (opacity === 0) return null;
          const dx = Math.max(22, Math.abs(x2 - x1) * 0.38);
          return (
            <path key={`${fromId}-${toId}`}
              d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
              fill="none" stroke={stroke} strokeWidth={strokeW} strokeDasharray={dash} opacity={opacity}
              markerEnd={`url(#rm-arr-${markerId})`}
            />
          );
        })}

        {/* Critical path dashed overlay */}
        {showCritPath && (() => {
          const ids = [...criticalPath];
          return ids.slice(0, -1).map((fromId, i) => {
            const toId = ids[i + 1];
            const fp = projects.find(p => p.id === fromId), tp = projects.find(p => p.id === toId);
            if (!fp || !tp || rowY[fromId] == null || rowY[toId] == null) return null;
            const cx1 = dateToX(fp.dueDate), cx2 = dateToX(tp.startDate);
            if (cx1 == null || cx2 == null) return null;
            const dx = Math.max(22, Math.abs(cx2 - cx1) * 0.38);
            return (
              <path key={`cp-${fromId}-${toId}`}
                d={`M ${cx1} ${rowY[fromId]} C ${cx1 + dx} ${rowY[fromId]}, ${cx2 - dx} ${rowY[toId]}, ${cx2} ${rowY[toId]}`}
                fill="none" stroke="var(--danger)" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.65"
                markerEnd="url(#rm-arr-danger)"
              />
            );
          }).filter(Boolean);
        })()}
      </svg>
    );
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="roadmap">

      {/* Page header — matches Tasks / Risks / Portfolio pattern */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="title-h1">Project roadmap</div>
            <div className="title-sub">
              {allActive.length} active project{allActive.length !== 1 ? 's' : ''} across {activePgCount} program{activePgCount !== 1 ? 's' : ''}
              <span style={{ marginLeft: 10, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-4)' }}>{rangeStr}</span>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', flexShrink: 0 }}>{todayLabel}</div>
        </div>

        {/* KPI metrics — matches Tasks / Risks grid pattern */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { label: 'ACTIVE',   val: allActive.length,   sub: `across ${activePgCount} program${activePgCount !== 1 ? 's' : ''}`, valClr: null },
            { label: 'ON TRACK', val: allActive.filter(p => p.status === 'on-track').length, sub: `of ${allActive.length} active`, valClr: 'var(--ok)' },
            { label: 'AT RISK',  val: atRiskProjs.length,  sub: atRiskProjs.slice(0,2).map(p=>p.code.toLowerCase()).join(' · ') || 'none', valClr: 'var(--warn)' },
            { label: 'BLOCKED',  val: blockedProjs.length, sub: blockedProjs.slice(0,2).map(p=>p.code.toLowerCase()).join(' · ') || 'none', valClr: 'var(--danger)' },
            { label: 'DONE',     val: projects.filter(p => p.status === 'done').length, sub: 'total', valClr: 'var(--fg-3)' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--bg-1)', padding: '10px 14px' }}>
              <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: m.valClr || 'var(--fg)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{m.val}</div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-4)', marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt card — matches Calendar's bordered container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>

      {/* Controls */}
      <div className="roadmap-controls">
        <div className="rm-zoom-group">
          {['week', 'month', 'quarter', 'year'].map(z => (
            <button key={z} className={`btn btn-sm${zoom === z ? ' btn-primary' : ''}`}
              style={{ fontSize: 11, textTransform: 'capitalize' }} onClick={() => setZoom(z)}>{z}</button>
          ))}
        </div>

        {programs.length > 0 && (
          <div className="rm-filter-group">
            <button className={`btn btn-sm${!programFilter ? ' btn-primary' : ''}`} style={{ fontSize: 11 }} onClick={() => setFilter(null)}>All</button>
            {programs.map(pg => {
              const code = pg.name.split('.')[0]; // "P1", "P2", etc.
              return (
                <button key={pg.id} className={`btn btn-sm${programFilter === pg.id ? ' btn-primary' : ''}`}
                  style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                  title={pg.name}
                  onClick={() => setFilter(programFilter === pg.id ? null : pg.id)}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                  {code}{programFilter === pg.id && <span style={{ opacity: 0.6, marginLeft: 1 }}>×</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="rm-toggles">
          <button className={`btn btn-sm${showMilestones ? ' btn-primary' : ''}`}
            style={{ fontSize: 11 }} onClick={() => setShowMs(v => !v)}>
            ◆ Milestones
          </button>
          <button className={`btn btn-sm${showCritPath ? ' btn-primary' : ''}`}
            style={{ fontSize: 11 }} onClick={() => setShowCP(v => !v)}>
            — Critical path
          </button>
          {violations.size > 0 && (
            <button className={`btn btn-sm${showViolations ? ' btn-primary' : ''}`}
              style={{ fontSize: 11 }} onClick={() => setShowViol(v => !v)}>
              ⚠ Violations
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>DEPS</span>
            <div className="rm-seg">
              {['Hover', 'Always', 'Off'].map(m => (
                <button key={m} className={`rm-seg-btn${depsMode === m.toLowerCase() ? ' active' : ''}`}
                  onClick={() => setDepsMode(m.toLowerCase())}>{m}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gantt body */}
      <div className="roadmap-body" ref={bodyRef} onScroll={e => setGanttScroll(e.currentTarget.scrollLeft)}>

        {/* Sticky header */}
        <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', minWidth: RM.LABEL_W + totalWidth }}>
          <div style={{ width: RM.LABEL_W, flexShrink: 0, height: RM.HDR_H, position: 'sticky', left: 0, zIndex: 11, background: 'var(--bg-2)', borderRight: '1px solid var(--line)', display: 'flex', alignItems: 'flex-end', padding: '0 14px 8px', gap: 8 }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Project</span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-4)', marginLeft: 'auto' }}>↓ Start</span>
          </div>
          <div style={{ flex: 1, position: 'relative', minWidth: totalWidth, height: RM.HDR_H }}>
            <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: Math.max(dayPx, 2), background: 'color-mix(in oklch, var(--accent) 8%, transparent)', pointerEvents: 'none', zIndex: 0 }} />
            {h1.map((seg, i) => (
              <div key={i} style={{
                position: 'absolute', left: Math.max(0, seg.x), top: 0, height: RM.HDR_H / 2,
                fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--fg-2)',
                paddingLeft: 7, display: 'flex', alignItems: 'center',
                borderLeft: i > 0 ? '1px solid var(--line)' : 'none',
                whiteSpace: 'nowrap', pointerEvents: 'none',
              }}>{seg.label}</div>
            ))}
            {h2.map((tick, i) => (
              <div key={i} style={{
                position: 'absolute', left: tick.x, top: RM.HDR_H / 2, height: RM.HDR_H / 2,
                fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--fg-4)', paddingLeft: 3,
                display: 'flex', alignItems: 'center',
                borderLeft: '1px solid color-mix(in oklch, var(--line) 50%, transparent)',
                whiteSpace: 'nowrap', pointerEvents: 'none', opacity: tick.weekend ? 0.4 : 0.8,
              }}>{tick.label}</div>
            ))}
            {/* TODAY pill */}
            <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, background: 'var(--accent)', zIndex: 2 }}>
              <div style={{
                position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--accent)', color: '#fff',
                fontSize: 8.5, fontFamily: 'var(--font-mono)', fontWeight: 700,
                letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 4,
                whiteSpace: 'nowrap', lineHeight: 1.6, boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}>TODAY · {today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}</div>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div style={{ position: 'relative' }}>
          {h1.map((seg, i) => i > 0 && (
            <div key={`h1g-${i}`} style={{ position: 'absolute', left: RM.LABEL_W + seg.x, top: 0, bottom: 0, width: 1, background: 'var(--line)', pointerEvents: 'none', zIndex: 0 }} />
          ))}
          {h2.map((tick, i) => (
            <div key={`h2g-${i}`} style={{ position: 'absolute', left: RM.LABEL_W + tick.x, top: 0, bottom: 0, width: 1, background: `color-mix(in oklch, var(--line) ${tick.weekend ? 32 : 45}%, transparent)`, pointerEvents: 'none', zIndex: 0 }} />
          ))}
          <div style={{ position: 'absolute', left: RM.LABEL_W + todayX, top: 0, bottom: 0, width: Math.max(dayPx, 2), background: 'color-mix(in oklch, var(--accent) 5%, transparent)', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'absolute', left: RM.LABEL_W + todayX, top: 0, bottom: 0, width: 2, background: 'color-mix(in oklch, var(--accent) 65%, transparent)', pointerEvents: 'none', zIndex: 1 }} />

          {rows.map((row, idx) => {
            if (row.type === 'divider') return (
              <div key={`div-${idx}`} style={{ display: 'flex', height: 12 }}>
                <div style={{ width: RM.LABEL_W, flexShrink: 0, position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 2, borderRight: '1px solid var(--line)' }} />
                <div style={{ flex: 1, minWidth: totalWidth, borderTop: '1px dashed color-mix(in oklch, var(--line) 70%, transparent)', marginTop: 6 }} />
              </div>
            );
            if (row.type === 'program') return renderProgramRow(row);
            if (row.type === 'project') return renderProjectRow(row);
            return null;
          })}

          {renderArrows()}
        </div>

        {rows.length === 0 && (
          <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--fg-4)' }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No projects</div>
            <div style={{ fontSize: 12 }}>
              {programFilter
                ? <span>No projects in this program. <button className="btn btn-sm" style={{ marginLeft: 6 }} onClick={() => setFilter(null)}>Show all</button></span>
                : 'Create a project to get started.'}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="rm-legend">
        <span className="rm-leg-item"><span className="rm-leg-dot" style={{ background: 'var(--ok)' }} />On track</span>
        <span className="rm-leg-item"><span className="rm-leg-dot" style={{ background: 'var(--warn)' }} />At risk</span>
        <span className="rm-leg-item"><span className="rm-leg-dot" style={{ background: 'var(--danger)' }} />Blocked</span>
        <span className="rm-leg-item"><span className="rm-leg-dot" style={{ background: 'var(--fg-4)' }} />Done</span>
        <span className="rm-leg-item">
          <span style={{ width: 7, height: 7, background: 'oklch(65% 0.10 280)', display: 'inline-block', transform: 'rotate(45deg)', borderRadius: 1, flexShrink: 0 }} />Milestone
        </span>
        <span className="rm-leg-item">
          <svg width="18" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="var(--accent)" strokeWidth="2" /></svg>Today
        </span>
        <span className="rm-leg-item">
          <svg width="18" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="var(--danger)" strokeWidth="1.5" strokeDasharray="5 2" /></svg>Critical path
        </span>
        {violations.size > 0 && (
          <span className="rm-leg-item" style={{ color: 'var(--danger)' }}>
            <svg width="18" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="var(--danger)" strokeWidth="2" /></svg>Dep violation
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--fg-4)' }}>Click bar to open · hover for deps</span>
      </div>

      </div> {/* end gantt card */}
    </div>
  );
}
