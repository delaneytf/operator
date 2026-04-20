// Integrations settings view

function IntegrationsView({ state }) {
  const integrations = state.meta.integrations || {};

  const getIntg = (key) => ({ connected: false, access: 'read', ...( integrations[key] || {}) });

  const [connecting, setConnecting] = React.useState(null);
  const [apiKeyInput, setApiKeyInput] = React.useState({});  // { [key]: string }
  const [expandedKey, setExpandedKey] = React.useState(null);

  const GROUPS = [
    {
      group: 'Work',
      items: [
        {
          key: 'jira',
          name: 'Jira',
          logo: 'J',
          bg: '#0052CC',
          authType: 'oauth',
          description: 'Sync issues, sprints, and comments. Track what you create and get notified on changes.',
          capabilities: [
            'Read issues, sprints, and comments across projects',
            'Create issues, post comments, log time (read + write)',
            'Surface issues you created or were assigned to in Today & Review',
            'Notifications on assignment, mention, and status change',
          ],
          scopeLabel: 'Projects',
          scopeOptions: ['ATL', 'HEL', 'ORB', 'PLAT'],
        },
        {
          key: 'confluence',
          name: 'Confluence',
          logo: 'C',
          bg: '#0052CC',
          authType: 'oauth',
          description: 'Read and write Confluence pages. Surface your editing activity in the daily log.',
          capabilities: [
            'Read pages, spaces, and comments',
            'Create and edit pages, add inline comments (read + write)',
            'Track pages you\'ve edited or commented on',
            'Notifications on page updates you\'re watching',
          ],
          scopeLabel: 'Spaces',
          scopeOptions: ['PROD', 'ENG', 'GTM', 'OPS'],
          note: 'Uses the same Atlassian account as Jira — one sign-in for both.',
        },
      ],
    },
    {
      group: 'Communication',
      items: [
        {
          key: 'slack',
          name: 'Slack',
          logo: 'S',
          bg: '#4A154B',
          authType: 'oauth',
          description: 'Surface threads that need follow-up. Post updates without leaving Operator.',
          capabilities: [
            'Read messages in channels you\'re a member of',
            'Post messages and replies to threads (read + write)',
            'Track threads you\'re active in as open action items',
            'Notifications on mentions, DMs, and reactions',
          ],
          scopeLabel: 'Channels',
          scopeOptions: ['#general', '#engineering', '#product', '#gtm', '#leadership'],
        },
        {
          key: 'teams',
          name: 'Microsoft Teams',
          logo: 'T',
          bg: '#6264A7',
          authType: 'oauth',
          description: 'Sync Teams calendar and channel activity into Operator.',
          capabilities: [
            'Read calendar events and meetings',
            'Create meetings and calendar events (read + write)',
            'Track messages you\'ve sent across channels',
            'Notifications on meeting invites and mentions',
          ],
          scopeLabel: 'Teams',
          scopeOptions: ['General', 'Engineering', 'Product', 'Leadership'],
          note: 'Uses the same Microsoft account as Outlook — one sign-in for both.',
        },
      ],
    },
    {
      group: 'Calendar & Email',
      items: [
        {
          key: 'outlook',
          name: 'Outlook',
          logo: 'O',
          bg: '#0078D4',
          authType: 'oauth',
          description: 'Connect your calendar and email for a complete daily picture.',
          capabilities: [
            'Read calendar events, email, and contacts',
            'Send emails and create calendar events from Operator (read + write)',
            'Calendar events appear on the Calendar and Today views',
            'Notifications on new email and meeting invites',
          ],
          scopeLabel: 'Calendars',
          scopeOptions: ['Primary', 'Work', 'Shared'],
          note: 'Uses the same Microsoft account as Teams — one sign-in for both.',
        },
      ],
    },
    {
      group: 'Analytics',
      items: [
        {
          key: 'metabase',
          name: 'Metabase',
          logo: 'M',
          bg: '#509EE3',
          authType: 'apikey',
          description: 'Embed charts and dashboards alongside your projects.',
          capabilities: [
            'Read dashboards and saved questions',
            'Embed charts inline in project views',
            'Filter and explore data without leaving Operator',
          ],
          scopeLabel: 'Dashboards',
          scopeOptions: [],
          note: 'Metabase uses API keys or signed JWT embedding — no OAuth.',
          keyPlaceholder: 'Paste Metabase API key…',
        },
      ],
    },
    {
      group: 'AI Assistants',
      items: [
        {
          key: 'claude',
          name: 'Claude',
          logo: '◎',
          bg: 'var(--accent)',
          authType: 'apikey',
          description: 'Power Plan my day, risk summarization, and assistant features.',
          capabilities: [
            'Plan my day generation and refinement',
            'Risk and decision summarization',
            'Context-aware assistant replies',
          ],
          note: 'API key is stored in localStorage only — never sent to any third party.',
          keyPlaceholder: 'sk-ant-…',
        },
        {
          key: 'chatgpt',
          name: 'ChatGPT',
          logo: 'G',
          bg: '#10A37F',
          authType: 'apikey',
          description: 'Use OpenAI models as an alternative AI assistant.',
          capabilities: [
            'All assistant features via OpenAI models',
            'Alternative when Claude is unavailable',
          ],
          note: 'API key is stored in localStorage only — never sent to any third party.',
          keyPlaceholder: 'sk-…',
        },
      ],
    },
  ];

  const simulateOAuth = (key) => {
    setConnecting(key);
    setTimeout(() => {
      setConnecting(null);
      const now = new Date().toISOString().slice(0, 10);
      const item = GROUPS.flatMap(g => g.items).find(i => i.key === key);
      actions.setMeta({
        integrations: {
          ...integrations,
          [key]: {
            connected: true,
            user: 'you@acme.co',
            site: key === 'jira' || key === 'confluence' ? 'acme.atlassian.net'
              : key === 'slack' ? 'acme.slack.com'
              : key === 'teams' || key === 'outlook' ? 'acme.onmicrosoft.com'
              : null,
            connectedAt: now,
            syncedAt: now,
            access: 'read',
            trackActivity: true,
            notifications: false,
            selectedScopes: item?.scopeOptions ? [...item.scopeOptions] : [],
          },
        },
      });
      setExpandedKey(key);
    }, 2000);
  };

  const saveApiKey = (key, value) => {
    if (!value.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    actions.setMeta({
      integrations: {
        ...integrations,
        [key]: { connected: true, apiKey: value.trim(), connectedAt: now, syncedAt: now, access: 'read', trackActivity: false, notifications: false },
      },
    });
    setApiKeyInput(prev => { const n = { ...prev }; delete n[key]; return n; });
    setExpandedKey(key);
  };

  const disconnect = (key, name) => {
    if (!confirm(`Disconnect ${name}? Settings will be cleared.`)) return;
    actions.setMeta({ integrations: { ...integrations, [key]: { connected: false } } });
    if (expandedKey === key) setExpandedKey(null);
  };

  const updateIntg = (key, patch) => {
    actions.setMeta({ integrations: { ...integrations, [key]: { ...getIntg(key), ...patch } } });
  };

  const toggleScope = (key, opt, currentScopes) => {
    const next = currentScopes.includes(opt)
      ? currentScopes.filter(x => x !== opt)
      : [...currentScopes, opt];
    updateIntg(key, { selectedScopes: next });
  };

  const connectedCount = GROUPS.flatMap(g => g.items).filter(i => getIntg(i.key).connected).length;

  return (
    <div style={{ maxWidth: 660, padding: '0 0 40px' }}>
      <div className="page-hd">
        <div>
          <div className="page-title">Integrations</div>
          <div className="page-sub">
            {connectedCount === 0 ? 'No integrations connected yet.' : `${connectedCount} connected`}
            {' · '}Connect tools to sync your activity, enable write actions, and surface notifications.
          </div>
        </div>
      </div>

      {GROUPS.map((group) => (
        <div key={group.group} style={{ marginBottom: 32 }}>
          <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 8, paddingLeft: 2 }}>
            {group.group}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {group.items.map((intg) => {
              const cfg = getIntg(intg.key);
              const isConnecting = connecting === intg.key;
              const isExpanded = expandedKey === intg.key && cfg.connected;
              const selectedScopes = cfg.selectedScopes || intg.scopeOptions || [];
              const apiVal = apiKeyInput[intg.key] ?? '';
              const showApiInput = !cfg.connected && apiKeyInput.hasOwnProperty(intg.key);

              return (
                <div key={intg.key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Card header */}
                  <div
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px', cursor: cfg.connected ? 'pointer' : 'default' }}
                    onClick={() => cfg.connected && setExpandedKey(isExpanded ? null : intg.key)}
                  >
                    {/* Logo */}
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, marginTop: 1,
                      background: intg.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
                      fontFamily: 'Helvetica Neue, Helvetica, sans-serif',
                    }}>
                      {intg.logo}
                    </div>

                    {/* Content column */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name row — name, pill, status dot, buttons all inline */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{intg.name}</span>
                        <span className="pill pill-ghost mono" style={{ fontSize: 9 }}>{intg.authType === 'oauth' ? 'OAuth' : 'API key'}</span>
                        {cfg.connected && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                            <span className="mono" style={{ fontSize: 9.5, color: 'var(--fg-4)' }}>Connected</span>
                          </span>
                        )}
                        {/* Buttons pushed to the right of the name row */}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          {!cfg.connected ? (
                            intg.authType === 'oauth' ? (
                              <button
                                className="btn btn-sm btn-primary"
                                disabled={isConnecting}
                                onClick={() => simulateOAuth(intg.key)}
                                style={{ minWidth: 96 }}
                              >
                                {isConnecting ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{
                                      width: 10, height: 10, borderRadius: '50%',
                                      border: '1.5px solid rgba(255,255,255,.3)',
                                      borderTopColor: '#fff',
                                      display: 'inline-block',
                                      animation: 'spin 0.8s linear infinite',
                                    }} />
                                    Connecting…
                                  </span>
                                ) : '↗ Connect'}
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => setApiKeyInput(prev => ({ ...prev, [intg.key]: '' }))}
                              >
                                Add key
                              </button>
                            )
                          ) : (
                        <>
                          <button className="btn btn-sm" onClick={() => setExpandedKey(isExpanded ? null : intg.key)}>
                            {isExpanded ? 'Close' : 'Settings'}
                          </button>
                          <button className="btn btn-sm" style={{ color: 'var(--fg-4)' }} onClick={() => disconnect(intg.key, intg.name)}>
                            Disconnect
                          </button>
                        </>
                      )}
                        </div>{/* end buttons wrapper */}
                      </div>{/* end name row */}
                      {/* Status / description line */}
                      <div style={{ fontSize: 11.5, color: cfg.connected ? 'var(--fg-4)' : 'var(--fg-3)', marginTop: 4 }}>
                        {cfg.connected
                          ? [cfg.user, cfg.site && cfg.site, cfg.syncedAt && `Synced ${fmtDate(cfg.syncedAt)}`].filter(Boolean).join(' · ')
                          : intg.description}
                      </div>
                    </div>{/* end content column */}
                  </div>{/* end card header */}

                  {/* API key input panel */}
                  {showApiInput && (
                    <div style={{ borderTop: '1px solid var(--line)', padding: '12px 14px', display: 'flex', gap: 8 }}>
                      <input
                        autoFocus
                        className="input"
                        style={{ flex: 1, fontSize: 12, fontFamily: 'var(--mono)' }}
                        placeholder={intg.keyPlaceholder || 'Paste API key…'}
                        value={apiVal}
                        onChange={e => setApiKeyInput(prev => ({ ...prev, [intg.key]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') saveApiKey(intg.key, apiVal); if (e.key === 'Escape') setApiKeyInput(prev => { const n = {...prev}; delete n[intg.key]; return n; }); }}
                      />
                      <button className="btn btn-sm btn-primary" disabled={!apiVal.trim()} onClick={() => saveApiKey(intg.key, apiVal)}>Save</button>
                      <button className="btn btn-sm" onClick={() => setApiKeyInput(prev => { const n = {...prev}; delete n[intg.key]; return n; })}>Cancel</button>
                    </div>
                  )}

                  {/* Expanded settings panel */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--line)', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                      {/* Capabilities */}
                      <div>
                        <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 8 }}>What this integration can do</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {intg.capabilities.map((cap, i) => (
                            <div key={i} style={{ fontSize: 12, color: 'var(--fg-2)', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                              <span style={{ color: '#22c55e', flexShrink: 0, marginTop: 1, lineHeight: 1 }}>✓</span>
                              {cap}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Access level — only for OAuth */}
                      {intg.authType === 'oauth' && (
                        <div>
                          <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 8 }}>Access level</div>
                          <div className="seg" style={{ width: 'fit-content' }}>
                            {[['read', 'Read only'], ['read-write', 'Read + write']].map(([val, label]) => (
                              <button key={val}
                                className={`seg-btn ${(cfg.access || 'read') === val ? 'active' : ''}`}
                                onClick={() => updateIntg(intg.key, { access: val })}>
                                {label}
                              </button>
                            ))}
                          </div>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 6 }}>
                            {(cfg.access || 'read') === 'read'
                              ? 'Read only — Operator will never create or modify anything in this tool.'
                              : 'Read + write — Operator can create, comment, and update records on your behalf.'}
                          </div>
                        </div>
                      )}

                      {/* Tracking toggles */}
                      <div>
                        <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 10 }}>Tracking & notifications</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {[
                            ['trackActivity', 'Track my activity', 'Surface things I created, commented on, or was assigned to in the daily log and weekly review.'],
                            ['notifications', 'Browser notifications', 'Notify me when I\'m mentioned, assigned, or when watched items change.'],
                          ].map(([field, label, desc]) => (
                            <label key={field} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={!!cfg[field]}
                                onChange={e => updateIntg(intg.key, { [field]: e.target.checked })}
                                style={{ marginTop: 3, accentColor: 'var(--accent)', flexShrink: 0 }}
                              />
                              <div>
                                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</div>
                                <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{desc}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Scope picker */}
                      {intg.scopeOptions && intg.scopeOptions.length > 0 && (
                        <div>
                          <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 8 }}>
                            {intg.scopeLabel || 'Scope'} — select what to sync
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {intg.scopeOptions.map((opt) => {
                              const selected = selectedScopes.includes(opt);
                              return (
                                <button key={opt}
                                  onClick={() => toggleScope(intg.key, opt, selectedScopes)}
                                  style={{
                                    padding: '4px 11px',
                                    borderRadius: 20,
                                    fontSize: 11.5,
                                    fontFamily: 'inherit',
                                    cursor: 'pointer',
                                    border: selected ? 'none' : '1px solid var(--line-2)',
                                    background: selected ? 'var(--accent)' : 'transparent',
                                    color: selected ? '#fff' : 'var(--fg-3)',
                                    transition: 'all 0.1s',
                                  }}>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 6 }}>
                            Only selected {(intg.scopeLabel || 'items').toLowerCase()} will be synced and surfaced in Operator.
                          </div>
                        </div>
                      )}

                      {intg.note && (
                        <div style={{ paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>ⓘ {intg.note}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        OAuth connections redirect to the provider for authorization — your credentials are never stored by Operator.
        API keys are saved to localStorage on this device only.
      </div>
    </div>
  );
}

Object.assign(window, { IntegrationsView });
