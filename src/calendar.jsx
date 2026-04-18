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
  const [range, setRange] = useStateCal(14); // days
  const [anchor, setAnchor] = useStateCal(-3); // days offset from today
  const [filter, setFilter] = useStateCal({ priority: null, projects: null });
  const [showKinds, setShowKinds] = useStateCal({ tasks: true, milestones: true, meetings: true, reminders: true });
  const [reminderModal, setReminderModal] = useStateCal(null); // null | { id?, date, title, note }
  const [dayNoteModal, setDayNoteModal] = useStateCal(null); // null | { date, body }
  const [tooltip, setTooltip] = useStateCal(null); // null | { kind, data, x, y }
  const [containerWidth, setContainerWidth] = useStateCal(0);
  const [calDrag, setCalDrag] = useStateCal(null); // { kind, id, date }
  const [dragOverDate, setDragOverDate] = useStateCal(null);
  const gridRef = useRefCal(null);
  const wrapRef = useRefCal(null);

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
      arr.push({ date: localIso(d), d });
    }
    return arr;
  }, [startDate, range]);

  const projects = state.projects.filter((p) => !filter.projects || filter.projects.includes(p.id));
  const reminders = state.reminders || [];
  const dayNotes = state.dayNotes || [];

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
  const DAY_W = containerWidth > 0
    ? Math.max(24, Math.floor((containerWidth - 184) / range))
    : (range > 35 ? 28 : range > 21 ? 40 : 52);

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

  return (
    <div>
      <div className="cal-toolbar">
        <div className="row-flex">
          <button className="btn btn-sm" onClick={() => setAnchor(anchor - 7)}><Icon name="chevronL" size={10} /> Week</button>
          <button className="btn btn-sm" onClick={() => setAnchor(-3)}>Today</button>
          <button className="btn btn-sm" onClick={() => setAnchor(anchor + 7)}>Week <Icon name="chevronR" size={10} /></button>
          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 10 }}>
            {fmtDate(days[0].date)} — {fmtDate(days[days.length - 1].date)}
          </span>
        </div>
        <div className="row-flex">
          <div className="seg">
            {[7, 14, 28, 42, 60].map((r) => (
              <button key={r} className={`seg-btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}d</button>
            ))}
          </div>
          <div className="seg">
            {['tasks', 'milestones', 'meetings', 'reminders'].map((k) => (
              <button key={k} className={`seg-btn ${showKinds[k] ? 'active' : ''}`} onClick={() => setShowKinds({ ...showKinds, [k]: !showKinds[k] })}>
                {k}
              </button>
            ))}
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => openReminderNew(days[Math.max(0, todayIdx)].date)}>
            <Icon name="plus" size={11} /> Reminder
          </button>
          <button className="btn btn-sm" onClick={() => {
            const ics = iCalExport(state);
            downloadFile('operator-milestones.ics', ics, 'text/calendar');
          }}>
            <Icon name="download" size={11} /> iCal
          </button>
        </div>
      </div>

      <div className="cal-wrap" ref={wrapRef}>
        <div className="cal-frame" ref={gridRef}>
          {/* Date header */}
          <div className="cal-header" style={{ gridTemplateColumns: `180px repeat(${range}, ${DAY_W}px)` }}>
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


          {/* Workload row — uses identical cal-lane-body + posFor() structure as project task items */}
          <div className="cal-row" style={{ gridTemplateColumns: `180px repeat(${range}, ${DAY_W}px)`, minHeight: 44, background: 'color-mix(in oklch, var(--bg-3) 50%, transparent)' }}>
            <div className="cal-lane-label">
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Workload</span>
            </div>
            <div className="cal-lane-body" style={{ gridColumn: `2 / span ${range}`, minHeight: 44 }}>
              <div className="cal-lane-grid" style={{ gridTemplateColumns: `repeat(${range}, ${DAY_W}px)` }}>
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

          {/* Reminders row */}
          {showKinds.reminders && (
            <div className="cal-row cal-rem-row" style={{ gridTemplateColumns: `180px repeat(${range}, ${DAY_W}px)` }}>
              <div className="cal-lane-label">
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reminders</span>
                <button className="icon-btn" style={{ marginLeft: 4 }} title="Add reminder" onClick={() => openReminderNew(days[Math.max(0, todayIdx)].date)}>
                  <Icon name="plus" size={10} />
                </button>
              </div>
              <div className="cal-lane-body" style={{ gridColumn: `2 / span ${range}`, position: 'relative', minHeight: remLaneH }}
                onDragOver={onLaneDragOver} onDrop={onLaneDrop} onDragLeave={onLaneDragLeave}>
                <div className="cal-lane-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${range}, ${DAY_W}px)` }}>
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
            <div className="cal-row" style={{ gridTemplateColumns: `180px repeat(${range}, ${DAY_W}px)`, minHeight: 36 }}>
              <div className="cal-lane-label">
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meetings</span>
              </div>
              <div className="cal-lane-body" style={{ gridColumn: `2 / span ${range}`, position: 'relative', minHeight: 36 }}>
                <div className="cal-lane-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${range}, ${DAY_W}px)` }}>
                  {days.map((d, i) => (
                    <div key={d.date} className={`cal-cell${d.d.getDay()===0||d.d.getDay()===6?' weekend':''}${i===todayIdx?' today':''}`} />
                  ))}
                </div>
                {(state.meetings || []).flatMap((m) =>
                  expandMeetingInstances(m, days[0].date, days[days.length - 1].date)
                ).map((m, idx) => {
                  const left = posFor(m.date);
                  if (left === null) return null;
                  const isRecurring = m.recurrence && m.recurrence !== 'none';
                  return (
                    <div key={`${m.id}-${m.date}`} className="cal-item cal-meeting" style={{ left: left + 2, top: 4, width: DAY_W - 4, cursor: onOpenMeeting ? 'pointer' : 'default' }}
                      onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setTooltip({ kind: 'meeting', data: m, x: rect.left, y: rect.bottom + 6 }); }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => onOpenMeeting && onOpenMeeting(m.id)}>
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
              <div key={p.id} className="cal-row" style={{ gridTemplateColumns: `180px repeat(${range}, ${DAY_W}px)` }}>
                <div className="cal-lane-label" onClick={() => actions.setActiveProject(p.id)} style={{ cursor: 'pointer' }}>
                  <span className={`sb-proj-dot pc-${p.status}`} />
                  <span className="mono" style={{ fontSize: 11 }}>{p.code}</span>
                  <span className="truncate">{p.name.split('—')[1]?.trim() || p.name}</span>
                </div>
                <div className="cal-lane-body" style={{ gridColumn: `2 / span ${range}`, position: 'relative', minHeight: laneH }}
                  onDragOver={onLaneDragOver} onDrop={onLaneDrop} onDragLeave={onLaneDragLeave}>
                  {/* day cell backgrounds */}
                  <div className="cal-lane-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${range}, ${DAY_W}px)` }}>
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
                          style={{ left: left + 2, top, width: DAY_W - 4, opacity: isDraggingThis ? 0.4 : 1, cursor: 'grab' }}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setCalDrag({ kind: 'milestone', id: item.data.id, date: item.data.date }); setTooltip(null); }}
                          onDragEnd={() => { setCalDrag(null); setDragOverDate(null); }}
                          onMouseEnter={onEnter} onMouseLeave={onLeave}>
                          <Icon name="milestone" size={11} /><span className="truncate">{item.data.title}</span>
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
                        onClick={() => actions.openTask(t.id)}
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
          <div className="cal-row cal-daynote-row" style={{ gridTemplateColumns: `180px repeat(${range}, ${DAY_W}px)` }}>
            <div className="cal-lane-label">
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Day notes</span>
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
        <span className="cal-leg-item"><Icon name="milestone" size={11} /> Milestone</span>
        <span className="cal-leg-item"><Icon name="clock" size={10} /> Meeting</span>
        <span className="cal-leg-item"><Icon name="bell" size={10} /> Reminder</span>
        <span className="cal-leg-item" style={{ marginLeft: 'auto', color: 'var(--fg-4)' }}>Click a task or project to open · click day note row to write</span>
      </div>

      {/* Daily log panel */}
      <DailyLogPanel state={state} dayNotes={dayNotes} dayNoteMap={dayNoteMap} onEditNote={openDayNote} />

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
              <div className="cal-tooltip-title"><Icon name="milestone" size={11} /> {tooltip.data.title}</div>
              <div className="cal-tooltip-row"><span className="cal-tooltip-label">Date</span><span>{fmtDate(tooltip.data.date)}</span></div>
              {tooltip.data.deliverable && <div className="cal-tooltip-row"><span className="cal-tooltip-label">Deliverable</span><span>{tooltip.data.deliverable}</span></div>}
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

      {/* Day note modal */}
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

  return [...dateSet].sort((a, b) => b.localeCompare(a)).map((date) => ({
    date,
    tasksCompleted: state.tasks.filter((t) => t.completedAt === date),
    tasksCreated: state.tasks.filter((t) => t.createdAt === date && t.completedAt !== date),
    remindersCreated: (state.reminders || []).filter((r) => r.createdAt === date),
    notesAdded: (state.notes || []).filter((n) => n.date === date),
    milestonesOn: (state.milestones || []).filter((m) => m.date === date),
    dayNote: (state.dayNotes || []).find((n) => n.date === date) || null,
  }));
}

function DailyLogPanel({ state, dayNotes, dayNoteMap, onEditNote }) {
  const log = React.useMemo(() => buildDailyLog(state), [state]);
  const [expanded, setExpanded] = React.useState({});
  const [editingNote, setEditingNote] = React.useState(null); // date being inline-edited
  const [noteDraft, setNoteDraft] = React.useState('');

  if (log.length === 0) return null;

  const toggle = (date) => setExpanded((prev) => ({ ...prev, [date]: !prev[date] }));

  const startEdit = (date, existing) => {
    setEditingNote(date);
    setNoteDraft(existing || '');
  };
  const saveNote = (date) => {
    if (noteDraft.trim()) actions.saveDayNote(date, noteDraft);
    else actions.deleteDayNote(date);
    setEditingNote(null);
  };

  return (
    <div className="cal-daynotes-panel" style={{ marginTop: 12 }}>
      <div className="cal-daynotes-panel-hd">
        <span className="mono" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)' }}>Daily log</span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{log.length} days</span>
      </div>
      <div className="cal-daynotes-list">
        {log.map((entry) => {
          const isOpen = !!expanded[entry.date];
          const d = new Date(entry.date + 'T00:00:00');
          const dow = d.toLocaleDateString('en-US', { weekday: 'short' });
          const totalActivity = entry.tasksCompleted.length + entry.tasksCreated.length + entry.remindersCreated.length + entry.notesAdded.length + entry.milestonesOn.length;
          const chips = [
            entry.tasksCompleted.length && `${entry.tasksCompleted.length} done`,
            entry.tasksCreated.length && `${entry.tasksCreated.length} created`,
            entry.remindersCreated.length && `${entry.remindersCreated.length} reminder${entry.remindersCreated.length > 1 ? 's' : ''}`,
            entry.notesAdded.length && `${entry.notesAdded.length} note${entry.notesAdded.length > 1 ? 's' : ''}`,
            entry.milestonesOn.length && `${entry.milestonesOn.length} milestone`,
            entry.dayNote && 'journal',
          ].filter(Boolean);

          return (
            <div key={entry.date} className="cal-log-entry">
              {/* Header row — always visible, click to expand */}
              <div className="cal-log-hd" onClick={() => toggle(entry.date)}>
                <div className="cal-log-date">
                  <span className="mono" style={{ fontWeight: 600, fontSize: 12 }}>{fmtDate(entry.date)}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{dow}</span>
                </div>
                <div className="cal-log-chips">
                  {chips.map((c) => <span key={c} className="cal-log-chip">{c}</span>)}
                  {chips.length === 0 && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>no activity</span>}
                </div>
                <Icon name={isOpen ? 'chevronD' : 'chevronR'} size={10} />
              </div>

              {/* Expanded body */}
              {isOpen && (
                <div className="cal-log-body" onClick={(e) => e.stopPropagation()}>
                  {/* Auto-summary */}
                  {totalActivity > 0 && (
                    <div className="cal-log-section">
                      <div className="cal-log-section-label">Activity</div>
                      {entry.tasksCompleted.map((t) => (
                        <div key={t.id} className="cal-log-item"><Icon name="check" size={10} /><span className="truncate">{t.title}</span><span className="cal-log-item-meta">{t.priority}</span></div>
                      ))}
                      {entry.tasksCreated.map((t) => (
                        <div key={t.id} className="cal-log-item"><Icon name="plus" size={10} /><span className="truncate">{t.title}</span><span className="cal-log-item-meta">{t.priority}</span></div>
                      ))}
                      {entry.remindersCreated.map((r) => (
                        <div key={r.id} className="cal-log-item"><Icon name="bell" size={10} /><span className="truncate">{r.title}</span><span className="cal-log-item-meta">reminder</span></div>
                      ))}
                      {entry.notesAdded.map((n) => (
                        <div key={n.id} className="cal-log-item"><Icon name="note" size={10} /><span className="truncate">{n.title}</span><span className="cal-log-item-meta">{n.kind}</span></div>
                      ))}
                      {entry.milestonesOn.map((m) => (
                        <div key={m.id} className="cal-log-item"><Icon name="milestone" size={10} /><span className="truncate">{m.title}</span><span className="cal-log-item-meta">milestone</span></div>
                      ))}
                    </div>
                  )}

                  {/* Manual note */}
                  <div className="cal-log-section">
                    <div className="cal-log-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      Journal
                      {entry.dayNote && editingNote !== entry.date && (
                        <button className="icon-btn" style={{ marginLeft: 2 }} onClick={() => startEdit(entry.date, entry.dayNote?.body)}>
                          <Icon name="edit" size={10} />
                        </button>
                      )}
                    </div>
                    {editingNote === entry.date ? (
                      <div>
                        <textarea className="textarea" style={{ minHeight: 80, fontSize: 12.5 }}
                          placeholder="What happened today? Wins, blockers, thoughts…"
                          value={noteDraft} autoFocus
                          onChange={(e) => setNoteDraft(e.target.value)} />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                          <button className="btn btn-sm" onClick={() => setEditingNote(null)}>Cancel</button>
                          <button className="btn btn-primary btn-sm" onClick={() => saveNote(entry.date)}>Save</button>
                        </div>
                      </div>
                    ) : entry.dayNote ? (
                      <div className="cal-log-note-body">{entry.dayNote.body}</div>
                    ) : (
                      <button className="cal-log-add-note" onClick={() => startEdit(entry.date, '')}>
                        <Icon name="plus" size={10} /> Add journal entry
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { CalendarView });
