// Demo seed data — 3 programs, 7 projects, one deep dependency violation.
// Dates are relative so the seed always feels current.

const today = new Date();
const d = (offset) => {
  const x = new Date(today);
  x.setDate(x.getDate() + offset);
  return x.toISOString().slice(0, 10);
};

const SEED = {
  version: 1,
  meta: {
    theme: 'dark',
    density: 'compact',
    accent: 'amber',
    monoIds: true,
    activeView: 'roadmap',
    activeProjectId: 'p-1-1',
    activeProgramId: null,
    lastWeeklyReview: d(-5),
    lastPlanDate: null,
    plannedToday: ['t-3', 't-7'],
    yesterdayShipped: [],
    riskFields: ['category', 'response'],
    nextTaskId: 30,
    nextNoteId: 20,
    nextRiskId: 10,
    integrations: {
      jira: { connected: false },
      confluence: { connected: false },
    },
  },

  programs: [
    {
      id: 'pg-1', name: 'P1. Product Launch',
      description: 'End-to-end launch of the 2.0 product line — website, pricing, and growth',
      deliverable: 'Live product site, published pricing tiers, onboarding conversion ≥ 40%',
      createdAt: d(-60),
    },
    {
      id: 'pg-2', name: 'P2. Platform Foundation',
      description: 'Core infrastructure upgrades to support scale — API, auth, and analytics',
      deliverable: 'API v2 GA, RBAC in prod, real-time analytics pipeline processing 10k events/day',
      createdAt: d(-60),
    },
    {
      id: 'pg-3', name: 'P3. Customer Growth',
      description: 'Post-launch customer success and retention — onboarding flow and help content',
      deliverable: 'Onboarding completion rate ≥ 70%, Help Center live with 50+ articles',
      createdAt: d(-60),
    },
  ],

  projects: [
    // ── P1 Product Launch ──────────────────────────────────────────────────────
    {
      id: 'p-1-1', programId: 'pg-1', code: '1.1',
      name: 'Project 1.1 — Marketing Site Redesign',
      objective: 'Redesign and launch the marketing site for the 2.0 product line',
      description: 'Full redesign of homepage, pricing, and feature pages to reflect new product positioning. Must be live before onboarding flow goes out.',
      deliverable: 'New marketing site live at production URL with 2.0 branding and updated pricing pages',
      status: 'on-track', priority: 'critical', color: 'emerald',
      owner: 'Delaney', team: ['Delaney', 'Alex', 'Sam'],
      startDate: d(-30), dueDate: d(30),
      successCriteria: [
        { id: 'sc-1-1-1', text: 'Core Web Vitals all green', current: 'Yellow', target: 'Green' },
        { id: 'sc-1-1-2', text: 'Conversion rate on pricing page', current: '2.1%', target: '≥ 4%' },
      ],
      createdAt: d(-30),
    },
    {
      id: 'p-1-2', programId: 'pg-1', code: '1.2',
      name: 'Project 1.2 — Pricing & Packaging',
      objective: 'Define and publish final pricing tiers and packaging for the 2.0 launch',
      description: 'Research competitive pricing, model unit economics, get leadership sign-off, and publish to site. Blocked on advisor review.',
      deliverable: 'Published pricing page with 3 tiers, internal unit economics model approved by CFO',
      status: 'at-risk', priority: 'high', color: 'amber',
      owner: 'Delaney', team: ['Delaney', 'Jordan'],
      startDate: d(-10), dueDate: d(45),
      successCriteria: [
        { id: 'sc-1-2-1', text: 'Pricing page published before launch', current: 'Not started', target: 'Live' },
      ],
      createdAt: d(-10),
    },

    // ── P2 Platform Foundation ─────────────────────────────────────────────────
    {
      id: 'p-2-1', programId: 'pg-2', code: '2.1',
      name: 'Project 2.1 — API v2',
      objective: 'Ship a versioned, backward-compatible API v2 with REST and GraphQL endpoints',
      description: 'Refactor the existing API layer to support versioning, add rate limiting, write OpenAPI docs, and run a 2-week beta with partners.',
      deliverable: 'API v2 GA with OpenAPI spec published, 99.9% uptime SLA in prod for 2 consecutive weeks',
      status: 'on-track', priority: 'critical', color: 'sky',
      owner: 'Alex', team: ['Alex', 'Morgan'],
      startDate: d(-45), dueDate: d(60),
      successCriteria: [
        { id: 'sc-2-1-1', text: 'Beta partner coverage', current: '3 partners', target: '≥ 5 partners' },
        { id: 'sc-2-1-2', text: 'API uptime in beta', current: '99.4%', target: '≥ 99.9%' },
      ],
      createdAt: d(-45),
    },
    {
      id: 'p-2-2', programId: 'pg-2', code: '2.2',
      name: 'Project 2.2 — Auth & Permissions',
      objective: 'Implement RBAC (role-based access control) on top of the new API v2 auth layer',
      description: 'Design and ship RBAC for enterprise accounts. Blocked on API v2 auth merge — cannot start RBAC schema work until the new auth primitives are in main.',
      deliverable: 'RBAC live in prod: org/team/user roles, permission matrix documented, enterprise admin console shipped',
      status: 'blocked', priority: 'high', color: 'rose',
      owner: 'Morgan', team: ['Morgan', 'Alex'],
      startDate: d(-20), dueDate: d(75),
      dependsOn: ['p-2-1'],
      successCriteria: [
        { id: 'sc-2-2-1', text: 'Enterprise accounts migrated to RBAC', current: '0/12', target: '12/12' },
      ],
      createdAt: d(-20),
    },
    {
      id: 'p-2-3', programId: 'pg-2', code: '2.3',
      name: 'Project 2.3 — Analytics Pipeline',
      objective: 'Build a real-time event ingestion and analytics pipeline for product telemetry',
      description: 'Stream product events via Kafka, store in ClickHouse, expose metrics dashboard to internal teams.',
      deliverable: 'Pipeline processing ≥ 10k events/day with < 2s latency, internal dashboard live',
      status: 'on-track', priority: 'medium', color: 'violet',
      owner: 'Sam', team: ['Sam'],
      startDate: d(-15), dueDate: d(50),
      successCriteria: [
        { id: 'sc-2-3-1', text: 'Events/day throughput', current: '2k', target: '≥ 10k' },
        { id: 'sc-2-3-2', text: 'Pipeline latency p99', current: '8s', target: '< 2s' },
      ],
      createdAt: d(-15),
    },

    // ── P3 Customer Growth ─────────────────────────────────────────────────────
    {
      id: 'p-3-1', programId: 'pg-3', code: '3.1',
      name: 'Project 3.1 — Customer Onboarding Flow',
      objective: 'Build a guided in-app onboarding flow for new customers post-launch',
      description: 'Design and ship a 5-step onboarding checklist tied to the new auth/permissions model. Requires Auth & Permissions (2.2) to be live before we can build permission-gated onboarding steps.',
      deliverable: 'In-app onboarding flow live, ≥ 70% completion rate in first 30 days post-launch',
      // ⚠ DEEP VIOLATION: due d+55, but depends on p-2-2 which is due d+75
      status: 'at-risk', priority: 'high', color: 'amber',
      owner: 'Jordan', team: ['Jordan', 'Delaney'],
      startDate: d(20), dueDate: d(55),
      dependsOn: ['p-1-1', 'p-2-2'],
      successCriteria: [
        { id: 'sc-3-1-1', text: 'Onboarding completion rate', current: 'N/A', target: '≥ 70%' },
      ],
      createdAt: d(-5),
    },
    {
      id: 'p-3-2', programId: 'pg-3', code: '3.2',
      name: 'Project 3.2 — Help Center',
      objective: 'Launch a public Help Center with 50+ articles before product launch',
      description: 'Write and publish product docs, FAQs, and video walkthroughs. Independent of other projects.',
      deliverable: 'Help Center live at help.example.com with ≥ 50 published articles',
      status: 'on-track', priority: 'medium', color: 'emerald',
      owner: 'Sam', team: ['Sam', 'Jordan'],
      startDate: d(0), dueDate: d(40),
      successCriteria: [
        { id: 'sc-3-2-1', text: 'Articles published', current: '12', target: '≥ 50' },
      ],
      createdAt: d(0),
    },
  ],

  milestones: [
    // p-1-1 Marketing Site Redesign
    { id: 'm-1-1-1', projectId: 'p-1-1', name: 'Design system finalized', description: 'Typography, color tokens, and component library locked', deliverable: 'Figma file approved by design lead', date: d(-10), status: 'done' },
    { id: 'm-1-1-2', projectId: 'p-1-1', name: 'Homepage shipped to staging', description: 'Fully interactive homepage in staging environment', deliverable: 'Staging URL shared with stakeholders for review', date: d(5), status: 'planned' },
    { id: 'm-1-1-3', projectId: 'p-1-1', name: 'Pricing page live', description: 'Pricing page live with final copy and tier breakdown', deliverable: 'Pricing page at /pricing in production', date: d(20), status: 'planned' },
    { id: 'm-1-1-4', projectId: 'p-1-1', name: 'Full site launch', description: 'All pages live, redirects in place, analytics wired', deliverable: 'Site live with zero broken links, Segment tracking verified', date: d(30), status: 'planned' },

    // p-1-2 Pricing & Packaging
    { id: 'm-1-2-1', projectId: 'p-1-2', name: 'Competitive analysis complete', description: 'Benchmark pricing against 5 competitors, model 3 scenarios', deliverable: 'Pricing research doc shared with leadership', date: d(-5), status: 'done' },
    { id: 'm-1-2-2', projectId: 'p-1-2', name: 'Advisor review', description: 'Pricing model reviewed by external advisor before CFO sign-off', deliverable: 'Advisor sign-off email on record', date: d(15), status: 'planned' },
    { id: 'm-1-2-3', projectId: 'p-1-2', name: 'CFO sign-off', description: 'Final pricing tiers approved by CFO', deliverable: 'Signed-off pricing deck', date: d(35), status: 'planned' },
    { id: 'm-1-2-4', projectId: 'p-1-2', name: 'Pricing page published', description: 'Final pricing live on marketing site', deliverable: 'Pricing page at /pricing with correct tier data', date: d(45), status: 'planned' },

    // p-2-1 API v2
    { id: 'm-2-1-1', projectId: 'p-2-1', name: 'API versioning design approved', description: 'URL versioning strategy and breaking change policy documented', deliverable: 'Architecture doc with team sign-off', date: d(-30), status: 'done' },
    { id: 'm-2-1-2', projectId: 'p-2-1', name: 'REST endpoints complete', description: 'All REST endpoints for v2 migrated and tested', deliverable: 'Passing integration test suite for all v2 REST routes', date: d(-5), status: 'done' },
    { id: 'm-2-1-3', projectId: 'p-2-1', name: 'Beta partner onboarding', description: 'First 5 beta partners integrated on API v2', deliverable: 'Signed beta agreement from 5 partners, integration confirmed', date: d(20), status: 'planned' },
    { id: 'm-2-1-4', projectId: 'p-2-1', name: 'API v2 GA release', description: 'General availability with full OpenAPI docs published', deliverable: 'OpenAPI spec at /docs/v2, blog post published, deprecation notice sent to v1 users', date: d(60), status: 'planned' },

    // p-2-2 Auth & Permissions
    { id: 'm-2-2-1', projectId: 'p-2-2', name: 'RBAC schema design', description: 'Role and permission schema designed and reviewed', deliverable: 'DB migration scripts + schema docs reviewed by security', date: d(10), status: 'planned' },
    { id: 'm-2-2-2', projectId: 'p-2-2', name: 'API auth layer merged', description: 'New auth primitives from API v2 merged into main', deliverable: 'PR merged, all tests green, deployed to staging', date: d(25), status: 'planned' },
    { id: 'm-2-2-3', projectId: 'p-2-2', name: 'Admin console shipped', description: 'Enterprise admin console for managing org/team/user roles', deliverable: 'Admin console accessible to org admins in production', date: d(55), status: 'planned' },
    { id: 'm-2-2-4', projectId: 'p-2-2', name: 'RBAC GA + migration complete', description: 'All 12 enterprise accounts migrated to RBAC', deliverable: '12/12 enterprise accounts on RBAC, migration guide published', date: d(75), status: 'planned' },

    // p-2-3 Analytics Pipeline
    { id: 'm-2-3-1', projectId: 'p-2-3', name: 'Kafka topic schema locked', description: 'Event schema finalized and documented', deliverable: 'Avro schema published to schema registry', date: d(-5), status: 'done' },
    { id: 'm-2-3-2', projectId: 'p-2-3', name: 'ClickHouse cluster live', description: 'ClickHouse cluster provisioned and ingesting events', deliverable: 'Cluster running with backfill of 7 days of historical events', date: d(15), status: 'planned' },
    { id: 'm-2-3-3', projectId: 'p-2-3', name: 'Internal dashboard live', description: 'Product metrics dashboard available to internal team', deliverable: 'Dashboard at metrics.internal with ≥ 5 key charts', date: d(35), status: 'planned' },
    { id: 'm-2-3-4', projectId: 'p-2-3', name: 'Pipeline at throughput target', description: 'Pipeline consistently processing ≥ 10k events/day at < 2s latency', deliverable: 'Grafana dashboard showing ≥ 10k/day for 5 consecutive days', date: d(50), status: 'planned' },

    // p-3-1 Customer Onboarding (⚠ due d+55, dep p-2-2 done d+75 = VIOLATION)
    { id: 'm-3-1-1', projectId: 'p-3-1', name: 'Onboarding flow design', description: '5-step onboarding checklist wireframed and approved', deliverable: 'Figma prototype approved by PM and design lead', date: d(22), status: 'planned' },
    { id: 'm-3-1-2', projectId: 'p-3-1', name: 'Permission-gated steps wired', description: 'Onboarding steps that check user permissions connected to RBAC API', deliverable: 'All 5 steps functional in staging with real RBAC checks', date: d(40), status: 'planned' },
    { id: 'm-3-1-3', projectId: 'p-3-1', name: 'Onboarding flow live', description: 'Full onboarding flow live for new signups post-launch', deliverable: 'Flow live in production, completion tracking in Amplitude', date: d(55), status: 'planned' },

    // p-3-2 Help Center
    { id: 'm-3-2-1', projectId: 'p-3-2', name: '25 articles published', description: 'First batch of help articles covering core features', deliverable: '25 articles live at help.example.com', date: d(15), status: 'planned' },
    { id: 'm-3-2-2', projectId: 'p-3-2', name: 'Help Center launch', description: '50+ articles live with search and navigation', deliverable: 'Help Center at help.example.com, linked from marketing site', date: d(40), status: 'planned' },
  ],

  tasks: [
    // p-1-1 Marketing Site Redesign
    { id: 't-1',  projectId: 'p-1-1', title: 'Write homepage hero copy',              status: 'done',        priority: 'critical', rank: 1, estimate: 2, createdAt: d(-20), updatedAt: d(-8), completedAt: d(-8) },
    { id: 't-2',  projectId: 'p-1-1', title: 'Build responsive nav component',        status: 'in-progress', priority: 'high',     rank: 2, estimate: 3, createdAt: d(-15), updatedAt: d(-1) },
    { id: 't-3',  projectId: 'p-1-1', title: 'Set up Segment analytics on all pages', status: 'todo',        priority: 'high',     rank: 3, estimate: 2, dueDate: d(5),  createdAt: d(-5), updatedAt: d(-5) },
    { id: 't-4',  projectId: 'p-1-1', title: 'Optimize images for Core Web Vitals',   status: 'todo',        priority: 'medium',   rank: 4, estimate: 3, createdAt: d(-5), updatedAt: d(-5) },

    // p-1-2 Pricing & Packaging
    { id: 't-5',  projectId: 'p-1-2', title: 'Draft pricing tiers doc',               status: 'done',        priority: 'high',     rank: 1, estimate: 4, createdAt: d(-8), updatedAt: d(-3), completedAt: d(-3) },
    { id: 't-6',  projectId: 'p-1-2', title: 'Schedule advisor meeting',              status: 'todo',        priority: 'high',     rank: 2, estimate: 1, dueDate: d(3),  createdAt: d(-2), updatedAt: d(-2), blockers: ['bl-1'] },
    { id: 't-7',  projectId: 'p-1-2', title: 'Build unit economics model',            status: 'todo',        priority: 'medium',   rank: 3, estimate: 6, dueDate: d(10), createdAt: d(-2), updatedAt: d(-2) },

    // p-2-1 API v2
    { id: 't-8',  projectId: 'p-2-1', title: 'Migrate /users endpoints to v2',        status: 'done',        priority: 'critical', rank: 1, estimate: 5, createdAt: d(-30), updatedAt: d(-10), completedAt: d(-10) },
    { id: 't-9',  projectId: 'p-2-1', title: 'Add rate limiting middleware',           status: 'done',        priority: 'high',     rank: 2, estimate: 3, createdAt: d(-20), updatedAt: d(-6), completedAt: d(-6) },
    { id: 't-10', projectId: 'p-2-1', title: 'Write OpenAPI spec for v2',             status: 'in-progress', priority: 'high',     rank: 3, estimate: 8, createdAt: d(-10), updatedAt: d(-1) },
    { id: 't-11', projectId: 'p-2-1', title: 'Onboard first 3 beta partners',         status: 'todo',        priority: 'high',     rank: 4, estimate: 4, dueDate: d(20), createdAt: d(-5), updatedAt: d(-5) },

    // p-2-2 Auth & Permissions (blocked)
    { id: 't-12', projectId: 'p-2-2', title: 'Design RBAC schema',                   status: 'blocked',     priority: 'critical', rank: 1, estimate: 8, blockers: ['bl-2'], createdAt: d(-15), updatedAt: d(-1) },
    { id: 't-13', projectId: 'p-2-2', title: 'Write RBAC API spec',                  status: 'todo',        priority: 'high',     rank: 2, estimate: 5, createdAt: d(-10), updatedAt: d(-10) },

    // p-2-3 Analytics Pipeline
    { id: 't-14', projectId: 'p-2-3', title: 'Provision ClickHouse cluster on AWS',  status: 'in-progress', priority: 'critical', rank: 1, estimate: 4, createdAt: d(-10), updatedAt: d(-1) },
    { id: 't-15', projectId: 'p-2-3', title: 'Write Kafka consumer for product events', status: 'todo',      priority: 'high',     rank: 2, estimate: 6, createdAt: d(-8), updatedAt: d(-8) },
    { id: 't-16', projectId: 'p-2-3', title: 'Build first 5 Grafana charts',         status: 'todo',        priority: 'medium',   rank: 3, estimate: 4, createdAt: d(-5), updatedAt: d(-5) },

    // p-3-1 Onboarding
    { id: 't-17', projectId: 'p-3-1', title: 'Draft onboarding checklist steps',     status: 'todo',        priority: 'high',     rank: 1, estimate: 3, createdAt: d(-3), updatedAt: d(-3) },
    { id: 't-18', projectId: 'p-3-1', title: 'Design onboarding UI in Figma',        status: 'todo',        priority: 'high',     rank: 2, estimate: 5, createdAt: d(-3), updatedAt: d(-3) },

    // p-3-2 Help Center
    { id: 't-19', projectId: 'p-3-2', title: 'Write Getting Started guide',          status: 'in-progress', priority: 'high',     rank: 1, estimate: 4, createdAt: d(-7), updatedAt: d(-1) },
    { id: 't-20', projectId: 'p-3-2', title: 'Set up Zendesk Help Center',           status: 'done',        priority: 'high',     rank: 2, estimate: 2, createdAt: d(-10), updatedAt: d(-5), completedAt: d(-5) },
  ],

  notes: [
    // Decisions
    { id: 'n-1', kind: 'decision', projectId: 'p-1-1', title: 'Use Next.js for marketing site', body: 'Chose Next.js over Webflow for easier A/B testing integration and dev control over performance.', date: d(-28), tags: ['tech', 'architecture'] },
    { id: 'n-2', kind: 'decision', projectId: 'p-2-1', title: 'URL-based versioning for API (not header)', body: 'Header versioning was considered but rejected — URL versioning is simpler for partners to test and debug. Decision confirmed with 3 beta partners.', date: d(-35), tags: ['api', 'architecture'] },
    { id: 'n-3', kind: 'decision', projectId: 'p-2-2', title: 'Block RBAC on API v2 auth merge', body: 'Auth & Permissions cannot start schema work until API v2 new auth primitives are merged. Avoids two incompatible auth systems running in parallel.', date: d(-18), tags: ['dependency', 'risk'] },
    { id: 'n-4', kind: 'decision', projectId: 'p-2-3', title: 'ClickHouse over BigQuery for pipeline', body: 'ClickHouse chosen for sub-second query latency on columnar data. BigQuery costs were 4x higher at projected scale.', date: d(-14), tags: ['tech', 'architecture'] },
    { id: 'n-5', kind: 'decision', projectId: 'p-3-1', title: 'Defer onboarding launch until RBAC is live', body: 'Permission-gated onboarding steps require RBAC in prod. Launch date set to d+55, but Auth (2.2) is not due until d+75. This creates a timeline conflict that needs resolution.', date: d(-4), tags: ['risk', 'dependency'] },

    // Questions
    { id: 'n-6', kind: 'question', projectId: 'p-1-2', title: 'Has the advisor reviewed the pricing model yet?', body: 'Pricing model was sent to advisor 3 days ago. No response yet. Blocker for CFO sign-off.', date: d(-3), tags: ['blocker'], resolved: false },
    { id: 'n-7', kind: 'question', projectId: 'p-2-1', title: 'Do we need GraphQL support at API v2 GA?', body: 'Original plan included GraphQL but 4 of 5 beta partners say they only need REST. Considering cutting GraphQL from v2 GA scope.', date: d(-7), tags: ['scope'], resolved: false },
    { id: 'n-8', kind: 'question', projectId: 'p-3-1', title: '⚠ Auth dependency creates timeline conflict — how do we resolve?', body: 'Customer Onboarding (3.1) is due d+55 but depends on Auth & Permissions (2.2) which is not due until d+75. Options: (1) slip Onboarding to d+80, (2) fast-track RBAC, (3) ship onboarding without permission-gated steps as v1.', date: d(-2), tags: ['blocker', 'dependency'], resolved: false },
    { id: 'n-9', kind: 'question', projectId: 'p-3-2', title: 'Should Help Center launch be tied to the site launch date?', body: 'Currently Help Center is due d+40, site is due d+30. Should we move Help Center to d+30 so both go live together?', date: d(-6), tags: ['scope'], resolved: false },
  ],

  risks: [
    { id: 'r-1', projectId: 'p-1-2', title: 'Advisor delay holds up CFO sign-off on pricing', severity: 3, likelihood: 4, status: 'open', category: 'external', response: 'mitigate', mitigation: 'Follow up with advisor twice a week; escalate to CEO if no response by end of week', owner: 'Delaney', createdAt: d(-3), updatedAt: d(-3) },
    { id: 'r-2', projectId: 'p-2-1', title: 'API v2 beta reveals breaking changes in auth layer', severity: 4, likelihood: 3, status: 'open', category: 'technical', response: 'mitigate', mitigation: 'Auth layer is isolated behind feature flag; breaking changes can be rolled back independently', owner: 'Alex', createdAt: d(-20), updatedAt: d(-5) },
    { id: 'r-3', projectId: 'p-2-2', title: 'RBAC blocker slips overall platform timeline', severity: 4, likelihood: 4, status: 'open', category: 'dependency', response: 'mitigate', mitigation: 'Escalated to CTO. API v2 auth merge is top priority in current sprint.', owner: 'Morgan', createdAt: d(-15), updatedAt: d(-3) },
    { id: 'r-4', projectId: 'p-3-1', title: '⚠ Auth slip pushes past Onboarding deadline', severity: 5, likelihood: 4, status: 'open', category: 'dependency', response: 'accept', mitigation: 'Onboarding (3.1) is due d+55 but depends on Auth (2.2) due d+75. Must choose: slip Onboarding, fast-track Auth, or descope permission-gated steps.', owner: 'Jordan', createdAt: d(-2), updatedAt: d(-2) },
    { id: 'r-5', projectId: 'p-3-1', title: 'Onboarding due date conflicts with Auth dependency', severity: 5, likelihood: 5, status: 'open', category: 'dependency', response: 'accept', mitigation: 'Deep dependency violation: p-3-1 due d+55, requires p-2-2 done by d+75. Current plan is physically impossible without a scope or timeline change.', owner: 'Delaney', createdAt: d(-1), updatedAt: d(-1) },
    { id: 'r-6', projectId: 'p-2-3', title: 'ClickHouse self-managed ops burden underestimated', severity: 3, likelihood: 3, status: 'open', category: 'technical', response: 'mitigate', mitigation: 'Evaluating ClickHouse Cloud as managed option if self-managed setup takes > 2 weeks', owner: 'Sam', createdAt: d(-10), updatedAt: d(-10) },
  ],

  blockers: [
    { id: 'bl-1', taskId: 't-6',  projectId: 'p-1-2', reason: 'Waiting for advisor to respond to pricing model sent 3 days ago', since: d(-3), resolvedAt: null },
    { id: 'bl-2', taskId: 't-12', projectId: 'p-2-2', reason: 'API v2 auth primitives not yet merged into main — RBAC schema cannot be finalized until auth interfaces are stable', since: d(-15), resolvedAt: null },
  ],

  meetings: [
    { id: 'mt-1', title: 'Launch timeline sync', projectIds: ['p-1-1', 'p-1-2', 'p-3-1'], date: d(-3), attendees: 'Delaney, Jordan, Sam', notes: 'Reviewed launch timeline. Flagged p-3-1 / p-2-2 dependency conflict. Jordan to propose options by EOW.', createdAt: d(-3) },
    { id: 'mt-2', title: 'API v2 beta review', projectIds: ['p-2-1', 'p-2-2'], date: d(-7), attendees: 'Alex, Morgan, Delaney', notes: 'Beta partners happy with REST endpoints. Discussed cutting GraphQL from GA scope. Agreed to decide by next week. RBAC blocked on auth merge — Alex to prioritize this week.', createdAt: d(-7) },
    { id: 'mt-3', title: 'Analytics pipeline kickoff', projectIds: ['p-2-3'], date: d(-12), attendees: 'Sam, Delaney', notes: 'ClickHouse selected over BigQuery. Sam to provision cluster and run load test at 10k events/day within 2 weeks.', createdAt: d(-12) },
    { id: 'mt-4', title: 'Weekly all-hands', projectIds: ['p-1-1', 'p-1-2', 'p-2-1', 'p-2-2', 'p-2-3', 'p-3-1', 'p-3-2'], date: d(2), attendees: 'All', notes: '', createdAt: d(0) },
  ],

  weeklyReviews: [],
  chatThreads: [],
  reminders: [],
  dailyPlans: {},
  dayNotes: [],
};

window.SEED = SEED;
