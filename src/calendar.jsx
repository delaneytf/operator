// Calendar / cross-project timeline.

const { useState: useStateCal, useMemo: useMemoCal, useRef: useRefCal, useEffect: useEffectCal } = React;

function expandMeetingInstances(meeting, firstDate, lastDate) {
  const rec = meeting.recurrence || 'none';
  if (rec === 'none') {
    return meeting.date >= firstDate && meeting.date <= lastDate ? [meeting] : [];
  }
  const step = (d) => {
    const n = new Date(d);
    if (rec === 'weekly') n.setDate(n.getDate() + 7);
    else if (rec === 'biweekly') n.setDate(n.getDate() + 14);
    else if (rec === 'monthly') n.setMonth(n.getMonth() + 1);
    return n;
  };
  const base = new Date(meeting.date + 'T00:00:00');
  const first = new Date(firstDate + 'T00:00:00');
  const last = new Date(lastDate + 'T00:00:00');
  if (base > last) return [];
  // Advance from base to first occurrence on or after the visible window
  let cur = new Date(base);
  while (cur < first) cur = step(cur);
  const results = [];
  while (cur <= last) {
    results.push({ ...meeting, date: cur.toISOString().slice(0, 10) });
    cur = step(cur);
  }
  return results;
}

function CalendarView({ state, onOpenMeeting }) {
  const [range, setRange] = useStateCal(14); // days in view window
  const [anchor, setAnchor] = useStateCal(-3); // days offset from today
  const [filter, setFilter] = useStateCal({ priority: null, projects: null });
  const [showKinds, setShowKinds] = useStateCal({ workload: true, tasks: true, milestones: true, meetings: true, reminders: true });
  const [hideDays, setHideDays] = useStateCal(new Set()); // day-of-week numbers to hide (0=Sun..6=Sat)
  const [selectedProjIds, setSelectedProjIds] = useStateCal(new Set()); // empty = all
  const [openDropdown, setOpenDropdown] = useStateCal(null); // 'proj'|'range'|'days'|'elements'|null
  const [reminderModal, setReminderModal] = useStateCal(null);
  const [dayNoteModal, setDayNoteModal] = useStateCal(null);
  const [calModal, setCalModal] = useStateCal(null);
  const [calModalEdit, setCalModalEdit] = useStateCal(false);
  const [calMsEditDraft, setCalMsEditDraft] = useStateCal(null);
  const [calDecEditDraft, setCalDecEditDraft] = useStateCal(null);
  const [tooltip, setTooltip] = useStateCal(null);
  const [containerWidth, setContainerWidth] = useStateCal(0);
  const [calDrag, setCalDrag] = useStateCal(null);
  const [dragOverDate, setDragOverDate] = useStateCal(null);
  const gridRef = useRefCal(null);
  const wrapRef = useRefCal(null);
  const dropdownRef = useRefCal(null);

  const startDate = useMemoCal(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + anchor);
    return d;
  }, [anchor]);

  const days = useMemoCal(() => {
    const arr = [];
    for (let i = 0; i < range; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      if (!hideDays.has(d.getDay())) arr.push({ date: localIso(d), d });
    }
    return arr;
  }, [startDate, range, hideDays]);

  // Full-range last day (for date range display regardless of day filtering)
  const rangeEndDate = useMemoCal(() => {
    const d = new Date(startDate); d.setDate(d.getDate() + range - 1); return localIso(d);
  }, [startDate, range]);

  const allProjects = state.projects.filter(p => p.status !== 'done');
  const projects = allProjects.filter(p => selectedProjIds.size === 0 || selectedProjIds.has(p.id) || selectedProjIds.has(p.programId));
  const reminders = state.reminders || [];
  const dayNotes = state.dayNotes || [];

  // Close dropdown on outside click
  useEffectCal(() => {
    if (!openDropdown) return;
    const onDown = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenDropdown(null); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openDropdown]);

  // Measure container width, recalculate DAY_W to fill available space
  useEffectCal(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // Day width — fills container width, min 24px
  const nDays = days.length || 1;
  const DAY_W = containerWidth > 0
    ? Math.max(24, Math.floor((containerWidth - 184) / nDays))
    : (nDays > 35 ? 28 : nDays > 21 ? 40 : 52);

  const posFor = (dateISO) => {
    const idx = days.findIndex((d) => d.date === dateISO);
    return idx < 0 ? null : idx * DAY_W;
  };

  const dateFromLaneX = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.min(Math.max(Math.floor(x / DAY_W), 0), range - 1);
    return days[idx]?.date || null;
  };

  const onLaneDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateFromLaneX(e));
  };

  const onLaneDrop = (e) => {
    e.preventDefault();
    const newDate = dateFromLaneX(e);
    if (!calDrag || !newDate) { setCalDrag(null); setDragOverDate(null); return; }
    if (calDrag.kind === 'task') actions.updateTask(calDrag.id, { dueDate: newDate });
    else if (calDrag.kind === 'milestone') actions.updateMilestone(calDrag.id, { date: newDate });
    else if (calDrag.kind === 'meeting') actions.updateMeeting(calDrag.id, { date: newDate });
    else if (calDrag.kind === 'reminder') actions.updateReminder(calDrag.id, { date: newDate, title: calDrag.title, note: calDrag.note });
    setCalDrag(null);
    setDragOverDate(null);
  };

  const onLaneDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverDate(null);
  };

  const dragHighlight = (date) =>
    dragOverDate === date
      ? { background: 'color-mix(in oklch, var(--accent) 14%, transparent)' }
      : {};

  const laneFor = (proj) => {
    const tasks = state.tasks.filter((t) => t.projectId === proj.id && t.dueDate);
    const milestones = state.milestones.filter((m) => m.projectId === proj.id);

    const items = [];
    if (showKinds.tasks) tasks.forEach((t) => items.push({ kind: 'task', date: t.dueDate, data: t }));
    if (showKinds.milestones) milestones.forEach((m) => items.push({ kind: 'milestone', date: m.date, data: m }));

    return items.filter((i) => posFor(i.date) !== null);
  };

  const todayIdx = days.findIndex((d) => d.date === localIso());

  // Workload per visible day — same computation path as project task positioning
  const workloadByDate = {};
  state.tasks.forEach((t) => {
    if (t.dueDate && t.status !== 'done' && posFor(t.dueDate) !== null) {
      workloadByDate[t.dueDate] = (workloadByDate[t.dueDate] || 0) + (t.estimate || 1);
    }
  });

  // Reminders visible in this range
  const visibleReminders = showKinds.reminders
    ? reminders.filter((r) => posFor(r.date) !== null)
    : [];
  const remSlotMap = {};
  const placedReminders = visibleReminders.map((r) => {
    const slot = remSlotMap[r.date] ?? 0;
    remSlotMap[r.date] = slot + 1;
    return { ...r, slot };
  });
  const remMaxSlot = placedReminders.length ? Math.max(...placedReminders.map((r) => r.slot)) : 0;
  const remLaneH = Math.max(36, 8 + (remMaxSlot + 1) * 22);

  const openReminderNew = (date) => setReminderModal({ date, title: '', note: '' });
  const openReminderEdit = (r) => setReminderModal({ id: r.id, date: r.date, title: r.title, note: r.note || '' });
  const saveReminder = () => {
    if (!reminderModal.title.trim()) return;
    if (reminderModal.id) {
      actions.updateReminder(reminderModal.id, { date: reminderModal.date, title: reminderModal.title, note: reminderModal.note });
    } else {
      actions.addReminder({ date: reminderModal.date, title: reminderModal.title, note: reminderModal.note });
    }
    setReminderModal(null);
  };

  const openDayNote = (date) => {
    const existing = dayNotes.find((n) => n.date === date);
    setDayNoteModal({ date, body: existing?.body || '' });
  };
  const saveDayNote = () => {
    if (dayNoteModal.body.trim()) {
      actions.saveDayNote(dayNoteModal.date, dayNoteModal.body);
    } else {
      actions.deleteDayNote(dayNoteModal.date);
    }
    setDayNoteModal(null);
  };

  const dayNoteMap = {};
  dayNotes.forEach((n) => { dayNoteMap[n.date] = n.body; });

  // Shared dropdown renderer
  const programs = state.programs || [];
  const standaloneProjs = allProjects.filter(p => !p.programId || !programs.find(pg => pg.id === p.programId));
  const isAllProjs = selectedProjIds.size === 0;
  const projFilterLabel = isAllProjs ? 'All projects' : (() => {
    const parts = [];
    programs.forEach(pg => { if (selectedProjIds.has(pg.id)) parts.push(pg.name.split('.')[0]); });
    standaloneProjs.forEach(p => { if (selectedProjIds.has(p.id)) parts.push(p.code); });
    return parts.length <= 2 ? parts.join(', ') : `${parts.slice(0, 2).join(', ')} +${parts.length - 2}`;
  })();
  const toggleProjId = (id) => setSelectedProjIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hideDaysLabel = hideDays.size === 0 ? 'All days' : hideDays.size >= 6 ? '1 day' : `Hide ${[...hideDays].map(d => DOW[d]).join(', ')}`;

  const ELEMENTS = [['workload','Workload'],['tasks','Tasks'],['milestones','Milestones'],['meetings','Meetings'],['reminders','Reminders']];
  const visibleCount = ELEMENTS.filter(([k]) => showKinds[k]).length;
  const elementsLabel = visibleCount === ELEMENTS.length ? 'All' : visibleCount === 0 ? 'None' : `${visibleCount} shown`;

  const RANGES = [7, 14];
  const rangeLabel = range === 7 ? '1 week' : '2 weeks';

  const DDCheckRow = ({ checked, onClick, children }) => (
    <button className="btn btn-ghost btn-sm"
      style={{ width: '100%', justifyContent: 'flex-start', padding: '5px 12px', borderRadius: 0, fontSize: 11, gap: 7 }}
      onClick={onClick}>
      <span style={{ width: 14, height: 14, borderRadius: 3, border: '1.5px solid var(--line)', background: checked ? 'var(--accent)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {checked && <Icon name="check" size={9} style={{ color: '#fff' }} />}
      </span>
      {children}
    </button>
  );

  const DDPanel = ({ name, children }) => openDropdown === name ? (
    <div ref={dropdownRef} style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 200, background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', minWidth: 200, padding: '6px 0' }}>
      {children}
    </div>
  ) : null;

  return (
    <div>
      <div className="cal-toolbar">
        {/* Row 1: navigation */}
        <div className="row-flex">
          <button className="btn btn-sm" onClick={() => setAnchor(anchor - range)}><Icon name="chevronL" size={10} /> {rangeLabel}</button>
          <button className="btn btn-sm" onClick={() => setAnchor(-3)}>Today</button>
          <button className="btn btn-sm" onClick={() => setAnchor(anchor + range)}>{rangeLabel} <Icon name="chevronR" size={10} /></button>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 10 }}>
            {fmtDate(days[0]?.date || localIso(startDate))} — {fmtDate(rangeEndDate)}
          </span>
        </div>
        {/* Row 2: dropdowns + actions */}
        <div className="row-flex" style={{ flexWrap: 'wrap' }}>
          {/* Range dropdown */}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-sm" style={{ fontSize: 11, gap: 5 }} onClick={() => setOpenDropdown(o => o === 'range' ? null : 'range')}>
              <Icon name="calendar" size={10} /> {rangeLabel} <Icon name={openDropdown === 'range' ? 'chevronD' : 'chevronR'} size={9} />
            </button>
            <DDPanel name="range">
              <div style={{ padding: '4px 12px 2px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)' }}>Range</div>
              {RANGES.map(r => (
                <button key={r} className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '5px 12px', borderRadius: 0, fontSize: 11, fontWeight: range === r ? 700 : 400 }}
                  onClick={() => { setRange(r); setOpenDropdown(null); }}>
                  {range === r && <Icon name="check" size={10} />} {r === 7 ? '1 week' : '2 weeks'}
                </button>
              ))}
            </DDPanel>
          </div>

          {/* Days dropdown */}
          <div style={{ position: 'relative' }}>
            <button className={`btn btn-sm${hideDays.size > 0 ? ' btn-primary' : ''}`} style={{ fontSize: 11, gap: 5 }} onClick={() => setOpenDropdown(o => o === 'days' ? null : 'days')}>
              <Icon name="calendar" size={10} /> {hideDaysLabel} <Icon name={openDropdown === 'days' ? 'chevronD' : 'chevronR'} size={9} />
            </button>
            <DDPanel name="days">
              <div style={{ padding: '4px 12px 2px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)' }}>Days to show</div>
              <DDCheckRow checked={hideDays.size === 0} onClick={() => setHideDays(new Set())}>All days</DDCheckRow>
              {DOW.map((name, idx) => (
                <DDCheckRow key={idx} checked={!hideDays.has(idx)} onClick={() => setHideDays(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; })}>
                  {name}
                </DDCheckRow>
              ))}
            </DDPanel>
          </div>

          {/* Elements dropdown */}
          <div style={{ position: 'relative' }}>
            <button className={`btn btn-sm${visibleCount < ELEMENTS.length ? ' btn-primary' : ''}`} style={{ fontSize: 11, gap: 5 }} onClick={() => setOpenDropdown(o => o === 'elements' ? null : 'elements')}>
              <Icon name="filter" size={10} /> {elementsLabel} <Icon name={openDropdown === 'elements' ? 'chevronD' : 'chevronR'} size={9} />
            </button>
            <DDPanel name="elements">
              <div style={{ padding: '4px 12px 2px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)' }}>Show elements</div>
              {ELEMENTS.map(([k, label]) => (
                <DDCheckRow key={k} checked={showKinds[k]} onClick={() => setShowKinds(prev => ({ ...prev, [k]: !prev[k] }))}>
                  {label}
                </DDCheckRow>
              ))}
            </DDPanel>
          </div>

          {/* Project filter dropdown */}
          {(programs.length > 0 || standaloneProjs.length > 0) && (
            <div style={{ position: 'relative' }}>
              <button className={`btn btn-sm${!isAllProjs ? ' btn-primary' : ''}`} style={{ fontSize: 11, gap: 5 }} onClick={() => setOpenDropdown(o => o === 'proj' ? null : 'proj')}>
                <Icon name="filter" size={10} /> {projFilterLabel} <Icon name={openDropdown === 'proj' ? 'chevronD' : 'chevronR'} size={9} />
              </button>
              <DDPanel name="proj">
                <DDCheckRow checked={isAllProjs} onClick={() => { setSelectedProjIds(new Set()); setOpenDropdown(null); }}>All projects</DDCheckRow>
                {programs.length > 0 && <div style={{ padding: '4px 12px 2px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginTop: 2 }}>Programs</div>}
                {programs.map(pg => (
                  <DDCheckRow key={pg.id} checked={selectedProjIds.has(pg.id)} onClick={() => toggleProjId(pg.id)}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    {pg.name}
                  </DDCheckRow>
                ))}
                {standaloneProjs.length > 0 && <div style={{ padding: '4px 12px 2px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginTop: 2 }}>Standalone projects</div>}
                {standaloneProjs.map(p => (
                  <DDCheckRow key={p.id} checked={selectedProjIds.has(p.id)} onClick={() => toggleProjId(p.id)}>
                    <span className={`sb-proj-dot pc-${p.status}`} style={{ width: 7, height: 7, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700 }}>{p.code}</span>
                    <span className="truncate">{p.name.split('—')[1]?.trim() || p.name}</span>
                  </DDCheckRow>
                ))}
              </DDPanel>
            </div>
          )}

          <button className="btn btn-sm btn-primary" onClick={() => openReminderNew(days[Math.max(0, todayIdx)]?.date || localIso())}>
            <Icon name="plus" size={11} /> Reminder
          </button>
          <button className="btn btn-sm" onClick={() => { const ics = iCalExport(state); downloadFile('operator-milestones.ics', ics, 'text/calendar'); }}>
            <Icon name="download" size={11} /> iCal
          </button>
        </div>
      </div>

      <div className="cal-wrap" ref={wrapRef} style={{ overflow: 'auto', maxHeight: 'none' }}>
        <div className="cal-frame" ref={gridRef}>
          {/* Date header */}
          <div className="cal-header" style={{ gridTemplateColumns: `180px repeat(${nDays}, ${DAY_W}px)` }}>
            <div className="cal-corner">
              <span className="mono" style={{ color: 'var(--fg-4)', fontSize: 10.5 }}>{projects.length} projects</span>
            </div>
            {days.map((d, i) => {
              const isWeekend = d.d.getDay() === 0 || d.d.getDay() === 6;
              const isMonthStart = d.d.getDate() === 1;
              const isToday = i === todayIdx;
              return (
                <div key={d.date} className={`cal-colh ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''} ${isMonthStart ? 'mstart' : ''}`}>
                  {isMonthStart && <div className="cal-month-tag">{d.d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</div>}
                  <div className="cal-dow">{d.d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                  <div className="cal-dom">{d.d.getDate()}</div>
                </div>
              );
            })}
          </div>


          {/* Workload row */}
          {showKinds.workload && (
          <div className="cal-row" style={{ gridTemplateColumns: `180px repeat(${nDays}, ${DAY_W}px)`, minHeight: 44, background: 'color-mix(in oklch, var(--bg-3) 50%, transparent)' }}>
            <div className="cal-lane-label">
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Workload</span>
            </div>
            <div className="cal-lane-body" style={{ gridColumn: `2 / span ${nDays}`, minHeight: 44 }}>
              <div className="cal-lane-grid" style={{ gridTemplateColumns: `repeat(${nDays}, ${DAY_W}px)` }}>
                {days.map((d, i) => (
                  <div key={d.date} className={`cal-cell${d.d.getDay()===0||d.d.getDay()===6?' weekend':''}${i===todayIdx?' today':''}`} />
                ))}
              </div>
              {Object.entries(workloadByDate).map(([date, hours]) => {
                const left = posFor(date);
                if (left === null) return null;
                const over = hours > 6;
                const h = Math.min(36, Math.round((hours / 8) * 36));
                return (
                  <div key={date} style={{
                    position: 'absolute',
                    left: left + 2,
                    bottom: 2,
                    width: DAY_W - 4,
                    height: Math.max(2, h),
                    background: over ? 'var(--danger)' : hours > 4 ? 'var(--warn)' : 'var(--fg-4)',
                    borderRadius: '2px 2px 0 0',
                    opacity: 0.75,
                  }} title={`${hours}h due`} />
                );
              })}
            </div>
          </div>
          )}

          {/* Reminders row */}
          {showKinds.reminders && (
            <div className="cal-row cal-rem-row" style={{ gridTemplateColumns: `180px repeat(${nDays}, ${DAY_W}px)` }}>
              <div className="cal-lane-label">
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reminders</span>
                <button className="icon-btn" style={{ marginLeft: 4 }} title="Add reminder" onClick={() => openReminderNew(days[Math.max(0, todayIdx)].date)}>
                  <Icon name="plus" size={10} />
                </button>
              </div>
              <div className="cal-lane-body" style={{ gridColumn: `2 / span ${nDays}`, position: 'relative', minHeight: remLaneH }}
                onDragOver={onLaneDragOver} onDrop={onLaneDrop} onDragLeave={onLaneDragLeave}>
                <div className="cal-lane-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${nDays}, ${DAY_W}px)` }}>
                  {days.map((d, i) => {
                    const isWeekend = d.d.getDay() === 0 || d.d.getDay() === 6;
                    const isToday = i === todayIdx;
                    return (
                      <div key={d.date} className={`cal-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
                        style={{ cursor: 'pointer', ...dragHighlight(d.date) }}
                        title={`Add reminder on ${d.date}`}
                        onClick={() => openReminderNew(d.date)}
                      />
                    );
                  })}
                </div>
                {placedReminders.map((r) => {
                  const left = posFor(r.date);
                  if (left === null) return null;
                  const top = 4 + r.slot * 22;
                  const isDragging = calDrag?.id === r.id;
                  return (
                    <div key={r.id} className="cal-item cal-reminder" style={{ left: left + 2, top, width: DAY_W - 4, opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setCalDrag({ kind: 'reminder', id: r.id, date: r.date, title: r.title, note: r.note }); setTooltip(null); }}
                      onDragEnd={() => { setCalDrag(null); setDragOverDate(null); }}
                      onClick={(e) => { e.stopPropagation(); openReminderEdit(r); }}
                      onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setTooltip({ kind: 'reminder', data: r, x: rect.left, y: rect.bottom + 6 }); }}
                      onMouseLeave={() => setTooltip(null)}>
                      <Icon name="bell" size={9} />
                      <span className="truncate">{r.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Meetings row */}
          {showKinds.meetings && (state.meetings || []).length > 0 && (
            <div className="cal-row" style={{ gridTemplateColumns: `180px repeat(${nDays}, ${DAY_W}px)`, minHeight: 36 }}>
              <div className="cal-lane-label">
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meetings</span>
              </div>
              <div className="cal-lane-body" style={{ gridColumn: `2 / span ${nDays}`, position: 'relative', minHeight: 36 }}
                onDragOver={onLaneDragOver} onDrop={onLaneDrop} onDragLeave={onLaneDragLeave}>
                <div className="cal-lane-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${nDays}, ${DAY_W}px)` }}>
                  {days.map((d, i) => (
                    <div key={d.date} className={`cal-cell${d.d.getDay()===0||d.d.getDay()===6?' weekend':''}${i===todayIdx?' today':''}`} />
                  ))}
                </div>
                {(state.meetings || []).flatMap((m) =>
                  expandMeetingInstances(m, days[0]?.date || localIso(), rangeEndDate)
                ).map((m, idx) => {
                  const left = posFor(m.date);
                  if (left === null) return null;
                  const isRecurring = m.recurrence && m.recurrence !== 'none';
                  return (
                    <div key={`${m.id}-${m.date}`} className="cal-item cal-meeting" style={{ left: left + 2, top: 4, width: DAY_W - 4, cursor: 'grab', opacity: calDrag?.id === m.id ? 0.4 : 1 }}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setCalDrag({ kind: 'meeting', id: m.id, date: m.date }); setTooltip(null); }}
                      onDragEnd={() => { setCalDrag(null); setDragOverDate(null); }}
                      onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setTooltip({ kind: 'meeting', data: m, x: rect.left, y: rect.bottom + 6 }); }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => { setCalModal({ kind: 'meeting', id: m.id }); setCalModalEdit(false); }}>
                      {isRecurring ? <span style={{ opacity: 0.7 }}>↻</span> : <Icon name="clock" size={9} />}
                      <span className="truncate">{m.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Project lanes */}
          {projects.map((p) => {
            const items = laneFor(p);
            // Assign per-day slots so same-date items stack without overlap
            const slotMap = {};
            const placed = items.map((item) => {
              const slot = slotMap[item.date] ?? 0;
              slotMap[item.date] = slot + 1;
              return { ...item, slot };
            });
            const maxSlot = placed.length ? Math.max(...placed.map((i) => i.slot)) : 0;
            const laneH = Math.max(54, 10 + (maxSlot + 1) * 22);
            return (
              <div key={p.id} className="cal-row" style={{ gridTemplateColumns: `180px repeat(${nDays}, ${DAY_W}px)` }}>
                <div className="cal-lane-label" onClick={() => actions.setActiveProject(p.id)} style={{ cursor: 'pointer' }}>
                  <span className={`sb-proj-dot pc-${p.status}`} />
                  <span className="mono" style={{ fontSize: 11 }}>{p.code}</span>
                  <span className="truncate">{p.name.split('—')[1]?.trim() || p.name}</span>
                </div>
                <div className="cal-lane-body" style={{ gridColumn: `2 / span ${nDays}`, position: 'relative', minHeight: laneH }}
                  onDragOver={onLaneDragOver} onDrop={onLaneDrop} onDragLeave={onLaneDragLeave}>
                  {/* day cell backgrounds */}
                  <div className="cal-lane-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${nDays}, ${DAY_W}px)` }}>
                    {days.map((d, i) => {
                      const isWeekend = d.d.getDay() === 0 || d.d.getDay() === 6;
                      const isToday = i === todayIdx;
                      return <div key={d.date} className={`cal-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`} style={dragHighlight(d.date)} />;
                    })}
                  </div>
                  {/* items */}
                  {placed.map((item) => {
                    const left = posFor(item.date);
                    if (left === null) return null;
                    const top = 6 + item.slot * 22;
                    const onEnter = (e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      setTooltip({ kind: item.kind, data: item.data, x: r.left, y: r.bottom + 6 });
                    };
                    const onLeave = () => setTooltip(null);
                    const isDraggingThis = calDrag?.id === item.data.id;
                    if (item.kind === 'milestone') {
                      return (
                        <div key={`m-${item.data.id}`} className="cal-item cal-milestone"
                          style={{ left: left + 2, top, width: DAY_W - 4, opacity: isDraggingThis ? 0.4 : 1, cursor: 'pointer' }}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setCalDrag({ kind: 'milestone', id: item.data.id, date: item.data.date }); setTooltip(null); }}
                          onDragEnd={() => { setCalDrag(null); setDragOverDate(null); }}
                          onMouseEnter={onEnter} onMouseLeave={onLeave}
                          onClick={(e) => { e.stopPropagation(); setCalModal({ kind: 'milestone', id: item.data.id }); setCalModalEdit(false); }}>
                          <Icon name="milestone" size={11} /><span className="truncate">{item.data.name}</span>
                        </div>
                      );
                    }
                    if (item.kind === 'review') {
                      return (
                        <div key={`r-${item.data.id}`} className="cal-item cal-review" style={{ left: left + 2, top }}
                          onMouseEnter={onEnter} onMouseLeave={onLeave}>
                          <Icon name="bolt" size={10} />
                          <span className="truncate" style={{ maxWidth: 120 }}>{item.data.title}</span>
                        </div>
                      );
                    }
                    const t = item.data;
                    const _pnorm = { P0: 'critical', P1: 'high', P2: 'medium', P3: 'low' }[t.priority] || t.priority;
                    const tone = _pnorm === 'critical' ? 'p0' : _pnorm === 'high' ? 'p1' : _pnorm === 'medium' ? 'p2' : 'p3';
                    const isDone = t.status === 'done';
                    return (
                      <div
                        key={`t-${t.id}`}
                        className={`cal-item cal-task ${tone}${isDone ? ' cal-task-done' : ''}`}
                        style={{ left: left + 2, top, width: DAY_W - 4, opacity: isDraggingThis ? 0.4 : 1, cursor: 'grab' }}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setCalDrag({ kind: 'task', id: t.id, date: t.dueDate }); setTooltip(null); }}
                        onDragEnd={() => { setCalDrag(null); setDragOverDate(null); }}
                        onClick={(e) => { e.stopPropagation(); setCalModal({ kind: 'task', id: t.id }); setCalModalEdit(false); }}
                        onMouseEnter={onEnter} onMouseLeave={onLeave}
                      >
                        <span className="truncate">{t.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Day notes row */}
          <div className="cal-row cal-daynote-row" style={{ gridTemplateColumns: `180px repeat(${nDays}, ${DAY_W}px)` }}>
            <div className="cal-lane-label">
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>End of Day Notes</span>
            </div>
            {days.map((d, i) => {
              const hasNote = !!dayNoteMap[d.date];
              const isWeekend = d.d.getDay() === 0 || d.d.getDay() === 6;
              const isToday = i === todayIdx;
              return (
                <div key={d.date}
                  className={`cal-daynote-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''} ${hasNote ? 'has-note' : ''}`}
                  title={hasNote ? dayNoteMap[d.date] : `Add note for ${d.date}`}
                  onClick={() => openDayNote(d.date)}>
                  {hasNote && <span className="cal-daynote-dot" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="cal-legend">
        <span className="cal-leg-item"><span className="cal-leg-dot p0" /> Critical</span>
        <span className="cal-leg-item"><span className="cal-leg-dot p1" /> High</span>
        <span className="cal-leg-item"><span className="cal-leg-dot p2" /> Medium</span>
        <span className="cal-leg-item"><span className="cal-leg-dot p3" /> Low</span>
        <span className="cal-leg-item"><span style={{ color: 'var(--accent)' }}><Icon name="milestone" size={11} /></span> Milestone</span>
        <span className="cal-leg-item"><span style={{ color: 'oklch(40% 0.15 200)' }}><Icon name="clock" size={10} /></span> Meeting</span>
        <span className="cal-leg-item"><span style={{ color: 'oklch(45% 0.18 300)' }}><Icon name="bell" size={10} /></span> Reminder</span>
        <span className="cal-leg-item" style={{ marginLeft: 'auto', color: 'var(--fg-4)' }}>Click a task or project to open · click End of Day Notes row to log notes</span>
      </div>

      {/* Daily log panel */}
      <DailyLogPanel state={state} dayNotes={dayNotes} dayNoteMap={dayNoteMap} onEditNote={openDayNote}
        hideDays={hideDays}
        onOpenDetail={(kind, id) => { setCalModal({ kind, id }); setCalModalEdit(false); setCalMsEditDraft(null); setCalDecEditDraft(null); }}
        onOpenReminder={(r) => { setCalModal({ kind: 'reminder', id: r.id }); }} />

      {/* Reminder modal */}
      {reminderModal && (
        <Modal open={true} title={reminderModal.id ? 'Edit reminder' : 'New reminder'} onClose={() => setReminderModal(null)}>
          <div className="field">
            <span className="field-label">Date</span>
            <input className="input" type="date" value={reminderModal.date}
              onChange={(e) => setReminderModal({ ...reminderModal, date: e.target.value })} />
          </div>
          <div className="field">
            <span className="field-label">Title</span>
            <input className="input" placeholder="Reminder title" value={reminderModal.title} autoFocus
              onChange={(e) => setReminderModal({ ...reminderModal, title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && saveReminder()} />
          </div>
          <div className="field">
            <span className="field-label">Note (optional)</span>
            <textarea className="textarea" placeholder="Details…" value={reminderModal.note}
              onChange={(e) => setReminderModal({ ...reminderModal, note: e.target.value })} />
          </div>
          <div className="modal-foot">
            {reminderModal.id && (
              <button className="btn btn-danger-ghost" onClick={() => { actions.deleteReminder(reminderModal.id); setReminderModal(null); }}>Delete</button>
            )}
            <div style={{ flex: 1 }} />
            <button className="btn" onClick={() => setReminderModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveReminder}>Save</button>
          </div>
        </Modal>
      )}

      {/* Hover tooltip */}
      {tooltip && (
        <div className="cal-tooltip" style={{ left: Math.min(tooltip.x, window.innerWidth - 240), top: tooltip.y }}
          onMouseEnter={() => setTooltip(tooltip)} onMouseLeave={() => setTooltip(null)}>
          {tooltip.kind === 'task' && (
            <>
              <div className="cal-tooltip-title">{tooltip.data.title}</div>
              <div className="cal-tooltip-row"><span className="cal-tooltip-label">Priority</span><PriorityBadge priority={tooltip.data.priority} /></div>
              <div className="cal-tooltip-row"><span className="cal-tooltip-label">Due</span><span>{fmtDate(tooltip.data.dueDate)}</span></div>
              {tooltip.data.estimate && <div className="cal-tooltip-row"><span className="cal-tooltip-label">Estimate</span><span>{tooltip.data.estimate}h</span></div>}
              {tooltip.data.status === 'blocked' && <div className="cal-tooltip-row"><span style={{ color: 'var(--danger)' }}>Blocked</span></div>}
            </>
          )}
          {tooltip.kind === 'milestone' && (
            <>
              <div className="cal-tooltip-title"><Icon name="milestone" size={11} /> {tooltip.data.name}</div>
              <div className="cal-tooltip-row"><span className="cal-tooltip-label">Date</span><span>{fmtDate(tooltip.data.date)}</span></div>
              {tooltip.data.deliverable && <div className="cal-tooltip-row"><span className="cal-tooltip-label">Deliverable</span><span style={{ textAlign: 'right' }}>{tooltip.data.deliverable}</span></div>}
              <div className="cal-tooltip-row"><span className="cal-tooltip-label">Status</span><Pill tone={tooltip.data.status === 'done' ? 'ok' : tooltip.data.status === 'blocked' ? 'danger' : 'neutral'}>{tooltip.data.status}</Pill></div>
            </>
          )}
          {tooltip.kind === 'reminder' && (
            <>
              <div className="cal-tooltip-title"><Icon name="bell" size={11} /> {tooltip.data.title}</div>
              <div className="cal-tooltip-row"><span className="cal-tooltip-label">Date</span><span>{fmtDate(tooltip.data.date)}</span></div>
              {tooltip.data.note && <div className="cal-tooltip-note">{tooltip.data.note}</div>}
            </>
          )}
          {tooltip.kind === 'meeting' && (
            <>
              <div className="cal-tooltip-title"><Icon name="clock" size={11} /> {tooltip.data.title}</div>
              <div className="cal-tooltip-row"><span className="cal-tooltip-label">Date</span><span>{fmtDate(tooltip.data.date)}</span></div>
              {tooltip.data.attendees && <div className="cal-tooltip-row"><span className="cal-tooltip-label">With</span><span>{tooltip.data.attendees}</span></div>}
              {tooltip.data.notes && <div className="cal-tooltip-note">{tooltip.data.notes.slice(0, 120)}{tooltip.data.notes.length > 120 ? '…' : ''}</div>}
            </>
          )}
        </div>
      )}

      {/* Calendar item detail modals */}
      {calModal?.kind === 'task' && (() => {
        const TROM = window.TaskReadOnlyModal;
        if (TROM) return (
          <TROM taskId={calModal.id} state={state}
            onClose={() => { setCalModal(null); setCalModalEdit(false); }}
            onEdit={(id) => { setCalModal(null); setCalModalEdit(false); window.actions.openTask(id); }}
            onJumpTo={(id) => setCalModal({ kind: 'task', id })}
          />
        );
        return null;
      })()}
      {calModal?.kind === 'decision' && (() => {
        const note = (state.notes || []).find(n => n.id === calModal.id);
        if (!note) return null;
        const proj = state.projects.find(p => p.id === note.projectId);
        const isIrrev = note.reversibility === 'irreversible';
        const d = calDecEditDraft;
        if (d) {
          return (
            <Modal open title="Edit decision" onClose={() => { setCalModal(null); setCalDecEditDraft(null); }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="field"><span className="field-label">Title</span><input className="input" value={d.title} autoFocus onChange={e => setCalDecEditDraft({ ...d, title: e.target.value })} /></div>
                <div className="field"><span className="field-label">Choice / decision made</span><textarea className="textarea" value={d.body} onChange={e => setCalDecEditDraft({ ...d, body: e.target.value })} /></div>
                <div className="field"><span className="field-label">Context</span><textarea className="textarea" value={d.context} onChange={e => setCalDecEditDraft({ ...d, context: e.target.value })} /></div>
                <div className="field"><span className="field-label">Options considered</span><textarea className="textarea" value={d.options} onChange={e => setCalDecEditDraft({ ...d, options: e.target.value })} /></div>
                <div className="field"><span className="field-label">Reversibility</span>
                  <select className="select" value={d.reversibility} onChange={e => setCalDecEditDraft({ ...d, reversibility: e.target.value })}>
                    <option value="reversible">Reversible</option>
                    <option value="irreversible">Irreversible</option>
                  </select>
                </div>
                <div className="modal-foot">
                  <button className="btn" onClick={() => setCalDecEditDraft(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => { actions.updateNote(note.id, { title: d.title, body: d.body, context: d.context, options: d.options, reversibility: d.reversibility }); setCalDecEditDraft(null); setCalModal(null); }}>Save</button>
                </div>
              </div>
            </Modal>
          );
        }
        return (
          <Modal open title="Decision" onClose={() => setCalModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isIrrev
                  ? <span className="pill pill-danger" style={{ fontSize: 10 }}>irreversible</span>
                  : <span className="pill pill-ghost" style={{ fontSize: 10 }}>decision</span>}
                {proj && <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{proj.code}</span>}
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginLeft: 'auto' }}>{fmtDate(note.date)}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{note.title}</div>
              {note.body && <div><div className="field-label" style={{ marginBottom: 4 }}>Choice</div><div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{note.body}</div></div>}
              {note.context && <div><div className="field-label" style={{ marginBottom: 4 }}>Context</div><div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{note.context}</div></div>}
              {note.options && <div><div className="field-label" style={{ marginBottom: 4 }}>Options considered</div><div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{note.options}</div></div>}
              {(note.tags || []).length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{note.tags.map(t => <span key={t} className="pill pill-ghost">{t}</span>)}</div>}
              <div className="modal-foot">
                <button className="btn" onClick={() => setCalModal(null)}>Close</button>
                <button className="btn btn-sm" onClick={() => setCalDecEditDraft({ title: note.title, body: note.body || '', context: note.context || '', options: note.options || '', reversibility: note.reversibility || 'reversible' })}><Icon name="edit" size={11} /> Edit</button>
              </div>
            </div>
          </Modal>
        );
      })()}
      {calModal?.kind === 'milestone' && (() => {
        const ms = state.milestones.find(m => m.id === calModal.id);
        if (!ms) return null;
        const proj = state.projects.find(p => p.id === ms.projectId);
        const dueDiff = ms.date && ms.status !== 'done' ? Math.round((new Date(ms.date + 'T00:00:00') - new Date()) / 86400000) : null;
        const dueColor = dueDiff === null ? 'var(--fg-3)' : dueDiff < 0 ? 'var(--danger)' : dueDiff === 0 ? 'var(--warn)' : 'var(--fg-3)';
        const d = calMsEditDraft;
        if (d) {
          return (
            <Modal open title="Edit milestone" onClose={() => { setCalModal(null); setCalMsEditDraft(null); }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="field"><span className="field-label">Name</span><input className="input" value={d.name} autoFocus onChange={e => setCalMsEditDraft({ ...d, name: e.target.value })} /></div>
                <div className="row-2">
                  <div className="field" style={{ marginBottom: 0 }}><span className="field-label">Date</span><input className="input" type="date" value={d.date || ''} onChange={e => setCalMsEditDraft({ ...d, date: e.target.value })} /></div>
                  <div className="field" style={{ marginBottom: 0 }}><span className="field-label">Status</span>
                    <select className="select" value={d.status} onChange={e => setCalMsEditDraft({ ...d, status: e.target.value })}>
                      <option value="planned">Planned</option>
                      <option value="at-risk">At risk</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
                <div className="field"><span className="field-label">Description</span><textarea className="textarea" value={d.description} onChange={e => setCalMsEditDraft({ ...d, description: e.target.value })} /></div>
                <div className="field"><span className="field-label">Deliverable</span><textarea className="textarea" value={d.deliverable} onChange={e => setCalMsEditDraft({ ...d, deliverable: e.target.value })} /></div>
                <div className="modal-foot">
                  <button className="btn" onClick={() => setCalMsEditDraft(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => { actions.updateMilestone(ms.id, { name: d.name, date: d.date, status: d.status, description: d.description, deliverable: d.deliverable }); setCalMsEditDraft(null); setCalModal(null); }}>Save</button>
                </div>
              </div>
            </Modal>
          );
        }
        return (
          <Modal open title="Milestone" onClose={() => setCalModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{ms.name}</div>
              {proj && <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{proj.code} — {proj.name.split('—')[1]?.trim() || proj.name}</div>}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div><div className="field-label" style={{ marginBottom: 3 }}>Status</div>
                  <span className={`pill pill-${ms.status === 'done' ? 'ok' : ms.status === 'at-risk' ? 'warn' : 'ghost'}`}>{ms.status || 'planned'}</span>
                </div>
                <div><div className="field-label" style={{ marginBottom: 3 }}>Date</div>
                  <span style={{ fontWeight: 500, color: dueColor }}>{ms.date || '—'}</span>
                  {dueDiff !== null && <span style={{ fontSize: 11, color: dueColor, marginLeft: 6 }}>{dueDiff < 0 ? `${Math.abs(dueDiff)}d overdue` : dueDiff === 0 ? 'today' : `in ${dueDiff}d`}</span>}
                </div>
                {ms.doneDate && <div><div className="field-label" style={{ marginBottom: 3 }}>Completed</div><span style={{ color: 'var(--ok)', fontWeight: 500 }}>{ms.doneDate}</span></div>}
              </div>
              {ms.description && <div><div className="field-label" style={{ marginBottom: 4 }}>Description</div><div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>{ms.description}</div></div>}
              {ms.deliverable && <div><div className="field-label" style={{ marginBottom: 4 }}>Deliverable</div><div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>{ms.deliverable}</div></div>}
              <div className="modal-foot">
                <button className="btn" onClick={() => setCalModal(null)}>Close</button>
                <button className="btn btn-sm" onClick={() => setCalMsEditDraft({ name: ms.name, date: ms.date || '', status: ms.status || 'planned', description: ms.description || '', deliverable: ms.deliverable || '' })}><Icon name="edit" size={11} /> Edit</button>
              </div>
            </div>
          </Modal>
        );
      })()}
      {calModal?.kind === 'meeting' && (() => {
        const MDM = window.MtgDetailModal;
        if (!MDM) return null;
        return (
          <MDM meetingId={calModal.id} state={state}
            onOpenProject={(id) => { setCalModal(null); actions.setActiveProject(id); }}
            onOpenTask={(id) => { setCalModal(null); window.actions.openTask(id); }}
            onClose={() => setCalModal(null)} />
        );
      })()}
      {calModal?.kind === 'reminder' && (() => {
        const r = (state.reminders || []).find(x => x.id === calModal.id);
        if (!r) return null;
        return (
          <Modal open title="Reminder" onClose={() => setCalModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{r.title}</div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div><div className="field-label" style={{ marginBottom: 3 }}>Date</div><span style={{ fontWeight: 500 }}>{fmtDate(r.date)}</span></div>
              </div>
              {r.note && <div><div className="field-label" style={{ marginBottom: 4 }}>Note</div><div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.note}</div></div>}
              <div className="modal-foot">
                <button className="btn" onClick={() => setCalModal(null)}>Close</button>
                <button className="btn btn-sm" onClick={() => { setCalModal(null); openReminderEdit(r); }}><Icon name="edit" size={11} /> Edit</button>
              </div>
            </div>
          </Modal>
        );
      })()}
      {dayNoteModal && (
        <Modal open={true} title={`Day note · ${fmtDate(dayNoteModal.date)}`} onClose={() => setDayNoteModal(null)}>
          <div className="field">
            <span className="field-label">End-of-day note</span>
            <textarea className="textarea" style={{ minHeight: 120 }} placeholder="What happened today? Wins, blockers, thoughts…"
              value={dayNoteModal.body} autoFocus
              onChange={(e) => setDayNoteModal({ ...dayNoteModal, body: e.target.value })} />
          </div>
          <div className="modal-foot">
            {dayNotes.find((n) => n.date === dayNoteModal.date) && (
              <button className="btn btn-danger-ghost" onClick={() => { actions.deleteDayNote(dayNoteModal.date); setDayNoteModal(null); }}>Delete</button>
            )}
            <div style={{ flex: 1 }} />
            <button className="btn" onClick={() => setDayNoteModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveDayNote}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function buildDailyLog(state) {
  const today = localIso();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = localIso(cutoff);

  const dateSet = new Set();
  state.tasks.forEach((t) => {
    if (t.completedAt && t.completedAt >= cutoffStr) dateSet.add(t.completedAt);
    if (t.createdAt && t.createdAt >= cutoffStr) dateSet.add(t.createdAt);
  });
  (state.reminders || []).forEach((r) => { if (r.createdAt >= cutoffStr) dateSet.add(r.createdAt); });
  (state.notes || []).forEach((n) => { if (n.date >= cutoffStr) dateSet.add(n.date); });
  (state.milestones || []).forEach((m) => { if (m.date >= cutoffStr && m.date <= today) dateSet.add(m.date); });
  (state.dayNotes || []).forEach((n) => { if (n.date >= cutoffStr) dateSet.add(n.date); });
  Object.keys(state.dailyPlans || {}).forEach((date) => { if (date >= cutoffStr) dateSet.add(date); });

  return [...dateSet].sort((a, b) => b.localeCompare(a)).map((date) => ({
    date,
    tasksCompleted: state.tasks.filter((t) => t.completedAt === date),
    tasksCreated: state.tasks.filter((t) => t.createdAt === date && t.completedAt !== date),
    remindersCreated: (state.reminders || []).filter((r) => r.createdAt === date),
    notesAdded: (state.notes || []).filter((n) => n.date === date),
    milestonesOn: (state.milestones || []).filter((m) => m.date === date),
    dayNote: (state.dayNotes || []).find((n) => n.date === date) || null,
    dailyPlan: (state.dailyPlans || {})[date] || null,
  }));
}

function DailyLogPanel({ state, dayNotes, dayNoteMap, onEditNote, onOpenDetail, onOpenReminder, hideDays }) {
  const rawLog = React.useMemo(() => buildDailyLog(state), [state]);
  const log = React.useMemo(() => {
    if (!hideDays || hideDays.size === 0) return rawLog;
    return rawLog.filter(entry => {
      const dow = new Date(entry.date + 'T00:00:00').getDay();
      return !hideDays.has(dow);
    });
  }, [rawLog, hideDays]);

  const PAGE_SIZE = 10;
  const [page, setPage] = React.useState(0);
  const totalPages = Math.ceil(log.length / PAGE_SIZE);
  const pageLog = log.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Reset to page 0 when log changes (e.g. hideDays changes)
  React.useEffect(() => { setPage(0); }, [hideDays]);

  const [expanded, setExpanded] = React.useState({});
  const [editingNote, setEditingNote] = React.useState(null);
  const [noteDraft, setNoteDraft] = React.useState('');

  if (log.length === 0) return null;

  const toggle = (date) => setExpanded((prev) => ({ ...prev, [date]: !prev[date] }));
  const startEdit = (date, existing) => { setEditingNote(date); setNoteDraft(existing || ''); };
  const saveNote = (date) => {
    if (noteDraft.trim()) actions.saveDayNote(date, noteDraft);
    else actions.deleteDayNote(date);
    setEditingNote(null);
  };

  return (
    <div className="card" style={{ marginTop: 16, overflow: 'hidden' }}>
      <div className="card-head">
        <span className="card-head-title">Daily log</span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginLeft: 'auto' }}>{log.length} days</span>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
            <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><Icon name="chevronL" size={10} /></button>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', minWidth: 60, textAlign: 'center' }}>{page + 1} / {totalPages}</span>
            <button className="btn btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><Icon name="chevronR" size={10} /></button>
          </div>
        )}
      </div>

      {pageLog.map((entry) => {
        const isOpen = !!expanded[entry.date];
        const d = new Date(entry.date + 'T00:00:00');
        const dow = d.toLocaleDateString('en-US', { weekday: 'short' });
        const tasksDone = entry.tasksCompleted;
        const tasksCreated = entry.tasksCreated;
        const milestones = entry.milestonesOn;
        const notes = entry.notesAdded;
        const totalItems = tasksDone.length + tasksCreated.length + milestones.length + notes.length + entry.remindersCreated.length;

        const summaryParts = [
          tasksDone.length && `${tasksDone.length} task${tasksDone.length > 1 ? 's' : ''} done`,
          tasksCreated.length && `${tasksCreated.length} created`,
          milestones.length && `${milestones.length} milestone${milestones.length > 1 ? 's' : ''}`,
          notes.length && `${notes.length} note${notes.length > 1 ? 's' : ''}`,
          entry.remindersCreated.length && `${entry.remindersCreated.length} reminder${entry.remindersCreated.length > 1 ? 's' : ''}`,
          entry.dayNote && 'end of day note',
          entry.dailyPlan && 'plan',
        ].filter(Boolean);

        return (
          <div key={entry.date} style={{ borderBottom: '1px solid var(--line)' }}>
            {/* Header row */}
            <div
              className="overload-row overload-row-btn"
              style={{ padding: '10px 14px' }}
              onClick={() => toggle(entry.date)}
            >
              <div style={{ minWidth: 100 }}>
                <div className="mono" style={{ fontWeight: 600, fontSize: 12 }}>{fmtDate(entry.date)}</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{dow}</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px 8px', minWidth: 0 }}>
                {summaryParts.map((c) => (
                  <span key={c} className="pill pill-ghost" style={{ fontSize: 10.5 }}>{c}</span>
                ))}
                {summaryParts.length === 0 && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>no activity</span>}
              </div>
              <Icon name={isOpen ? 'chevronD' : 'chevronR'} size={10} style={{ flexShrink: 0 }} />
            </div>

            {/* Expanded body */}
            {isOpen && (
              <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }} onClick={(e) => e.stopPropagation()}>

                {/* Tasks completed */}
                {tasksDone.length > 0 && (
                  <div style={{ borderBottom: '1px solid var(--line)' }}>
                    <div style={{ padding: '6px 14px 4px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)' }}>Tasks completed</div>
                    {tasksDone.map((t) => {
                      const proj = state.projects.find(p => p.id === t.projectId);
                      return (
                        <div key={t.id} className="workload-task-row" style={{ cursor: 'pointer', textDecoration: 'line-through', opacity: 0.7 }}
                          onClick={() => onOpenDetail('task', t.id)}>
                          <Icon name="check" size={10} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                          <PriorityBadge priority={t.priority} />
                          <span className="truncate" style={{ flex: 1 }}>{t.title}</span>
                          {proj && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{proj.code}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tasks created */}
                {tasksCreated.length > 0 && (
                  <div style={{ borderBottom: '1px solid var(--line)' }}>
                    <div style={{ padding: '6px 14px 4px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)' }}>Tasks created</div>
                    {tasksCreated.map((t) => {
                      const proj = state.projects.find(p => p.id === t.projectId);
                      return (
                        <div key={t.id} className="workload-task-row" style={{ cursor: 'pointer' }}
                          onClick={() => onOpenDetail('task', t.id)}>
                          <Icon name="plus" size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                          <PriorityBadge priority={t.priority} />
                          <span className="truncate" style={{ flex: 1 }}>{t.title}</span>
                          {proj && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{proj.code}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Milestones */}
                {milestones.length > 0 && (
                  <div style={{ borderBottom: '1px solid var(--line)' }}>
                    <div style={{ padding: '6px 14px 4px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)' }}>Milestones</div>
                    {milestones.map((m) => {
                      const proj = state.projects.find(p => p.id === m.projectId);
                      return (
                        <div key={m.id} className="workload-task-row" style={{ cursor: 'pointer' }}
                          onClick={() => onOpenDetail('milestone', m.id)}>
                          <Icon name="milestone" size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          <span className="truncate" style={{ flex: 1 }}>{m.name}</span>
                          <span className={`pill pill-${m.status === 'done' ? 'ok' : 'ghost'}`} style={{ fontSize: 10 }}>{m.status}</span>
                          {proj && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{proj.code}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Notes / decisions */}
                {notes.length > 0 && (
                  <div style={{ borderBottom: '1px solid var(--line)' }}>
                    <div style={{ padding: '6px 14px 4px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)' }}>Notes</div>
                    {notes.map((n) => (
                      <div key={n.id} className="workload-task-row" style={{ cursor: 'pointer' }}
                        onClick={() => onOpenDetail('decision', n.id)}>
                        <Icon name="note" size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                        <span className="truncate" style={{ flex: 1 }}>{n.title}</span>
                        <span className="pill pill-ghost" style={{ fontSize: 10 }}>{n.kind}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reminders */}
                {entry.remindersCreated.length > 0 && (
                  <div style={{ borderBottom: '1px solid var(--line)' }}>
                    <div style={{ padding: '6px 14px 4px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)' }}>Reminders</div>
                    {entry.remindersCreated.map((r) => (
                      <div key={r.id} className="workload-task-row" style={{ cursor: 'pointer' }}
                        onClick={() => onOpenReminder(r)}>
                        <span style={{ color: 'oklch(45% 0.18 300)', flexShrink: 0 }}><Icon name="bell" size={10} /></span>
                        <span className="truncate" style={{ flex: 1 }}>{r.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Daily plan */}
                {entry.dailyPlan && (() => {
                  const dp = entry.dailyPlan;
                  const committed = dp.committed || [];
                  const planTasks = (dp.plan || []).map((p) => {
                    const t = state.tasks.find((x) => x.id === p.taskId);
                    return t ? { ...p, task: t } : null;
                  }).filter(Boolean);
                  const deferredItems = (dp.deferred || []).map((d) => {
                    const t = state.tasks.find((x) => x.id === d.taskId);
                    return t ? { ...d, task: t } : null;
                  }).filter(Boolean);
                  const genTime = dp.generatedAt ? new Date(dp.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
                  return (
                    <div style={{ borderBottom: '1px solid var(--line)' }}>
                      <div style={{ padding: '6px 14px 4px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Daily plan</span>
                        {genTime && <span style={{ fontWeight: 400 }}>generated {genTime}</span>}
                      </div>
                      {(dp.insights || []).map((ins, i) => (
                        <div key={i} className="workload-task-row" style={{ alignItems: 'flex-start' }}>
                          <Icon name="bolt" size={10} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 11.5, color: 'var(--fg-3)', lineHeight: 1.4 }}>{ins}</span>
                        </div>
                      ))}
                      {planTasks.map((p) => {
                        const isDone = committed.includes(p.taskId) && p.task.status === 'done';
                        const isCommitted = committed.includes(p.taskId);
                        return (
                          <div key={p.taskId} className="workload-task-row" style={{ cursor: 'pointer' }}
                            onClick={() => onOpenDetail('task', p.taskId)}>
                            <Icon name={isDone ? 'check' : isCommitted ? 'target' : 'clock'} size={10} style={{ color: isDone ? 'var(--ok)' : isCommitted ? 'var(--accent)' : 'var(--fg-4)', flexShrink: 0 }} />
                            <span className="truncate" style={{ flex: 1, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--fg-4)' : 'var(--fg-2)' }}>{p.task.title}</span>
                          </div>
                        );
                      })}
                      {deferredItems.length > 0 && (
                        <div style={{ padding: '4px 14px 6px', borderTop: '1px solid var(--line)' }}>
                          <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-4)', marginBottom: 3 }}>Deferred</div>
                          {deferredItems.map((d) => (
                            <div key={d.taskId} className="workload-task-row" style={{ opacity: 0.7, cursor: 'pointer' }}
                              onClick={() => onOpenDetail('task', d.taskId)}>
                              <Icon name="clock" size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                              <span className="truncate" style={{ flex: 1, color: 'var(--fg-3)' }}>{d.task.title}</span>
                              {d.reason && <span style={{ fontSize: 10.5, color: 'var(--fg-4)', fontStyle: 'italic', flexShrink: 0 }}>{d.reason}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* End of Day Notes */}
                <div style={{ padding: '8px 0 12px' }}>
                  <div style={{ padding: '0 14px', fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-4)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    End of Day Notes
                    {entry.dayNote && editingNote !== entry.date && (
                      <button className="icon-btn" onClick={() => startEdit(entry.date, entry.dayNote?.body)}>
                        <Icon name="edit" size={10} />
                      </button>
                    )}
                  </div>
                  {editingNote === entry.date ? (
                    <div style={{ padding: '0 14px' }}>
                      <textarea className="textarea" style={{ minHeight: 80, fontSize: 12.5, width: '100%', boxSizing: 'border-box' }}
                        placeholder="What happened today? Wins, blockers, thoughts…"
                        value={noteDraft} autoFocus
                        onChange={(e) => setNoteDraft(e.target.value)} />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                        <button className="btn btn-sm" onClick={() => setEditingNote(null)}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={() => saveNote(entry.date)}>Save</button>
                      </div>
                    </div>
                  ) : entry.dayNote ? (
                    <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '0 14px' }}>{entry.dayNote.body}</div>
                  ) : (
                    <button className="cal-log-add-note" style={{ marginLeft: 14 }} onClick={() => startEdit(entry.date, '')}>
                      <Icon name="plus" size={10} /> Add end of day note
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { CalendarView });
