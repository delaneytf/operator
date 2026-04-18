// Seed data for a realistic solo-operator portfolio.
// Dates are relative to "today" so the seed always feels current.

const today = new Date();
const d = (offset) => {
  const x = new Date(today);
  x.setDate(x.getDate() + offset);
  return x.toISOString().slice(0, 10);
};

const SEED = {
  version: 6,
  meta: {
    theme: 'dark',
    density: 'compact',
    accent: 'amber',
    monoIds: true,
    activeView: 'portfolio',
    activeProjectId: 'p-atlas',
    lastWeeklyReview: d(-6),
    lastPlanDate: null,
    plannedToday: [],
    yesterdayShipped: [],
    integrations: {
      jira: { connected: true, site: 'acme.atlassian.net', user: 'you@acme.co', syncedAt: d(0) },
      confluence: { connected: true, site: 'acme.atlassian.net', user: 'you@acme.co', syncedAt: d(0) },
    },
  },
  projects: [
    {
      id: 'p-atlas',
      code: 'ATLAS',
      name: 'Atlas — Product relaunch',
      color: 'amber',
      priority: 'critical',
      status: 'on-track',
      owner: 'You',
      objective: 'Ship v2 of Atlas with new positioning and pricing by end of Q2.',
      successCriteria: [
        { id: 'sc-1', text: '30% uplift in landing → trial conversion', target: '30%', current: '18%' },
        { id: 'sc-2', text: 'Pricing page CTR > 12%', target: '12%', current: '9.4%' },
        { id: 'sc-3', text: 'NPS among trial users ≥ 40', target: '40', current: '—' },
      ],
      startDate: d(-42),
      dueDate: d(38),
      createdAt: d(-42),
    },
    {
      id: 'p-helios',
      code: 'HELIOS',
      name: 'Helios — Fundraise prep',
      color: 'rose',
      priority: 'critical',
      status: 'at-risk',
      owner: 'You',
      objective: 'Close Series A bridge round of $2.5M by July.',
      successCriteria: [
        { id: 'sc-1', text: 'Term sheet signed', target: '1', current: '0' },
        { id: 'sc-2', text: 'Data room complete', target: '100%', current: '72%' },
      ],
      startDate: d(-28),
      dueDate: d(52),
      createdAt: d(-28),
    },
    {
      id: 'p-orbit',
      code: 'ORBIT',
      name: 'Orbit — Customer research',
      color: 'sky',
      priority: 'high',
      status: 'on-track',
      owner: 'You',
      objective: 'Interview 20 power users and publish a synthesis doc informing roadmap.',
      successCriteria: [
        { id: 'sc-1', text: '20 interviews completed', target: '20', current: '14' },
        { id: 'sc-2', text: 'Synthesis doc shipped', target: '1', current: '0' },
      ],
      startDate: d(-21),
      dueDate: d(14),
      createdAt: d(-21),
    },
    {
      id: 'p-vega',
      code: 'VEGA',
      name: 'Vega — Internal ops cleanup',
      color: 'violet',
      priority: 'medium',
      status: 'blocked',
      owner: 'You',
      objective: 'Consolidate finance + CRM tooling; reduce monthly ops time by 50%.',
      successCriteria: [
        { id: 'sc-1', text: 'Monthly ops time < 6 hrs', target: '6h', current: '12h' },
      ],
      startDate: d(-60),
      dueDate: d(25),
      createdAt: d(-60),
    },
    {
      id: 'p-nova',
      code: 'NOVA',
      name: 'Nova — Q3 planning',
      color: 'emerald',
      priority: 'medium',
      status: 'on-track',
      owner: 'You',
      objective: 'Draft Q3 plan with three bets, metrics, and resourcing.',
      successCriteria: [
        { id: 'sc-1', text: 'Plan reviewed with advisors', target: '3', current: '1' },
      ],
      startDate: d(-7),
      dueDate: d(21),
      createdAt: d(-7),
    },
  ],
  milestones: [
    // ATLAS
    { id: 'm-a1', projectId: 'p-atlas', title: 'Positioning narrative locked', date: d(-14), status: 'done', deliverable: 'Narrative doc v3' },
    { id: 'm-a2', projectId: 'p-atlas', title: 'Pricing page live', date: d(-3), status: 'done', deliverable: 'Landing + /pricing' },
    { id: 'm-a3', projectId: 'p-atlas', title: 'Private beta opens', date: d(10), status: 'in-progress', deliverable: '50 invites sent' },
    { id: 'm-a4', projectId: 'p-atlas', title: 'Public launch', date: d(38), status: 'planned', deliverable: 'Launch day assets' },
    // HELIOS
    { id: 'm-h1', projectId: 'p-helios', title: 'Data room v1', date: d(-10), status: 'done', deliverable: 'DR folder shared' },
    { id: 'm-h2', projectId: 'p-helios', title: 'Deck final', date: d(4), status: 'in-progress', deliverable: 'PDF + narrative' },
    { id: 'm-h3', projectId: 'p-helios', title: 'First meetings', date: d(12), status: 'planned', deliverable: '8 intros booked' },
    { id: 'm-h4', projectId: 'p-helios', title: 'Term sheet', date: d(52), status: 'planned', deliverable: 'Signed TS' },
    // ORBIT
    { id: 'm-o1', projectId: 'p-orbit', title: 'Interview guide', date: d(-18), status: 'done', deliverable: 'Guide v2' },
    { id: 'm-o2', projectId: 'p-orbit', title: '20 interviews complete', date: d(7), status: 'in-progress', deliverable: 'All transcripts' },
    { id: 'm-o3', projectId: 'p-orbit', title: 'Synthesis published', date: d(14), status: 'planned', deliverable: 'Doc + summary deck' },
    // VEGA
    { id: 'm-v1', projectId: 'p-vega', title: 'Tooling audit', date: d(-40), status: 'done', deliverable: 'Audit spreadsheet' },
    { id: 'm-v2', projectId: 'p-vega', title: 'Vendor selected', date: d(-7), status: 'blocked', deliverable: 'Contract' },
    { id: 'm-v3', projectId: 'p-vega', title: 'Migration complete', date: d(25), status: 'planned', deliverable: 'All data moved' },
    // NOVA
    { id: 'm-n1', projectId: 'p-nova', title: 'Bets drafted', date: d(3), status: 'in-progress', deliverable: '3 bet memos' },
    { id: 'm-n2', projectId: 'p-nova', title: 'Advisor review', date: d(14), status: 'planned', deliverable: 'Meeting notes' },
    { id: 'm-n3', projectId: 'p-nova', title: 'Plan published', date: d(21), status: 'planned', deliverable: 'Q3 plan doc' },
  ],
  tasks: [
    // ATLAS tasks
    { id: 't-1', projectId: 'p-atlas', objectiveId: 'sc-1', title: 'Rewrite hero copy with new positioning', status: 'in-progress', priority: 'P0', rank: 1, dueDate: d(0), blockers: [], dependsOn: ['t-7'], pinned: true, createdAt: d(-3), updatedAt: d(0), estimate: 2, source: 'planned' },
    { id: 't-2', projectId: 'p-atlas', objectiveId: 'sc-2', title: 'A/B test pricing CTA variants', status: 'todo', priority: 'P0', rank: 2, dueDate: d(2), blockers: [], createdAt: d(-5), updatedAt: d(-1), estimate: 3, source: 'planned' },
    { id: 't-3', projectId: 'p-atlas', objectiveId: 'sc-1', title: 'Fix broken analytics events on /trial', status: 'todo', priority: 'P1', rank: 1, dueDate: d(1), blockers: [], createdAt: d(-1), updatedAt: d(-1), estimate: 1, source: 'reactive' },
    { id: 't-4', projectId: 'p-atlas', objectiveId: 'sc-3', title: 'Draft beta welcome email sequence', status: 'todo', priority: 'P1', rank: 2, dueDate: d(4), blockers: [], dependsOn: ['t-3'], createdAt: d(-2), updatedAt: d(-2), estimate: 2, source: 'planned' },
    { id: 't-5', projectId: 'p-atlas', objectiveId: 'sc-1', title: 'Record product walkthrough video', status: 'todo', priority: 'P2', rank: 1, dueDate: d(7), blockers: [], createdAt: d(-2), updatedAt: d(-2), estimate: 3, source: 'planned' },
    { id: 't-6', projectId: 'p-atlas', objectiveId: 'sc-2', title: 'Legal review of pricing tiers', status: 'done', priority: 'P1', rank: 3, dueDate: d(-2), blockers: [], createdAt: d(-8), updatedAt: d(-2), completedAt: d(-2), estimate: 1, source: 'planned' },
    { id: 't-7', projectId: 'p-atlas', objectiveId: 'sc-1', title: 'Finalize positioning doc', status: 'done', priority: 'P0', rank: 4, dueDate: d(-14), blockers: [], createdAt: d(-20), updatedAt: d(-14), completedAt: d(-14), estimate: 5, source: 'planned' },

    // HELIOS tasks
    { id: 't-10', projectId: 'p-helios', objectiveId: 'sc-2', title: 'Finish financial model v4', status: 'in-progress', priority: 'P0', rank: 1, dueDate: d(-1), blockers: [], pinned: true, createdAt: d(-6), updatedAt: d(0), estimate: 4, source: 'planned' },
    { id: 't-11', projectId: 'p-helios', objectiveId: 'sc-2', title: 'Upload cap table to data room', status: 'todo', priority: 'P0', rank: 2, dueDate: d(0), blockers: ['bl-1'], createdAt: d(-3), updatedAt: d(-1), estimate: 1, source: 'planned' },
    { id: 't-12', projectId: 'p-helios', objectiveId: 'sc-1', title: 'Draft intro email templates', status: 'todo', priority: 'P1', rank: 1, dueDate: d(3), blockers: [], createdAt: d(-2), updatedAt: d(-2), estimate: 1, source: 'planned' },
    { id: 't-13', projectId: 'p-helios', objectiveId: 'sc-1', title: 'Prep Q&A doc for investor calls', status: 'todo', priority: 'P1', rank: 2, dueDate: d(5), blockers: [], dependsOn: ['t-14'], createdAt: d(-2), updatedAt: d(-2), estimate: 3, source: 'planned' },
    { id: 't-14', projectId: 'p-helios', objectiveId: 'sc-2', title: 'Deck: narrative pass with advisor', status: 'in-progress', priority: 'P0', rank: 3, dueDate: d(1), blockers: [], createdAt: d(-4), updatedAt: d(0), estimate: 2, source: 'planned' },

    // ORBIT tasks
    { id: 't-20', projectId: 'p-orbit', objectiveId: 'sc-1', title: 'Schedule remaining 6 interviews', status: 'in-progress', priority: 'P0', rank: 1, dueDate: d(2), blockers: [], createdAt: d(-4), updatedAt: d(0), estimate: 2, source: 'planned' },
    { id: 't-21', projectId: 'p-orbit', objectiveId: 'sc-1', title: 'Transcribe last 4 interviews', status: 'todo', priority: 'P1', rank: 1, dueDate: d(4), blockers: [], createdAt: d(-2), updatedAt: d(-2), estimate: 2, source: 'planned' },
    { id: 't-22', projectId: 'p-orbit', objectiveId: 'sc-2', title: 'Code themes across 14 transcripts', status: 'todo', priority: 'P0', rank: 2, dueDate: d(6), blockers: [], dependsOn: ['t-21'], createdAt: d(-2), updatedAt: d(-2), estimate: 4, source: 'planned' },
    { id: 't-23', projectId: 'p-orbit', objectiveId: 'sc-2', title: 'Draft synthesis outline', status: 'todo', priority: 'P1', rank: 2, dueDate: d(8), blockers: [], dependsOn: ['t-22'], createdAt: d(-1), updatedAt: d(-1), estimate: 2, source: 'planned' },

    // VEGA tasks
    { id: 't-30', projectId: 'p-vega', objectiveId: 'sc-1', title: 'Chase Acme contract redlines', status: 'blocked', priority: 'P0', rank: 1, dueDate: d(-4), blockers: ['bl-2'], createdAt: d(-12), updatedAt: d(-4), estimate: 1, source: 'reactive' },
    { id: 't-31', projectId: 'p-vega', objectiveId: 'sc-1', title: 'Export CRM data for migration', status: 'todo', priority: 'P1', rank: 1, dueDate: d(10), blockers: ['bl-2'], dependsOn: ['t-30'], createdAt: d(-10), updatedAt: d(-10), estimate: 2, source: 'planned' },
    { id: 't-32', projectId: 'p-vega', objectiveId: 'sc-1', title: 'Write SOP for monthly close', status: 'todo', priority: 'P2', rank: 1, dueDate: d(18), blockers: [], createdAt: d(-8), updatedAt: d(-8), estimate: 2, source: 'planned' },

    // NOVA tasks
    { id: 't-40', projectId: 'p-nova', objectiveId: 'sc-1', title: 'Bet #1 memo: distribution', status: 'in-progress', priority: 'P1', rank: 1, dueDate: d(2), blockers: [], createdAt: d(-4), updatedAt: d(0), estimate: 3, source: 'planned' },
    { id: 't-41', projectId: 'p-nova', objectiveId: 'sc-1', title: 'Bet #2 memo: platform', status: 'todo', priority: 'P1', rank: 2, dueDate: d(4), blockers: [], createdAt: d(-3), updatedAt: d(-3), estimate: 3, source: 'planned' },
    { id: 't-42', projectId: 'p-nova', objectiveId: 'sc-1', title: 'Bet #3 memo: monetization', status: 'todo', priority: 'P2', rank: 1, dueDate: d(6), blockers: [], createdAt: d(-2), updatedAt: d(-2), estimate: 3, source: 'planned' },
  ],
  blockers: [
    { id: 'bl-1', taskId: 't-11', description: 'Waiting on counsel to return clean cap table', waitingOn: 'Sasha (legal)', since: d(-3), kind: 'blocker' },
    { id: 'bl-2', taskId: 't-30', description: 'Vendor silent on redlines for 9 days', waitingOn: 'Acme Vendor', since: d(-9), kind: 'blocker' },
    { id: 'bl-3', taskId: 't-12', description: 'Intro email list approval', waitingOn: 'Advisor Priya C.', since: d(-2), kind: 'waiting' },
    { id: 'bl-4', taskId: 't-40', description: 'Distribution data from growth', waitingOn: 'Dev Bhatt', since: d(-4), kind: 'waiting' },
  ],
  notes: [
    // ATLAS
    { id: 'n-1', projectId: 'p-atlas', kind: 'decision', title: 'Keep free tier, remove team tier', body: 'After pricing research, consolidated to Free / Pro / Enterprise. Team tier cannibalized Pro.', date: d(-8), tags: ['pricing'], context: 'Three tier structures tested with 12 prospects. Team tier was explainable but nobody picked it over Pro.', options: 'A) Keep all 4 tiers. B) Drop team. C) Drop enterprise and sell custom.', reversibility: 'reversible', pinned: true },
    { id: 'n-2', projectId: 'p-atlas', kind: 'decision', title: 'Ship landing before beta', body: 'Trade-off: landing pushes beta by 1 week but compounds top-of-funnel.', date: d(-15), tags: ['sequencing'], context: 'Beta ready but landing v2 lagging. Launching beta on v1 landing would bleed trials.', options: 'A) Ship both together (delay beta). B) Ship beta now, landing later. C) Ship beta as invite-only and wait on landing.', reversibility: 'reversible' },
    { id: 'n-3', projectId: 'p-atlas', kind: 'question', title: 'Do we need SOC2 for launch?', body: 'Two enterprise prospects asked. Unknown if gating. Check with 3 more.', date: d(-2), tags: ['enterprise', 'compliance'] },
    { id: 'n-4', projectId: 'p-atlas', kind: 'artifact', title: 'Positioning doc v3', body: 'Notion link', date: d(-14), tags: ['doc'] },

    // HELIOS
    { id: 'n-10', projectId: 'p-helios', kind: 'decision', title: 'Target bridge over priced round', body: 'Faster, less dilution at current metrics. Revisit in 6 months.', date: d(-21), tags: ['strategy'], context: 'Runway 7 months. Metrics improving but not yet top-quartile. Priced round likely forces down-round markdown.', options: 'A) Priced Series A at $18-22 pre. B) SAFE bridge at $28 cap. C) Revenue-based financing.', reversibility: 'irreversible', pinned: true },
    { id: 'n-11', projectId: 'p-helios', kind: 'question', title: 'What valuation anchors do we give?', body: 'Advisor says start at 28; floor 22. Need 3 more data points.', date: d(-5), tags: ['negotiation'] },
    { id: 'n-12', projectId: 'p-helios', kind: 'artifact', title: 'Data room v1 link', body: 'Drive folder — shared read-only.', date: d(-10), tags: ['dataroom'] },

    // ORBIT
    { id: 'n-20', projectId: 'p-orbit', kind: 'decision', title: 'Interview only power users (>20hrs/wk)', body: 'Skipping casual users keeps signal density high.', date: d(-18), tags: ['scoping'], context: 'Waitlist mixed power + casual. Time-boxed to 20 interviews.', options: 'A) Balanced sample. B) Power-user only. C) Stratified by company size.', reversibility: 'reversible' },
    { id: 'n-21', projectId: 'p-orbit', kind: 'question', title: 'Emerging theme: workflow handoffs', body: '8/14 mention breakage at handoff. Worth a dedicated interview pass?', date: d(-3), tags: ['insight'] },

    // VEGA
    { id: 'n-30', projectId: 'p-vega', kind: 'decision', title: 'Consolidate on Ramp + Attio', body: 'Drop 3 other tools. Savings: $410/mo.', date: d(-30), tags: ['tooling'], context: 'Five overlapping tools. Ramp + Attio cover 90% of use.', options: 'A) Status quo. B) Consolidate to Ramp + Attio. C) Build internal.', reversibility: 'reversible' },

    // NOVA
    { id: 'n-40', projectId: 'p-nova', kind: 'question', title: 'Bet sizing — 60/30/10 or equal?', body: 'Lean toward weighted. Ask advisor.', date: d(-3), tags: ['planning'] },
  ],
  risks: [
    { id: 'r-1', projectId: 'p-atlas', title: 'Beta pool too small for signal', severity: 4, likelihood: 3, mitigation: 'Expand waitlist sources; reserve 10 slots for warm intros.', owner: 'You', status: 'open', createdAt: d(-10) },
    { id: 'r-2', projectId: 'p-atlas', title: 'Pricing page conversion stalls', severity: 3, likelihood: 3, mitigation: 'A/B test within week 1; rollback plan in place.', owner: 'You', status: 'open', createdAt: d(-5) },
    { id: 'r-3', projectId: 'p-atlas', title: 'Engineering capacity during launch week', severity: 4, likelihood: 2, mitigation: 'Freeze non-launch work T-7; oncall rota drafted.', owner: 'You', status: 'monitoring', createdAt: d(-8) },

    { id: 'r-10', projectId: 'p-helios', title: 'Market window closes before term sheet', severity: 5, likelihood: 3, mitigation: 'Compress outreach; book 20 meetings in first 2 weeks.', owner: 'You', status: 'open', createdAt: d(-14) },
    { id: 'r-11', projectId: 'p-helios', title: 'Key metric (retention) dips before close', severity: 5, likelihood: 2, mitigation: 'Lock retention initiatives; weekly metric review.', owner: 'You', status: 'monitoring', createdAt: d(-12) },
    { id: 'r-12', projectId: 'p-helios', title: 'Advisor availability for intros', severity: 3, likelihood: 2, mitigation: 'Confirm 3 advisor intros/week; backup list of 2 angels.', owner: 'You', status: 'open', createdAt: d(-7) },

    { id: 'r-20', projectId: 'p-orbit', title: 'Scheduling slips push synthesis past deadline', severity: 3, likelihood: 4, mitigation: 'Batch interviews M/W/F; cap at 45 min.', owner: 'You', status: 'open', createdAt: d(-5) },

    { id: 'r-30', projectId: 'p-vega', title: 'Vendor disappears; need alt', severity: 4, likelihood: 4, mitigation: 'Shortlist of 2 alternates drafted; 2-week decision deadline.', owner: 'You', status: 'open', createdAt: d(-9) },

    { id: 'r-40', projectId: 'p-nova', title: 'Plan conflicts with Atlas launch focus', severity: 3, likelihood: 3, mitigation: 'Time-box planning to 1 day/week until launch clears.', owner: 'You', status: 'monitoring', createdAt: d(-4) },
  ],
  weeklyReviews: [
    {
      id: 'wr-1',
      weekOf: d(-13),
      completed: 9,
      delayed: 2,
      blocked: 1,
      plannedRatio: 0.78,
      cycleTime: 2.1,
      note: 'Strong week on Atlas. Helios data room slower than hoped — move up priority.',
    },
    {
      id: 'wr-2',
      weekOf: d(-6),
      completed: 11,
      delayed: 3,
      blocked: 2,
      plannedRatio: 0.64,
      cycleTime: 2.6,
      note: 'Reactive work spiked (Vega vendor issues). Consider dropping Vega to low until unblocked.',
    },
  ],

  // Jira (read-only)
  jiraProjects: [
    { id: 'jp-atl', key: 'ATL', name: 'Atlas', projectId: 'p-atlas', lead: 'Priya S.' },
    { id: 'jp-hel', key: 'HEL', name: 'Helios', projectId: 'p-helios', lead: 'You' },
    { id: 'jp-orb', key: 'ORB', name: 'Orbit Research', projectId: 'p-orbit', lead: 'Mina K.' },
    { id: 'jp-plat', key: 'PLAT', name: 'Platform', projectId: null, lead: 'Dev Bhatt' },
  ],
  sprints: [
    { id: 'sp-1', jiraProjectId: 'jp-atl', name: 'Atlas · Sprint 14', state: 'active', start: d(-6), end: d(8), goal: 'Private beta infra ready; pricing telemetry fixed.' },
    { id: 'sp-2', jiraProjectId: 'jp-atl', name: 'Atlas · Sprint 13', state: 'closed', start: d(-20), end: d(-7), goal: 'Land pricing page and narrative.' },
    { id: 'sp-3', jiraProjectId: 'jp-hel', name: 'Helios · Data Room', state: 'active', start: d(-10), end: d(4), goal: 'Complete data room v2 and narrative deck.' },
    { id: 'sp-4', jiraProjectId: 'jp-orb', name: 'Orbit · Synthesis', state: 'active', start: d(-4), end: d(10), goal: 'Close 20 interviews; draft synthesis.' },
    { id: 'sp-5', jiraProjectId: 'jp-plat', name: 'Platform · Wk 16', state: 'active', start: d(-3), end: d(11), goal: 'SSO rollout + logging cleanup.' },
  ],
  jiraIssues: [
    { id: 'j-1', key: 'ATL-412', projectKey: 'ATL', sprintId: 'sp-1', type: 'Story', status: 'In Progress', priority: 'High', assignee: 'Priya S.', reporter: 'You', summary: 'Rewrite hero copy with new positioning', storyPoints: 3, labels: ['marketing','launch'], updated: d(0), description: 'Aligns with positioning doc v3. Blocker: need approved product shot from design.' },
    { id: 'j-2', key: 'ATL-415', projectKey: 'ATL', sprintId: 'sp-1', type: 'Task', status: 'To Do', priority: 'High', assignee: 'Dev Bhatt', reporter: 'You', summary: 'A/B test pricing CTA variants', storyPoints: 5, labels: ['pricing','experiment'], updated: d(-1), description: 'Variants: "Start free" vs "Get a demo". Min 7-day exposure; 1000 sessions per arm.' },
    { id: 'j-3', key: 'ATL-420', projectKey: 'ATL', sprintId: 'sp-1', type: 'Bug', status: 'Blocked', priority: 'High', assignee: 'Dev Bhatt', reporter: 'Priya S.', summary: 'Analytics events on /trial not firing', storyPoints: 2, labels: ['bug','analytics'], updated: d(0), description: 'Confirmed via Mixpanel. trial_started missing since deploy Friday. Rollback candidate.' },
    { id: 'j-4', key: 'ATL-421', projectKey: 'ATL', sprintId: 'sp-1', type: 'Story', status: 'To Do', priority: 'Medium', assignee: 'Priya S.', reporter: 'You', summary: 'Draft beta welcome email sequence', storyPoints: 3, labels: ['lifecycle'], updated: d(-2), description: '3-email sequence. Goal: activation within 72 hrs.' },
    { id: 'j-5', key: 'ATL-399', projectKey: 'ATL', sprintId: 'sp-1', type: 'Task', status: 'In Progress', priority: 'Medium', assignee: 'Lee W.', reporter: 'You', summary: 'Build invite gate for private beta', storyPoints: 5, labels: ['infra'], updated: d(-1), description: 'Gates /trial signups behind invite code. Stripe coupon optional.' },
    { id: 'j-6', key: 'ATL-405', projectKey: 'ATL', sprintId: 'sp-1', type: 'Task', status: 'Done', priority: 'Medium', assignee: 'Priya S.', reporter: 'You', summary: 'Legal review of pricing tiers', storyPoints: 2, labels: ['legal'], updated: d(-2), description: 'Counsel signed off. Terms page updated.' },
    { id: 'j-7', key: 'ATL-410', projectKey: 'ATL', sprintId: 'sp-1', type: 'Story', status: 'In Review', priority: 'High', assignee: 'Lee W.', reporter: 'Priya S.', summary: 'Telemetry for pricing page', storyPoints: 3, labels: ['analytics'], updated: d(0), description: 'Segment events for hero CTA, tier selector, scroll depth.' },
    { id: 'j-8', key: 'ATL-388', projectKey: 'ATL', sprintId: 'sp-2', type: 'Story', status: 'Done', priority: 'High', assignee: 'Priya S.', reporter: 'You', summary: 'Finalize positioning doc v3', storyPoints: 8, labels: ['narrative'], updated: d(-14), description: 'Approved by advisors. Locked for launch.' },
    { id: 'j-9', key: 'ATL-392', projectKey: 'ATL', sprintId: 'sp-2', type: 'Task', status: 'Done', priority: 'High', assignee: 'Lee W.', reporter: 'You', summary: 'Pricing page live', storyPoints: 5, labels: ['landing'], updated: d(-3), description: 'Shipped with A/B framework scaffold.' },
    { id: 'j-20', key: 'HEL-45', projectKey: 'HEL', sprintId: 'sp-3', type: 'Task', status: 'In Progress', priority: 'Highest', assignee: 'You', reporter: 'You', summary: 'Financial model v4', storyPoints: 8, labels: ['fundraise'], updated: d(0), description: 'Three scenarios: base, upside, stretch. Lock net burn by Friday.' },
    { id: 'j-21', key: 'HEL-46', projectKey: 'HEL', sprintId: 'sp-3', type: 'Task', status: 'Blocked', priority: 'Highest', assignee: 'You', reporter: 'You', summary: 'Cap table upload to data room', storyPoints: 1, labels: ['dataroom'], updated: d(-1), description: 'Waiting on counsel (Sasha) for clean cap table export.' },
    { id: 'j-22', key: 'HEL-48', projectKey: 'HEL', sprintId: 'sp-3', type: 'Story', status: 'In Progress', priority: 'High', assignee: 'You', reporter: 'You', summary: 'Deck narrative pass with advisor', storyPoints: 3, labels: ['deck'], updated: d(0), description: 'Advisor: Priya C. Focus: pivot narrative in slides 4–7.' },
    { id: 'j-23', key: 'HEL-52', projectKey: 'HEL', sprintId: 'sp-3', type: 'Task', status: 'To Do', priority: 'Medium', assignee: 'You', reporter: 'You', summary: 'Prep Q&A doc for investor calls', storyPoints: 3, labels: ['fundraise'], updated: d(-2), description: 'Organize by theme: traction, team, moat, roadmap.' },
    { id: 'j-30', key: 'ORB-18', projectKey: 'ORB', sprintId: 'sp-4', type: 'Task', status: 'In Progress', priority: 'High', assignee: 'Mina K.', reporter: 'You', summary: 'Schedule remaining 6 interviews', storyPoints: 2, labels: ['research'], updated: d(0), description: '14 of 20 done. Target: ops leads at 50–200 person cos.' },
    { id: 'j-31', key: 'ORB-19', projectKey: 'ORB', sprintId: 'sp-4', type: 'Task', status: 'To Do', priority: 'Medium', assignee: 'Mina K.', reporter: 'You', summary: 'Transcribe last 4 interviews', storyPoints: 3, labels: ['research'], updated: d(-2), description: 'Using Rev. Redact PII before uploading.' },
    { id: 'j-32', key: 'ORB-21', projectKey: 'ORB', sprintId: 'sp-4', type: 'Story', status: 'To Do', priority: 'High', assignee: 'You', reporter: 'You', summary: 'Code themes across 14 transcripts', storyPoints: 5, labels: ['synthesis'], updated: d(-2), description: 'Emerging theme: workflow handoff breakage (8/14).' },
    { id: 'j-40', key: 'PLAT-101', projectKey: 'PLAT', sprintId: 'sp-5', type: 'Story', status: 'In Progress', priority: 'High', assignee: 'Dev Bhatt', reporter: 'Dev Bhatt', summary: 'SSO with Okta for enterprise', storyPoints: 8, labels: ['enterprise','auth'], updated: d(0), description: 'SAML + SCIM. Tested with one prospect sandbox.' },
    { id: 'j-41', key: 'PLAT-104', projectKey: 'PLAT', sprintId: 'sp-5', type: 'Bug', status: 'To Do', priority: 'Medium', assignee: 'Lee W.', reporter: 'Dev Bhatt', summary: 'Log rotation failing nightly', storyPoints: 2, labels: ['infra'], updated: d(-1), description: 'Disk fills ~02:00 UTC. Alert tripped 3 nights in a row.' },
    { id: 'j-42', key: 'PLAT-107', projectKey: 'PLAT', sprintId: 'sp-5', type: 'Task', status: 'In Review', priority: 'Medium', assignee: 'Dev Bhatt', reporter: 'Lee W.', summary: 'Upgrade Postgres to 16', storyPoints: 3, labels: ['infra'], updated: d(-1), description: 'Staging done. Prod cutover scheduled for Sunday.' },
  ],

  // Confluence (read-only)
  confluenceSpaces: [
    { id: 'cs-prod', key: 'PROD', name: 'Product', icon: '◎' },
    { id: 'cs-eng',  key: 'ENG',  name: 'Engineering', icon: '◇' },
    { id: 'cs-gtm',  key: 'GTM',  name: 'GTM', icon: '◈' },
    { id: 'cs-ops',  key: 'OPS',  name: 'Operations', icon: '○' },
  ],
  confluencePages: [
    { id: 'cp-1', spaceId: 'cs-prod', title: 'Atlas v2 — Product Requirements', author: 'Priya S.', updated: d(-2), tags: ['atlas','prd'],
      body: `# Atlas v2 PRD\n\n**Owner:** Priya S. · **Status:** In review\n\n## Problem\nPower users hit workflow handoff breakage (cited by 8/14 research interviews). Positioning does not speak to this pain.\n\n## Goals\n- 30% uplift in landing → trial conversion\n- Pricing page CTR > 12%\n- Activation within 72 hours of signup\n\n## Scope\nIn: new landing, pricing page, private beta gate, welcome email sequence.\nOut: mobile app changes, SSO (tracked in PLAT-101).\n\n## Open questions\n- Do we require SOC2 at launch? (2 enterprise prospects asked)\n- Bet sizing for beta pool — 50 or 200 invites?` },
    { id: 'cp-2', spaceId: 'cs-prod', title: 'Positioning Doc v3 (locked)', author: 'You', updated: d(-14), tags: ['atlas','narrative'],
      body: `# Positioning v3\n\n**For:** ops leads at 50–200 person companies\n**Who:** need to move fast without breaking handoffs\n**Atlas is:** the operating layer that keeps work connected\n**Unlike:** point tools that silo context\n**We:** give operators one control surface for execution\n\n## Proof points\n- Reduces handoff breakage by ~60% (pilot data)\n- Integrates with Jira, Slack, Linear, Confluence` },
    { id: 'cp-3', spaceId: 'cs-prod', title: 'Q3 Planning — Draft', author: 'You', updated: d(-3), tags: ['planning'],
      body: `# Q3 Plan (Draft)\n\n## Three bets\n1. **Distribution** — inbound content engine\n2. **Platform** — SSO + audit log to unlock enterprise\n3. **Monetization** — pricing experiments & packaging\n\n## Risks\n- Atlas launch overlap with planning cycle\n- Fundraise pulls focus Aug–Sep` },
    { id: 'cp-4', spaceId: 'cs-eng', title: 'SSO Rollout Plan (Okta, SAML)', author: 'Dev Bhatt', updated: d(-5), tags: ['platform','auth'],
      body: `# SSO Rollout\n\n**Ticket:** PLAT-101\n**Scope:** SAML + SCIM, Okta first, Azure AD fast-follow.\n\n## Milestones\n- Sandbox tested: done\n- Prod config: next week\n- Customer pilot: following week\n\n## Open\n- Session length policy (default 12h, configurable?)\n- Deprovisioning SLA` },
    { id: 'cp-5', spaceId: 'cs-eng', title: 'Incident Runbook', author: 'Lee W.', updated: d(-20), tags: ['runbook'],
      body: `# Incident Runbook\n\n1. Acknowledge in PagerDuty within 5 min\n2. Open #incident Slack channel\n3. Assign IC (usually oncall)\n4. Status page within 15 min if user-facing\n5. Postmortem within 48h` },
    { id: 'cp-6', spaceId: 'cs-eng', title: 'Postgres 16 Upgrade Notes', author: 'Dev Bhatt', updated: d(-1), tags: ['infra'],
      body: `# Postgres 16 Upgrade\n\n**Ticket:** PLAT-107\n\n## Staging\nCut over 4 days ago. No migration issues. Query planner regressions minor.\n\n## Prod\nSchedule: Sunday 02:00 UTC.\nRollback: snapshot + PITR window 48h.` },
    { id: 'cp-7', spaceId: 'cs-gtm', title: 'Launch Playbook — Atlas v2', author: 'Priya S.', updated: d(-4), tags: ['atlas','launch'],
      body: `# Launch Playbook\n\n## T-7\n- Freeze non-launch eng work\n- Invite list locked at 50\n\n## T-1\n- Dry run with advisors\n- Press embargo pack sent\n\n## Launch day\n- HN post at 09:00 PT\n- Announcement email 10:00 PT\n- Twitter thread + LinkedIn 10:05 PT` },
    { id: 'cp-8', spaceId: 'cs-gtm', title: 'Customer Research Synthesis (WIP)', author: 'Mina K.', updated: d(-3), tags: ['research','orbit'],
      body: `# Synthesis (in progress · 14/20)\n\n## Themes surfacing\n1. **Workflow handoff breakage** — 8/14\n2. **Tool sprawl** — 11/14\n3. **Unclear ownership** — 6/14\n\n## Quotes\n> "I spend half my week just chasing status."\n> "Handoffs between PM and design are where things die."\n\n## Implications for Atlas\n- Double down on handoff connective tissue\n- Pricing should lead with "one control surface"` },
    { id: 'cp-9', spaceId: 'cs-ops', title: 'Vendor consolidation — Ramp + Attio', author: 'You', updated: d(-30), tags: ['tooling'],
      body: `# Vendor Consolidation\n\n**Decision:** consolidate on Ramp (expenses) + Attio (CRM). Drop Brex, HubSpot, Airtable.\n**Savings:** ~$410/mo.\n**Migration:** blocked — vendor silent on redlines (9 days).` },
    { id: 'cp-10', spaceId: 'cs-prod', title: 'Fundraise narrative (Helios)', author: 'You', updated: d(-7), tags: ['helios','fundraise'],
      body: `# Helios narrative\n\n## One-liner\nAtlas keeps work connected across the tools operators already use.\n\n## Why now\n- Tool sprawl peaking\n- AI enables a new operating layer\n\n## Ask\n$2.5M bridge, 18-month runway, close by July.` },
  ],

  // Chat threads
  chatThreads: [
    {
      id: 'ct-1',
      title: 'Atlas sprint blockers',
      createdAt: d(-1),
      messages: [
        { role: 'user', text: 'What is blocking the Atlas sprint right now?' },
        { role: 'assistant', text: 'Atlas · Sprint 14 (ends in 8d) has 1 blocked issue and 3 in-progress items.\n\nBlockers:\n• ATL-420 — analytics events on /trial not firing (High, Dev Bhatt). Candidate for rollback of Friday deploy.\n\nAt-risk:\n• ATL-412 "Rewrite hero copy" — waiting on approved product shot from design.', citations: ['ATL-420','ATL-412'] },
      ],
    },
  ],
};

window.SEED = SEED;
