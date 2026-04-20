// Simple localStorage-backed store with React hook integration.
// Single source of truth, shallow-merged updates, immediate persistence.

const STORAGE_KEY = 'opm.v4';

const LEGACY_PRIORITY = { P0: 'critical', P1: 'high', P2: 'medium', P3: 'low' };
const migP = (p) => LEGACY_PRIORITY[p] || p;

function migratePriorities(state) {
  return {
    ...state,
    tasks: (state.tasks || []).map((t) => ({ ...t, priority: migP(t.priority) })),
    projects: (state.projects || []).map((p) => ({ ...p, priority: migP(p.priority) })),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(window.SEED);
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== window.SEED.version) {
      return structuredClone(window.SEED);
    }
    return migratePriorities(parsed);
  } catch (e) {
    console.warn('[store] failed to load, seeding', e);
    return structuredClone(window.SEED);
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('[store] localStorage save failed', e);
  }
  saveToServer(state);
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
  try {
    const res = await fetch('/api/data');
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.version) return;
    if (data.version !== window.SEED.version) {
      STATE = structuredClone(window.SEED);
      saveState(STATE);
      subscribers.forEach((fn) => fn());
      console.log('[store] server data version mismatch — reseeded');
      return;
    }
    STATE = migratePriorities(data);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); } catch {}
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
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
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

  // Admin
  resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    STATE = structuredClone(window.SEED);
    saveState(STATE);
    subscribers.forEach((fn) => fn());
  },
};

// On load, pull latest data from server (overrides localStorage if server has data)
window.addEventListener('load', () => { setTimeout(loadFromServer, 0); });

Object.assign(window, { useStore, getState, setState, actions, STORAGE_KEY });
