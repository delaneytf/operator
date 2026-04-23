// Risks view — configurable fields, best-practice register layout, guide modal.

const RISK_FIELDS_ALL = [
  { key: 'category',    label: 'Category',               hint: 'Which area this risk falls under' },
  { key: 'response',    label: 'Response strategy',      hint: 'Avoid · Accept · Reduce · Transfer' },
  { key: 'description', label: 'Description',            hint: 'Full description and triggering circumstances' },
  { key: 'impact',      label: 'Impact',                 hint: 'Time, cost, or quality impact if this risk occurs' },
  { key: 'trigger',     label: 'Trigger indicators',     hint: 'Signals that indicate the risk is materializing' },
  { key: 'contingency', label: 'Contingency plan',       hint: 'What to do if the risk occurs despite mitigation' },
  { key: 'dueDate',     label: 'Target resolution date', hint: 'Date by which this risk should be resolved' },
  { key: 'reviewDate',  label: 'Next review date',       hint: 'When to next review this risk' },
];

const RISK_FIELDS_DEFAULT = ['category', 'response', 'description', 'impact', 'trigger', 'contingency', 'dueDate', 'reviewDate'];

const RISK_CATEGORIES = ['Technical', 'Financial', 'Schedule', 'Resource', 'External', 'Compliance'];
const RISK_RESPONSES  = ['Reduce', 'Avoid', 'Accept', 'Transfer'];

const CATEGORY_COLORS = {
  Technical:  'var(--info)',
  Financial:  'var(--warn)',
  Schedule:   'var(--warn)',
  Resource:   'var(--fg-3)',
  External:   'var(--danger)',
  Compliance: 'var(--ok)',
};

// ---------------------------------------------------------------------------
// Guide modal
// ---------------------------------------------------------------------------
function RiskGuideModal({ onClose }) {
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 20 }}>
      <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
  const Row = ({ label, children }) => (
    <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
      <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--fg-2)', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>{children}</span>
    </div>
  );

  return (
    <Modal open title="Risk register guide" onClose={onClose}>
      <Section title="Score = Severity × Likelihood">
        <Row label="Critical ≥ 12">Immediate mitigation plan + named owner required. Review weekly.</Row>
        <Row label="High 6–11">Active monitoring and mitigation underway. Review monthly.</Row>
        <Row label="Low &lt; 6">Watch list. Review quarterly or when circumstances change.</Row>
        <Row label="Severity 1–5">Impact if the risk occurs: 1 = negligible, 5 = catastrophic.</Row>
        <Row label="Likelihood 1–5">Probability of occurring: 1 = rare, 5 = almost certain.</Row>
      </Section>

      <Section title="Response strategies">
        <Row label="Reduce">Take action to lower probability or impact. Most common response.</Row>
        <Row label="Avoid">Change scope, timeline, or approach to eliminate the risk entirely.</Row>
        <Row label="Transfer">Shift responsibility to a third party — vendor contracts, insurance.</Row>
        <Row label="Accept">Acknowledge the risk; absorb it if it occurs. Document the decision.</Row>
      </Section>

      <Section title="Status flow">
        <Row label="Open">Risk is active. Mitigation not yet fully in place.</Row>
        <Row label="Monitoring">Mitigation is underway. Watching trigger indicators.</Row>
        <Row label="Closed">Risk has passed, been resolved, or formally accepted.</Row>
      </Section>

      <Section title="Field guidance">
        <Row label="Mitigation">Preventive steps you're taking now to reduce probability or impact.</Row>
        <Row label="Trigger indicators">Observable signals the risk is materializing. Set reminders around these.</Row>
        <Row label="Contingency plan">Your response if the risk occurs despite mitigation. Distinct from prevention.</Row>
        <Row label="Impact">Quantify in time, cost, or scope — helps prioritize against other risks.</Row>
        <Row label="Review date">Set before the date matters, not after. Overdue reviews = stale register.</Row>
      </Section>

      <Section title="Best practices">
        <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.7 }}>
          Assign a single named owner, not "the team." Close risks promptly once passed — stale open risks
          dilute attention on real ones. Use the Fields button to dial in the detail level that fits your
          project phase: lightweight during planning, full register during execution.
        </div>
      </Section>

      <div className="modal-foot">
        <button className="btn btn-primary" onClick={onClose}>Got it</button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
function RisksView({ state }) {
  const [filterIds,       setFilterIds]       = React.useState(new Set());
  const [filterStatus,    setFilterStatus]    = React.useState('all');
  const [search,          setSearch]          = React.useState('');
  const [groupBy,         setGroupBy]         = React.useState('status');
  const [collapsed,       setCollapsed]       = React.useState({ closed: true, cancelled: true });
  const [expandedId,      setExpandedId]      = React.useState(null);
  const [modalId,         setModalId]         = React.useState(null);
  const [showModal,       setShowModal]       = React.useState(false);
  const [showFieldsPanel, setShowFieldsPanel] = React.useState(false);
  const [showGuide,       setShowGuide]       = React.useState(false);
  const fieldsPanelRef = React.useRef(null);

  const isAllFilter = filterIds.size === 0;
  const visibleProjectIds = isAllFilter ? null : new Set(
    (state.projects || []).filter(p => filterIds.has(p.programId) || filterIds.has(p.id)).map(p => p.id)
  );

  const enabledFields = state.meta?.riskFields || RISK_FIELDS_DEFAULT;

  React.useEffect(() => {
    if (!showFieldsPanel) return;
    const handler = (e) => {
      if (fieldsPanelRef.current && !fieldsPanelRef.current.contains(e.target)) {
        setShowFieldsPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFieldsPanel]);

  const toggleField = (key) => {
    const next = enabledFields.includes(key)
      ? enabledFields.filter((k) => k !== key)
      : [...enabledFields, key];
    actions.setRiskFields(next);
  };

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleExpand  = (id)  => setExpandedId((prev) => (prev === id ? null : id));

  const riskScore = (r) => r.severity * r.likelihood;

  const allRisks = state.risks || [];

  const filtered = allRisks
    .filter((r) => !visibleProjectIds || visibleProjectIds.has(r.projectId))
    .filter((r) => filterStatus  === 'all' || r.status    === filterStatus)
    .filter((r) => !search || r.title.toLowerCase().includes(search.toLowerCase())
      || (r.mitigation || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => riskScore(b) - riskScore(a));

  const metricOpen       = allRisks.filter((r) => r.status === 'open').length;
  const metricCritical   = allRisks.filter((r) => r.status !== 'closed' && r.status !== 'cancelled' && riskScore(r) >= 12).length;
  const metricHigh       = allRisks.filter((r) => r.status !== 'closed' && r.status !== 'cancelled' && riskScore(r) >= 6 && riskScore(r) < 12).length;
  const metricMonitoring = allRisks.filter((r) => r.status === 'monitoring').length;
  const metricClosed     = allRisks.filter((r) => r.status === 'closed').length;
  const metricTotal      = allRisks.filter((r) => r.status !== 'cancelled').length;

  const metrics = [
    { label: 'Open',       value: metricOpen,       color: metricOpen > 0       ? 'var(--warn)'   : 'var(--fg-4)' },
    { label: 'Critical',   value: metricCritical,   color: metricCritical > 0   ? 'var(--danger)' : 'var(--fg-4)' },
    { label: 'High',       value: metricHigh,       color: metricHigh > 0       ? 'var(--warn)'   : 'var(--fg-4)' },
    { label: 'Monitoring', value: metricMonitoring, color: 'var(--info)' },
    { label: 'Closed',     value: metricClosed,     color: 'var(--ok)' },
    { label: 'Total',      value: metricTotal,      color: 'var(--fg-2)' },
  ];

  let sections;
  if (groupBy === 'status') {
    const defs = [
      { key: 'open',       label: 'Open',       labelColor: 'var(--warn)' },
      { key: 'monitoring', label: 'Monitoring', labelColor: 'var(--info)' },
      { key: 'closed',     label: 'Closed',     labelColor: 'var(--ok)', defaultCollapsed: true },
      { key: 'cancelled',  label: 'Cancelled',  labelColor: 'var(--fg-4)', defaultCollapsed: true },
    ];
    sections = defs
      .map((g) => ({ ...g, items: filtered.filter((r) => r.status === g.key) }))
      .filter((g) => g.items.length > 0);
  } else {
    const active = filtered.filter((r) => r.status !== 'cancelled');
    const critical = active.filter((r) => riskScore(r) >= 12);
    const high     = active.filter((r) => riskScore(r) >= 6 && riskScore(r) < 12);
    const low      = active.filter((r) => riskScore(r) < 6);
    const cancelledItems = filtered.filter((r) => r.status === 'cancelled');
    sections = [];
    if (critical.length) sections.push({ key: 'critical', label: 'Critical (≥12)', labelColor: 'var(--danger)', items: critical });
    if (high.length)     sections.push({ key: 'high',     label: 'High (6–11)',    labelColor: 'var(--warn)',   items: high });
    if (low.length)      sections.push({ key: 'low',      label: 'Low (<6)',       labelColor: 'var(--fg-4)',   items: low });
    if (cancelledItems.length) sections.push({ key: 'cancelled', label: 'Cancelled', labelColor: 'var(--fg-4)', items: cancelledItems, defaultCollapsed: true });
  }

  React.useEffect(() => {
    const init = {};
    sections.forEach((s) => { if (s.defaultCollapsed && collapsed[s.key] === undefined) init[s.key] = true; });
    if (Object.keys(init).length) setCollapsed((prev) => ({ ...prev, ...init }));
  }, [groupBy]);

  const openModal = (id) => { setModalId(id || null); setShowModal(true); };

  return (
    <>
    <div className="content-narrow">
      {/* Header */}
      <div className="row-flex-sb" style={{ marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <div className="title-h1">Risks</div>
          <div className="title-sub">{metricOpen} open{metricCritical > 0 ? ` · ${metricCritical} critical` : ''} · Score = severity × likelihood</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Guide button */}
          <button className="btn btn-sm" onClick={() => setShowGuide(true)} title="Risk register guide">
            <Icon name="circle" size={11} /> Guide
          </button>

          {/* Fields popover */}
          <div style={{ position: 'relative' }} ref={fieldsPanelRef}>
            <button
              className={`btn btn-sm${showFieldsPanel ? ' btn-primary' : ''}`}
              onClick={() => setShowFieldsPanel((v) => !v)}
            >
              <Icon name="settings" size={11} /> Fields{enabledFields.length > 0 ? ` · ${enabledFields.length}` : ''}
            </button>
            {showFieldsPanel && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
                background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 8,
                padding: '12px 14px', minWidth: 260, boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
              }}>
                <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 10 }}>
                  Optional fields — affects all views
                </div>
                {RISK_FIELDS_ALL.map((f) => (
                  <label key={f.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={enabledFields.includes(f.key)}
                      onChange={() => toggleField(f.key)}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', lineHeight: 1.3 }}>{f.label}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--fg-4)', lineHeight: 1.4 }}>{f.hint}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={() => openModal(null)}>
            <Icon name="plus" size={11} /> New risk
          </button>
        </div>
      </div>

      {/* Metrics strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ background: 'var(--bg-1)', padding: '10px 14px' }}>
            <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: m.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <input className="input" placeholder="Search risks…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 12, width: 200, flexShrink: 0 }} />
        <ProjectFilterDropdown
          programs={state.programs || []}
          projects={state.projects || []}
          selectedIds={filterIds}
          onChange={setFilterIds}
        />
        <div style={{ flex: 1 }} />
        <div className="seg" style={{ flexShrink: 0 }}>
          <button type="button" className={`seg-btn${groupBy === 'status'   ? ' active' : ''}`} onClick={() => setGroupBy('status')}>Status</button>
          <button type="button" className={`seg-btn${groupBy === 'severity' ? ' active' : ''}`} onClick={() => setGroupBy('severity')}>Severity</button>
        </div>
      </div>

      {/* Risk list */}
      <div className="card">
        {sections.length === 0 && <div className="empty">No risks match.</div>}
        {sections.map((section) => (
          <div key={section.key}>
            <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection(section.key)}>
              <Icon name={collapsed[section.key] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
              <span style={{ color: section.labelColor }}>{section.label}</span>
              <span className="tgroup-head-count">{section.items.length}</span>
            </div>
            {!collapsed[section.key] && section.items.map((r) => (
              <RiskRow key={r.id} risk={r}
                project={state.projects.find((p) => p.id === r.projectId)}
                expanded={expandedId === r.id}
                onToggleExpand={() => toggleExpand(r.id)}
                onEdit={() => openModal(r.id)}
                enabledFields={enabledFields} />
            ))}
          </div>
        ))}
      </div>
    </div>

    {showModal && (
      <RiskModal riskId={modalId} state={state}
        defaults={{ projectId: visibleProjectIds?.size === 1 ? [...visibleProjectIds][0] : undefined }}
        onClose={() => { setShowModal(false); setModalId(null); }} />
    )}
    {showGuide && <RiskGuideModal onClose={() => setShowGuide(false)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Risk row
// ---------------------------------------------------------------------------
function RiskRow({ risk, project, expanded, onToggleExpand, onEdit, enabledFields, hideFromRow }) {
  const ef    = enabledFields || RISK_FIELDS_DEFAULT;
  const hfr   = hideFromRow || [];
  const score = risk.severity * risk.likelihood;
  const tier  = score >= 12 ? 'danger' : score >= 6 ? 'warn' : 'ok';

  // Column order: score | title | [category] | [response] | [reviewDate] | status | project | arrow
  const cols = ['42px', '1fr'];
  if (ef.includes('category')   && !hfr.includes('category'))   cols.push('88px');
  if (ef.includes('response')   && !hfr.includes('response'))   cols.push('80px');
  if (ef.includes('reviewDate') && !hfr.includes('reviewDate')) cols.push('114px');
  cols.push('108px', '68px', '22px'); // status | project | arrow
  const colTemplate = cols.join(' ');

  // Quiet shared style for all metadata (category, response, review date)
  const metaText = { fontSize: 10.5, color: 'var(--fg-4)', fontFamily: 'var(--font-mono, monospace)' };
  // Response gets a subtle outlined pill — structured but neutral
  const responsePill = {
    display: 'inline-block', fontSize: 10, padding: '1px 7px', borderRadius: 4,
    border: '1px solid var(--line)', color: 'var(--fg-3)', background: 'transparent',
    fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.01em',
  };

  const lastUpdated = risk.updatedAt || risk.closedAt || risk.createdAt;

  return (
    <React.Fragment>
      <div
        className={`trow${expanded ? ' trow-expanded' : ''}`}
        style={{ gridTemplateColumns: colTemplate, cursor: 'pointer' }}
        onClick={onToggleExpand}
      >
        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className={`pill pill-${tier}`} style={{ fontSize: 12, fontWeight: 700, minWidth: 28, textAlign: 'center', padding: '2px 6px' }}>{score}</span>
        </div>

        {/* Title */}
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="truncate" style={{ fontWeight: 500, fontSize: 13 }}>{risk.title}</span>
        </div>

        {/* Category — quiet mono label, no per-value color */}
        {ef.includes('category') && !hfr.includes('category') && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ ...metaText, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {risk.category || '—'}
            </span>
          </div>
        )}

        {/* Response — neutral outlined pill */}
        {ef.includes('response') && !hfr.includes('response') && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {risk.response
              ? <span style={responsePill}>{risk.response}</span>
              : <span style={metaText}>—</span>
            }
          </div>
        )}

        {/* Review date — quiet mono, "Review [date]" prefix */}
        {ef.includes('reviewDate') && !hfr.includes('reviewDate') && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={metaText}>
              {risk.reviewDate ? `Review ${fmtDate(risk.reviewDate)}` : '—'}
            </span>
          </div>
        )}

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className={`pill${risk.status === 'closed' ? ' pill-ok' : risk.status === 'monitoring' ? ' pill-info' : risk.status === 'cancelled' ? ' pill-ghost' : ' pill-warn'}`}
            style={{ fontSize: 10, padding: '1px 7px' }}>
            {risk.status}
          </span>
        </div>

        {/* Project — rightmost */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ProjectChip project={project} />
        </div>

        {/* Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={expanded ? 'chevronD' : 'chevronR'} size={10} style={{ color: 'var(--fg-4)' }} />
        </div>
      </div>

      {expanded && (
        <div className="pq-detail" onClick={(e) => e.stopPropagation()}>

          {/* Top bar: S×L breakdown + dates */}
          <div className="pq-meta-row">
            <div className="pq-meta">
              <span className="pq-meta-item mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{risk.id.toUpperCase()}</span>
              <span className="pq-meta-sep" />
              <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                S{risk.severity}/5 · L{risk.likelihood}/5
              </span>
              <span className="pq-meta-sep" />
              <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>
                Created {fmtDate(risk.createdAt)}
              </span>
              {ef.includes('reviewDate') && risk.reviewDate && (
                <>
                  <span className="pq-meta-sep" />
                  <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                    Review {fmtDate(risk.reviewDate)}
                  </span>
                </>
              )}
              {ef.includes('dueDate') && risk.dueDate && (
                <>
                  <span className="pq-meta-sep" />
                  <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                    Due {fmtDate(risk.dueDate)}
                  </span>
                </>
              )}
              {hfr.includes('reviewDate') && ef.includes('reviewDate') && risk.reviewDate && (
                <>
                  <span className="pq-meta-sep" />
                  <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                    Review {fmtDate(risk.reviewDate)}
                  </span>
                </>
              )}
              {hfr.includes('category') && ef.includes('category') && risk.category && (
                <>
                  <span className="pq-meta-sep" />
                  <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {risk.category}
                  </span>
                </>
              )}
              {hfr.includes('response') && ef.includes('response') && risk.response && (
                <>
                  <span className="pq-meta-sep" />
                  <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                    {risk.response}
                  </span>
                </>
              )}
            </div>
            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Icon name="edit" size={11} /> Edit
            </button>
          </div>

          {/* Main content — user-specified order */}
          {ef.includes('description') && risk.description && (
            <div className="pq-section">
              <div className="pq-section-label">Description</div>
              <div className="pq-section-val">{risk.description}</div>
            </div>
          )}
          {ef.includes('impact') && risk.impact && (
            <div className="pq-section">
              <div className="pq-section-label">Impact</div>
              <div className="pq-section-val">{risk.impact}</div>
            </div>
          )}
          {risk.mitigation && (
            <div className="pq-section">
              <div className="pq-section-label">Mitigation</div>
              <div className="pq-section-val">{risk.mitigation}</div>
            </div>
          )}
          {ef.includes('trigger') && risk.trigger && (
            <div className="pq-section">
              <div className="pq-section-label">Trigger indicators</div>
              <div className="pq-section-val">{risk.trigger}</div>
            </div>
          )}
          {ef.includes('contingency') && risk.contingency && (
            <div className="pq-section">
              <div className="pq-section-label">Contingency plan</div>
              <div className="pq-section-val">{risk.contingency}</div>
            </div>
          )}
          {risk.owner && (
            <div className="pq-section">
              <div className="pq-section-label">Owner</div>
              <div className="pq-section-val">{risk.owner}</div>
            </div>
          )}

          {/* Bottom bar: last updated + status actions */}
          <div className="pq-detail-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>
              Updated {fmtDate(lastUpdated)}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {risk.status === 'open' && (
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); actions.updateRisk(risk.id, { status: 'monitoring' }); }}>Monitor</button>
              )}
              {risk.status !== 'closed' && (
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); actions.updateRisk(risk.id, { status: 'closed', closedAt: new Date().toISOString().slice(0, 10) }); }}>Close</button>
              )}
              {risk.status === 'closed' && (
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); actions.updateRisk(risk.id, { status: 'open', closedAt: null }); }}>Re-open</button>
              )}
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

// ---------------------------------------------------------------------------
// Risk modal (create / edit)
// ---------------------------------------------------------------------------
function RiskModal({ riskId, state, defaults, onClose }) {
  const existing      = riskId ? (state.risks || []).find((r) => r.id === riskId) : null;
  const todayIso      = new Date().toISOString().slice(0, 10);
  const initProjectId = defaults?.projectId || (state.projects.find((p) => p.status !== 'done')?.id || '');
  const ef            = state.meta?.riskFields || RISK_FIELDS_DEFAULT;

  const [local, setLocal] = React.useState(existing ? { ...existing } : {
    title: '', severity: 3, likelihood: 3, mitigation: '',
    owner: '', status: 'open', projectId: initProjectId, createdAt: todayIso,
    category: '', response: '', description: '', impact: '',
    trigger: '', contingency: '', dueDate: '', reviewDate: '',
  });

  const set   = (patch) => setLocal((prev) => ({ ...prev, ...patch }));
  const score = local.severity * local.likelihood;
  const tier  = score >= 12 ? 'danger' : score >= 6 ? 'warn' : 'ok';

  const handleSave = () => {
    if (!local.title.trim()) return;
    if (existing) {
      actions.updateRisk(riskId, local);
    } else {
      actions.addRisk({ ...local });
    }
    onClose();
  };

  return (
    <Modal open title={existing ? 'Edit risk' : 'New risk'} onClose={onClose}>
      <div className="field">
        <span className="field-label">Title</span>
        <input className="input" autoFocus value={local.title} onChange={(e) => set({ title: e.target.value })}
          placeholder="What is the risk?" />
      </div>

      {ef.includes('description') && (
        <div className="field">
          <span className="field-label">Description</span>
          <textarea className="textarea" rows={2} value={local.description || ''}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Full description and circumstances that could trigger this risk" />
        </div>
      )}

      <div className="row-2">
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Project</span>
          <select className="select" value={local.projectId || ''} onChange={(e) => set({ projectId: e.target.value })}>
            <option value="">Select project…</option>
            {state.projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name.split('—')[1]?.trim() || p.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Status</span>
          <select className="select" value={local.status || 'open'} onChange={(e) => set({ status: e.target.value })}>
            <option value="open">Open</option>
            <option value="monitoring">Monitoring</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Owner</span>
          <input className="input" value={local.owner || ''} onChange={(e) => set({ owner: e.target.value })}
            placeholder="Who owns this?" />
        </div>
      </div>

      {(ef.includes('category') || ef.includes('response')) && (
        <div className="row-2" style={{ marginTop: 12 }}>
          {ef.includes('category') && (
            <div className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">Category</span>
              <select className="select" value={local.category || ''} onChange={(e) => set({ category: e.target.value })}>
                <option value="">Select…</option>
                {RISK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {ef.includes('response') && (
            <div className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">Response strategy</span>
              <select className="select" value={local.response || ''} onChange={(e) => set({ response: e.target.value })}>
                <option value="">Select…</option>
                {RISK_RESPONSES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="row-2" style={{ marginTop: 12 }}>
        <div className="field">
          <span className="field-label">Severity — {local.severity}/5</span>
          <input type="range" min="1" max="5" value={local.severity}
            onChange={(e) => set({ severity: +e.target.value })} style={{ width: '100%' }} />
        </div>
        <div className="field">
          <span className="field-label">Likelihood — {local.likelihood}/5</span>
          <input type="range" min="1" max="5" value={local.likelihood}
            onChange={(e) => set({ likelihood: +e.target.value })} style={{ width: '100%' }} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <span className={`pill pill-${tier}`} style={{ fontSize: 13, fontWeight: 700 }}>Score {score}</span>
      </div>

      {ef.includes('impact') && (
        <div className="field">
          <span className="field-label">Impact</span>
          <textarea className="textarea" rows={2} value={local.impact || ''}
            onChange={(e) => set({ impact: e.target.value })}
            placeholder="Time, cost, or quality impact if this risk occurs" />
        </div>
      )}

      <div className="field">
        <span className="field-label">Mitigation</span>
        <textarea className="textarea" rows={3} value={local.mitigation || ''}
          onChange={(e) => set({ mitigation: e.target.value })}
          placeholder="How are you managing or reducing this risk?" />
      </div>

      {ef.includes('trigger') && (
        <div className="field">
          <span className="field-label">Trigger indicators</span>
          <textarea className="textarea" rows={2} value={local.trigger || ''}
            onChange={(e) => set({ trigger: e.target.value })}
            placeholder="What signals indicate this risk is materializing?" />
        </div>
      )}

      {ef.includes('contingency') && (
        <div className="field">
          <span className="field-label">Contingency plan</span>
          <textarea className="textarea" rows={2} value={local.contingency || ''}
            onChange={(e) => set({ contingency: e.target.value })}
            placeholder="What will you do if this risk occurs despite mitigation?" />
        </div>
      )}

      {(ef.includes('dueDate') || ef.includes('reviewDate')) && (
        <div className="row-2">
          {ef.includes('dueDate') && (
            <div className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">Target resolution date</span>
              <input className="input" type="date" value={local.dueDate || ''}
                onChange={(e) => set({ dueDate: e.target.value })} />
            </div>
          )}
          {ef.includes('reviewDate') && (
            <div className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">Next review date</span>
              <input className="input" type="date" value={local.reviewDate || ''}
                onChange={(e) => set({ reviewDate: e.target.value })} />
            </div>
          )}
        </div>
      )}

      <div className="modal-foot">
        {existing && (
          <button className="btn btn-danger btn-sm"
            onClick={() => { if (confirm('Delete this risk?')) { actions.deleteRisk(riskId); onClose(); } }}>
            <Icon name="trash" size={11} /> Delete
          </button>
        )}
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!local.title.trim()} onClick={handleSave}>
          {existing ? 'Save changes' : 'Add risk'}
        </button>
      </div>
    </Modal>
  );
}

Object.assign(window, { RisksView, RiskRow, RiskModal, RiskGuideModal, RISK_FIELDS_ALL, RISK_FIELDS_DEFAULT });
