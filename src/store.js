// Simple localStorage-backed store with React hook integration.
// Single source of truth, shallow-merged updates, immediate persistence.
// Two modes: 'seed' (demo data, read from SEED) and 'local' (blank workspace).

const MODE_KEY  = 'opm.mode';
const SEED_KEY  = 'opm.seed';
const LOCAL_KEY = 'opm.local';

// Legacy key — migrate if present
const LEGACY_KEY = 'opm.v4';

function getMode() {
  return localStorage.getItem(MODE_KEY) || 'seed';
}
function setMode(m) {
  localStorage.setItem(MODE_KEY, m);
}
function getStorageKey() {
  return getMode() === 'local' ? LOCAL_KEY : SEED_KEY;
}

// Keep STORAGE_KEY for backward-compat references in TweaksPanel
const STORAGE_KEY = SEED_KEY;

const LEGACY_PRIORITY = { P0: 'critical', P1: 'high', P2: 'medium', P3: 'low' };
const migP = (p) => LEGACY_PRIORITY[p] || p;

function migratePriorities(state) {
  return {
    ...state,
    tasks: (state.tasks || []).map((t) => ({ ...t, priority: migP(t.priority) })),
    projects: (state.projects || []).map((p) => ({ ...p, priority: migP(p.priority) })),
  };
}

function buildEmptyState() {
  return {
    version: window.SEED.version,
    programs: [],
    projects: [],
    milestones: [],
    tasks: [],
    notes: [],
    risks: [],
    blockers: [],
    meetings: [],
    weeklyReviews: [],
    chatThreads: [],
    reminders: [],
    dailyPlans: {},
    dayNotes: [],
    meta: {
      theme: 'dark',
      density: 'compact',
      accent: 'amber',
      monoIds: true,
      activeView: 'portfolio',
      activeProjectId: null,
      activeProgramId: null,
      lastWeeklyReview: null,
      lastPlanDate: null,
      plannedToday: [],
      yesterdayShipped: [],
      riskFields: ['category', 'response'],
      nextTaskId: 1,
      nextNoteId: 1,
      nextRiskId: 1,
      integrations: {},
    },
  };
}

function loadState() {
  try {
    // One-time migration from legacy key
    if (!localStorage.getItem(SEED_KEY) && localStorage.getItem(LEGACY_KEY)) {
      localStorage.setItem(SEED_KEY, localStorage.getItem(LEGACY_KEY));
      localStorage.removeItem(LEGACY_KEY);
    }
    const key = getStorageKey();
    const raw = localStorage.getItem(key);
    const isLocal = getMode() === 'local';
    if (!raw) return isLocal ? buildEmptyState() : structuredClone(window.SEED);
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== window.SEED.version) {
      return isLocal ? buildEmptyState() : structuredClone(window.SEED);
    }
    return migratePriorities(parsed);
  } catch (e) {
    console.warn('[store] failed to load, using default', e);
    return getMode() === 'local' ? buildEmptyState() : structuredClone(window.SEED);
  }
}

function saveState(state) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  } catch (e) {
    console.error('[store] localStorage save failed', e);
  }
  if (getMode() !== 'local') saveToServer(state);
}

let _serverSaveTimer = null;
function saveToServer(state) {
  clearTimeout(_serverSaveTimer);
  _serverSaveTimer = setTimeout(() => {
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => {}); // silently ignore — app works fine without server
  }, 600);
}

async function loadFromServer() {
  if (getMode() === 'local') return; // local workspace is localStorage-only
  try {
    const res = await fetch('/api/data');
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.version) return;
    if (data.version !== window.SEED.version) {
      STATE = getMode() === 'local' ? buildEmptyState() : structuredClone(window.SEED);
      saveState(STATE);
      subscribers.forEach((fn) => fn());
      console.log('[store] server data version mismatch — reseeded');
      return;
    }
    STATE = migratePriorities(data);
    try { localStorage.setItem(getStorageKey(), JSON.stringify(STATE)); } catch {}
    subscribers.forEach((fn) => fn());
    console.log('[store] loaded from server');
  } catch {
    // Not running via server (opened as plain file) — that's fine
  }
}

// Subscriber list; React hook subscribes for re-renders.
const subscribers = new Set();
let STATE = loadState();

function setState(updater) {
  const next = typeof updater === 'function' ? updater(STATE) : { ...STATE, ...updater };
  STATE = next;
  saveState(STATE);
  subscribers.forEach((fn) => fn());
}

function getState() {
  return STATE;
}

function useStore() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    subscribers.add(force);
    return () => subscribers.delete(force);
  }, []);
  return STATE;
}

// --- Actions ---
const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

const actions = {
  setMeta(patch) {
    setState((s) => ({ ...s, meta: { ...s.meta, ...patch } }));
  },

  // Tasks
  addTask(task) {
    const existingMax = Math.max(0, ...STATE.tasks.map((t) => { const n = parseInt(t.id.replace(/^t-/, '')); return isNaN(n) ? 0 : n; }));
    const seq = Math.max(STATE.meta.nextTaskId || 0, existingMax + 1);
    const t = {
      id: `t-${seq}`,
      status: 'todo',
      priority: 'medium',
      rank: 99,
      blockers: [],
      createdAt: todayStr(),
      updatedAt: todayStr(),
      source: 'planned',
      estimate: 1,
      ...task,
    };
    setState((s) => ({ ...s, tasks: [...s.tasks, t], meta: { ...s.meta, nextTaskId: seq + 1 } }));
    return t;
  },
  updateTask(id, patch) {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: todayStr() } : t)),
    }));
  },
  toggleTaskDone(id, completionNote) {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const wasDone = t.status === 'done';
        const today = todayStr();
        const daysEarlyLate = (!wasDone && t.dueDate)
          ? Math.round((new Date(t.dueDate) - new Date(today)) / 86400000)
          : null; // positive = early, negative = late
        return {
          ...t,
          status: wasDone ? 'todo' : 'done',
          completedAt: wasDone ? null : today,
          daysEarlyLate: wasDone ? null : daysEarlyLate,
          completionNote: wasDone ? null : (completionNote || null),
          updatedAt: today,
        };
      }),
    }));
  },
  deleteTask(id) {
    setState((s) => ({
      ...s,
      tasks: s.tasks.filter((t) => t.id !== id),
      blockers: s.blockers.filter((b) => b.taskId !== id),
    }));
  },
  reorderTasks(projectId, priority, orderedIds) {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => {
        if (t.projectId !== projectId || t.priority !== priority) return t;
        const rank = orderedIds.indexOf(t.id);
        return rank >= 0 ? { ...t, rank: rank + 1, updatedAt: todayStr() } : t;
      }),
    }));
  },

  // Programs
  addProgram(p) {
    const prog = { id: uid('pg'), name: p.name || 'New Program', description: p.description || '', status: 'active', createdAt: todayStr() };
    setState((s) => ({ ...s, programs: [...(s.programs || []), prog] }));
    return prog;
  },
  updateProgram(id, patch) {
    setState((s) => ({ ...s, programs: (s.programs || []).map((pg) => (pg.id === id ? { ...pg, ...patch } : pg)) }));
  },
  deleteProgram(id) {
    setState((s) => ({
      ...s,
      programs: (s.programs || []).filter((pg) => pg.id !== id),
      projects: s.projects.map((p) => p.programId === id ? { ...p, programId: null } : p),
    }));
  },

  // Projects
  addProject(p) {
    const proj = {
      id: uid('p'),
      code: (p.name || 'NEW').slice(0, 5).toUpperCase(),
      color: 'amber',
      priority: 'medium',
      status: 'on-track',
      owner: 'You',
      objective: '',
      successCriteria: [],
      startDate: todayStr(),
      dueDate: todayStr(),
      createdAt: todayStr(),
      ...p,
    };
    setState((s) => ({ ...s, projects: [...s.projects, proj], meta: { ...s.meta, activeProjectId: proj.id } }));
    return proj;
  },
  updateProject(id, patch) {
    if (patch.status === 'closed') { actions.closeProject(id); return; }
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  },
  closeProject(id) {
    const today = todayStr();
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => p.id === id ? { ...p, status: 'closed', closedDate: today } : p),
      tasks: s.tasks.map((t) => (t.projectId === id && t.status !== 'done' && t.status !== 'cancelled') ? { ...t, status: 'cancelled', cancelledAt: today, updatedAt: today } : t),
      milestones: s.milestones.map((m) => (m.projectId === id && m.status !== 'done' && m.status !== 'cancelled') ? { ...m, status: 'cancelled' } : m),
      notes: s.notes.map((n) => {
        if (n.projectId !== id || n.cancelled) return n;
        if (n.kind === 'question' && !n.resolved) return { ...n, cancelled: true, cancelledAt: today };
        if (n.kind === 'decision') return { ...n, cancelled: true, cancelledAt: today };
        return n;
      }),
      risks: s.risks.map((r) => (r.projectId === id && r.status !== 'closed' && r.status !== 'cancelled') ? { ...r, status: 'cancelled', cancelledAt: today } : r),
    }));
  },
  deleteProject(id) {
    setState((s) => ({
      ...s,
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.filter((t) => t.projectId !== id),
      milestones: s.milestones.filter((m) => m.projectId !== id),
      notes: s.notes.filter((n) => n.projectId !== id),
      risks: s.risks.filter((r) => r.projectId !== id),
      meetings: (s.meetings || []).map((m) => ({ ...m, projectIds: (m.projectIds || []).filter((pid) => pid !== id) })),
    }));
  },

  // Milestones
  addMilestone(m) {
    const ms = { id: uid('m'), status: 'planned', ...m };
    setState((s) => ({ ...s, milestones: [...s.milestones, ms] }));
  },
  updateMilestone(id, patch) {
    setState((s) => ({
      ...s,
      milestones: s.milestones.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, ...patch };
        if (patch.status === 'done' && m.status !== 'done') {
          const today = todayStr();
          updated.completedDate = today;
          updated.daysEarlyLate = Math.round((new Date(m.date) - new Date(today)) / 86400000);
        }
        if (patch.status && patch.status !== 'done' && m.status === 'done') {
          updated.completedDate = null;
          updated.daysEarlyLate = null;
        }
        return updated;
      }),
    }));
  },
  deleteMilestone(id) {
    setState((s) => ({ ...s, milestones: s.milestones.filter((m) => m.id !== id) }));
  },

  // Notes
  addNote(n) {
    const existingMax = Math.max(0, ...STATE.notes.map((x) => { const num = parseInt(x.id.replace(/^n-/, '')); return isNaN(num) ? 0 : num; }));
    const seq = Math.max(STATE.meta.nextNoteId || 0, existingMax + 1);
    const note = { id: `n-${seq}`, kind: 'decision', date: todayStr(), tags: [], ...n };
    setState((s) => ({ ...s, notes: [note, ...s.notes], meta: { ...s.meta, nextNoteId: seq + 1 } }));
    return note;
  },
  updateNote(id, patch) {
    setState((s) => ({ ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  },
  deleteNote(id) {
    setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
  },

  // Risks
  addRisk(r) {
    const existingMax = Math.max(0, ...STATE.risks.map((x) => { const n = parseInt(x.id.replace(/^r-/, '')); return isNaN(n) ? 0 : n; }));
    const seq = Math.max(STATE.meta.nextRiskId || 0, existingMax + 1);
    const risk = {
      id: `r-${seq}`,
      severity: 3,
      likelihood: 3,
      mitigation: '',
      owner: 'You',
      status: 'open',
      createdAt: todayStr(),
      updatedAt: todayStr(),
      category: '',
      response: '',
      description: '',
      impact: '',
      trigger: '',
      contingency: '',
      dueDate: '',
      reviewDate: '',
      ...r,
    };
    setState((s) => ({ ...s, risks: [...s.risks, risk], meta: { ...s.meta, nextRiskId: seq + 1 } }));
    return risk;
  },
  updateRisk(id, patch) {
    setState((s) => ({ ...s, risks: s.risks.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: todayStr() } : r)) }));
  },
  deleteRisk(id) {
    setState((s) => ({ ...s, risks: s.risks.filter((r) => r.id !== id) }));
  },
  setRiskFields(fields) {
    setState((s) => ({ ...s, meta: { ...s.meta, riskFields: fields } }));
  },

  // Meetings
  addMeeting(m) {
    const meeting = { id: uid('mt'), createdAt: todayStr(), attendees: '', notes: '', ...m };
    setState((s) => ({ ...s, meetings: [meeting, ...(s.meetings || [])] }));
  },
  updateMeeting(id, patch) {
    setState((s) => ({ ...s, meetings: (s.meetings || []).map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  },
  deleteMeeting(id) {
    setState((s) => ({ ...s, meetings: (s.meetings || []).filter((m) => m.id !== id) }));
  },

  // Blockers
  addBlocker(b) {
    const blocker = { id: uid('bl'), since: todayStr(), ...b };
    setState((s) => ({
      ...s,
      blockers: [...s.blockers, blocker],
      tasks: s.tasks.map((t) =>
        t.id === b.taskId ? { ...t, status: 'blocked', blockers: [...(t.blockers || []), blocker.id] } : t
      ),
    }));
  },
  resolveBlocker(id) {
    setState((s) => {
      const bl = s.blockers.find((b) => b.id === id);
      return {
        ...s,
        blockers: s.blockers.filter((b) => b.id !== id),
        tasks: s.tasks.map((t) => {
          if (!bl || t.id !== bl.taskId) return t;
          const remaining = (t.blockers || []).filter((x) => x !== id);
          return { ...t, blockers: remaining, status: remaining.length ? t.status : 'todo' };
        }),
      };
    });
  },

  // Weekly reviews
  addWeeklyReview(wr) {
    const snap = (tasks) => (tasks || []).map((t) => ({ id: t.id, title: t.title, priority: t.priority, projectId: t.projectId, estimate: t.estimate, daysEarlyLate: t.daysEarlyLate, completionNote: t.completionNote }));
    const review = {
      id: uid('wr'),
      weekOf: todayStr(),
      ...wr,
      completedTasks: snap(wr.completedTasks),
      delayedTasks: snap(wr.delayedTasks),
      blockedTasks: snap(wr.blockedTasks),
    };
    setState((s) => ({
      ...s,
      weeklyReviews: [review, ...s.weeklyReviews],
      meta: { ...s.meta, lastWeeklyReview: review.weekOf },
    }));
  },

  // Chat
  addChatThread(title) {
    const t = { id: uid('ct'), title: title || 'New conversation', createdAt: todayStr(), messages: [] };
    setState((s) => ({ ...s, chatThreads: [t, ...(s.chatThreads || [])] }));
    return t;
  },
  appendChatMessage(threadId, msg) {
    setState((s) => ({
      ...s,
      chatThreads: (s.chatThreads || []).map((t) => t.id === threadId ? { ...t, messages: [...t.messages, msg] } : t),
    }));
  },

  // Task dependencies
  setTaskDependency(taskId, dependsOnIds) {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => t.id === taskId ? { ...t, dependsOn: dependsOnIds, updatedAt: todayStr() } : t),
    }));
  },
  togglePinned(kind, id) {
    setState((s) => ({
      ...s,
      [kind]: s[kind].map((x) => x.id === id ? { ...x, pinned: !x.pinned } : x),
    }));
  },

  // Daily plan
  setPlannedToday(ids) {
    setState((s) => ({
      ...s,
      meta: { ...s.meta, plannedToday: ids, lastPlanDate: todayStr() },
    }));
  },
  rolloverPlan() {
    // Move uncompleted planned tasks into "yesterdayShipped" summary; clear plan.
    setState((s) => {
      const shipped = (s.meta.plannedToday || []).filter((id) => {
        const t = s.tasks.find((tt) => tt.id === id);
        return t && t.status === 'done';
      });
      return {
        ...s,
        meta: { ...s.meta, yesterdayShipped: shipped, plannedToday: [], lastPlanDate: null },
      };
    });
  },

  // Success criteria (stored on project)
  addSuccessCriterion(projectId, sc) {
    const item = { id: uid('sc'), text: '', current: '', target: '', ...sc };
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, successCriteria: [...(p.successCriteria || []), item] } : p
      ),
    }));
  },
  updateSuccessCriterion(projectId, scId, patch) {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, successCriteria: (p.successCriteria || []).map((sc) => sc.id === scId ? { ...sc, ...patch } : sc) }
          : p
      ),
    }));
  },
  deleteSuccessCriterion(projectId, scId) {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, successCriteria: (p.successCriteria || []).filter((sc) => sc.id !== scId) }
          : p
      ),
    }));
  },

  // Calendar reminders
  addReminder(r) {
    const rem = { id: uid('rem'), date: todayStr(), title: '', note: '', createdAt: todayStr(), ...r };
    setState((s) => ({ ...s, reminders: [...(s.reminders || []), rem] }));
  },
  updateReminder(id, patch) {
    setState((s) => ({ ...s, reminders: (s.reminders || []).map((r) => r.id === id ? { ...r, ...patch } : r) }));
  },
  deleteReminder(id) {
    setState((s) => ({ ...s, reminders: (s.reminders || []).filter((r) => r.id !== id) }));
  },

  // Daily plan artifacts (one per day, keyed by date)
  saveDailyPlan(date, planData) {
    setState((s) => ({
      ...s,
      dailyPlans: { ...(s.dailyPlans || {}), [date]: planData },
    }));
  },
  updateDailyPlan(date, patch) {
    setState((s) => ({
      ...s,
      dailyPlans: {
        ...(s.dailyPlans || {}),
        [date]: { ...(s.dailyPlans?.[date] || {}), ...patch },
      },
    }));
  },

  // Day notes (EOD notes keyed by date)
  saveDayNote(date, body) {
    setState((s) => {
      const existing = (s.dayNotes || []).find((n) => n.date === date);
      if (existing) {
        return { ...s, dayNotes: s.dayNotes.map((n) => n.date === date ? { ...n, body } : n) };
      }
      return { ...s, dayNotes: [...(s.dayNotes || []), { date, body, createdAt: todayStr() }] };
    });
  },
  deleteDayNote(date) {
    setState((s) => ({ ...s, dayNotes: (s.dayNotes || []).filter((n) => n.date !== date) }));
  },

  // Jira / Confluence live data
  setJiraData({ jiraProjects, jiraIssues, sprints }) {
    setState((s) => ({ ...s, jiraProjects: jiraProjects || s.jiraProjects, jiraIssues: jiraIssues || s.jiraIssues, sprints: sprints || s.sprints }));
  },
  setConfluenceData({ confluenceSpaces, confluencePages }) {
    setState((s) => ({ ...s, confluenceSpaces: confluenceSpaces || s.confluenceSpaces, confluencePages: confluencePages || s.confluencePages }));
  },

  // Shift a project and all its associated dates by deltaDays (atomic single setState)
  shiftProjectDates(projectId, deltaDays) {
    if (!deltaDays || deltaDays === 0) return;
    const shift = (s) => {
      if (!s) return s;
      const d = new Date(s + 'T00:00:00');
      d.setDate(d.getDate() + deltaDays);
      return d.toISOString().slice(0, 10);
    };
    const today = todayStr();
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => p.id === projectId
        ? { ...p, startDate: shift(p.startDate), dueDate: shift(p.dueDate) }
        : p),
      milestones: s.milestones.map((m) => m.projectId === projectId
        ? { ...m, date: shift(m.date) }
        : m),
      tasks: s.tasks.map((t) => (t.projectId === projectId && t.dueDate)
        ? { ...t, dueDate: shift(t.dueDate), updatedAt: today }
        : t),
      risks: s.risks.map((r) => (r.projectId === projectId && r.dueDate)
        ? { ...r, dueDate: shift(r.dueDate), updatedAt: today }
        : r),
    }));
  },

  // Admin
  resetAll() {
    localStorage.removeItem(getStorageKey());
    STATE = getMode() === 'local' ? buildEmptyState() : structuredClone(window.SEED);
    saveState(STATE);
    subscribers.forEach((fn) => fn());
  },
};

// On load, pull latest data from server (overrides localStorage if server has data)
window.addEventListener('load', () => { setTimeout(loadFromServer, 0); });

Object.assign(window, { useStore, getState, setState, actions, STORAGE_KEY, getMode, setMode });
