// Integrations settings view

function IntegrationsView({ state }) {
  const integrations = state.meta.integrations || {};

  const getIntg = (key) => ({ connected: false, access: 'read', ...( integrations[key] || {}) });

  const [connecting, setConnecting] = React.useState(null);
  const [apiKeyInput, setApiKeyInput] = React.useState({});
  const [atlassianInput, setAtlassianInput] = React.useState({});
  const [expandedKey, setExpandedKey] = React.useState(null);
  const [serverStatus, setServerStatus] = React.useState({});
  const [dynamicScopes, setDynamicScopes] = React.useState({});   // { jira: [{key,name}], confluence: [{key,name}] }
  const [loadingScopes, setLoadingScopes] = React.useState({});

  // Fetch real Jira projects / Confluence spaces when the settings panel opens
  React.useEffect(() => {
    if (!expandedKey || (expandedKey !== 'jira' && expandedKey !== 'confluence')) return;
    if (dynamicScopes[expandedKey]) return; // already loaded
    const cfg = getIntg(expandedKey);
    if (!cfg.connected) return;
    const endpoint = expandedKey === 'jira' ? '/api/jira/projects' : '/api/confluence/spaces';
    setLoadingScopes(prev => ({ ...prev, [expandedKey]: true }));
    fetch(endpoint)
      .then(r => r.ok ? r.json() : [])
      .then(data => setDynamicScopes(prev => ({ ...prev, [expandedKey]: data })))
      .catch(() => setDynamicScopes(prev => ({ ...prev, [expandedKey]: [] })))
      .finally(() => setLoadingScopes(prev => ({ ...prev, [expandedKey]: false })));
  }, [expandedKey]);

  // Load server auth status on mount
  React.useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.ok ? r.json() : {})
      .then(status => {
        setServerStatus(status);
        // Merge server-connected providers into local state
        const patch = {};
        Object.entries(status).forEach(([provider, s]) => {
          if (s.connected && !integrations[provider]?.connected) {
            const now = new Date().toISOString().slice(0, 10);
            patch[provider] = {
              connected: true,
              user: s.email || s.user || (s.source === 'env' ? '.env' : null),
              site: s.site || null,
              connectedAt: s.savedAt?.slice(0, 10) || now,
              syncedAt: s.savedAt?.slice(0, 10) || now,
              access: 'read',
              trackActivity: true,
              notifications: false,
              selectedScopes: [],
            };
          }
        });
        if (Object.keys(patch).length > 0) {
          actions.setMeta({ integrations: { ...integrations, ...patch } });
        }
      })
      .catch(() => {});
  }, []);

  const GROUPS = [
    {
      group: 'Work',
      items: [
        {
          key: 'jira',
          name: 'Jira',
          logo: 'J',
          bg: '#0052CC',
          authType: 'atlassian',
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
          authType: 'atlassian',
          description: 'Read and write Confluence pages. Surface your editing activity in the daily log.',
          capabilities: [
            'Read pages, spaces, and comments',
            'Create and edit pages, add inline comments (read + write)',
            'Track pages you\'ve edited or commented on',
            'Notifications on page updates you\'re watching',
          ],
          scopeLabel: 'Spaces',
          scopeOptions: ['PROD', 'ENG', 'GTM', 'OPS'],
          note: 'Uses the same Atlassian account as Jira — one set of credentials for both.',
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
          authType: 'apikey',
          description: 'Surface threads that need follow-up. Post updates without leaving Operator.',
          capabilities: [
            'Read messages in channels you\'re a member of',
            'Post messages and replies to threads (read + write)',
            'Track threads you\'re active in as open action items',
            'Notifications on mentions, DMs, and reactions',
          ],
          scopeLabel: 'Channels',
          scopeOptions: ['#general', '#engineering', '#product', '#gtm', '#leadership'],
          keyPlaceholder: 'xoxb-… (Slack bot token)',
          note: 'Create a Slack app at api.slack.com/apps, add bot scopes channels:read, chat:write, then install to workspace.',
        },
        {
          key: 'teams',
          name: 'Microsoft Teams',
          logo: 'T',
          bg: '#6264A7',
          authType: 'apikey',
          description: 'Sync Teams calendar and channel activity into Operator.',
          capabilities: [
            'Read calendar events and meetings',
            'Create meetings and calendar events (read + write)',
            'Track messages you\'ve sent across channels',
            'Notifications on meeting invites and mentions',
          ],
          scopeLabel: 'Teams',
          scopeOptions: ['General', 'Engineering', 'Product', 'Leadership'],
          keyPlaceholder: 'Paste Microsoft Graph access token…',
          note: 'Get a token via Microsoft Graph Explorer or your IT admin. Uses the same account as Outlook.',
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
          authType: 'apikey',
          description: 'Connect your calendar and email for a complete daily picture.',
          capabilities: [
            'Read calendar events, email, and contacts',
            'Send emails and create calendar events from Operator (read + write)',
            'Calendar events appear on the Calendar and Today views',
            'Notifications on new email and meeting invites',
          ],
          scopeLabel: 'Calendars',
          scopeOptions: ['Primary', 'Work', 'Shared'],
          keyPlaceholder: 'Paste Microsoft Graph access token…',
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
          note: 'API key is saved to the server — never sent to any third party.',
          keyPlaceholder: 'sk-ant-…',
        },
        {
          key: 'openai',
          name: 'ChatGPT / OpenAI',
          logo: 'O',
          bg: '#10A37F',
          authType: 'apikey',
          description: 'Use OpenAI models as an alternative AI assistant.',
          capabilities: [
            'All assistant features via OpenAI models',
            'Alternative when Claude is unavailable',
          ],
          note: 'API key is saved to the server — never sent to any third party.',
          keyPlaceholder: 'sk-…',
        },
        {
          key: 'gemini',
          name: 'Gemini',
          logo: '✦',
          bg: '#4285F4',
          authType: 'apikey',
          description: 'Use Google Gemini models as an AI assistant.',
          capabilities: [
            'All assistant features via Gemini models',
            'Alternative or complement to Claude and OpenAI',
          ],
          note: 'API key is saved to the server — never sent to any third party.',
          keyPlaceholder: 'AIzaSy…',
        },
      ],
    },
  ];

  // Save API key for single-field providers → POST to server
  const saveApiKey = async (key, value) => {
    if (!value.trim()) return;
    setConnecting(key);
    try {
      const credentials = key === 'teams' || key === 'outlook'
        ? { accessToken: value.trim() }
        : key === 'claude'
        ? { apiKey: value.trim() }
        : key === 'openai'
        ? { apiKey: value.trim() }
        : { token: value.trim() };

      await fetch('/api/auth/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: key, credentials }),
      });

      const now = new Date().toISOString().slice(0, 10);
      actions.setMeta({
        integrations: {
          ...integrations,
          [key]: { connected: true, connectedAt: now, syncedAt: now, access: 'read', trackActivity: false, notifications: false },
        },
      });
      setApiKeyInput(prev => { const n = { ...prev }; delete n[key]; return n; });
      setExpandedKey(key);
    } catch (e) {
      alert(`Failed to save: ${e.message}`);
    } finally {
      setConnecting(null);
    }
  };

  // Save Atlassian credentials (3-field: site, email, token)
  const saveAtlassian = async (key, fields) => {
    const { site, email, token } = fields;
    if (!site.trim() || !email.trim() || !token.trim()) return;
    setConnecting(key);
    try {
      await fetch('/api/auth/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: key, credentials: { site: site.trim(), email: email.trim(), token: token.trim() } }),
      });

      const now = new Date().toISOString().slice(0, 10);
      actions.setMeta({
        integrations: {
          ...integrations,
          [key]: {
            connected: true, user: email.trim(), site: site.trim().replace(/^https?:\/\//, ''),
            connectedAt: now, syncedAt: now, access: 'read', trackActivity: true, notifications: false,
            selectedScopes: [],
          },
        },
      });
      setAtlassianInput(prev => { const n = { ...prev }; delete n[key]; return n; });
      setExpandedKey(key);
    } catch (e) {
      alert(`Failed to save: ${e.message}`);
    } finally {
      setConnecting(null);
    }
  };

  const disconnect = async (key, name) => {
    if (!confirm(`Disconnect ${name}? Settings will be cleared.`)) return;
    try {
      await fetch(`/api/auth/${key}`, { method: 'DELETE' });
    } catch (e) { /* non-fatal */ }
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
              const atlassianVal = atlassianInput[intg.key];
              const showAtlassianInput = !cfg.connected && !!atlassianVal;

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
                      {/* Name row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{intg.name}</span>
                        <span className="pill pill-ghost mono" style={{ fontSize: 9 }}>
                          {intg.authType === 'atlassian' ? 'API token' : 'API key'}
                        </span>
                        {cfg.connected && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                            <span className="mono" style={{ fontSize: 9.5, color: 'var(--fg-4)' }}>Connected</span>
                          </span>
                        )}
                        {/* Buttons pushed to the right */}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          {!cfg.connected ? (
                            <button
                              className="btn btn-sm btn-primary"
                              disabled={isConnecting}
                              onClick={() => {
                                if (intg.authType === 'atlassian') {
                                  setAtlassianInput(prev => ({ ...prev, [intg.key]: { site: '', email: '', token: '' } }));
                                } else {
                                  setApiKeyInput(prev => ({ ...prev, [intg.key]: '' }));
                                }
                              }}
                              style={{ minWidth: 80 }}
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
                                  Saving…
                                </span>
                              ) : 'Connect'}
                            </button>
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
                        </div>
                      </div>
                      {/* Status / description line */}
                      <div style={{ fontSize: 11.5, color: cfg.connected ? 'var(--fg-4)' : 'var(--fg-3)', marginTop: 4 }}>
                        {cfg.connected
                          ? [cfg.user, cfg.site, cfg.syncedAt && `Synced ${fmtDate(cfg.syncedAt)}`].filter(Boolean).join(' · ')
                          : intg.description}
                      </div>
                    </div>
                  </div>

                  {/* Atlassian 3-field input panel */}
                  {showAtlassianInput && (
                    <div style={{ borderTop: '1px solid var(--line)', padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 10.5, color: 'var(--fg-4)', marginBottom: 4 }}>Site URL</div>
                          <input
                            autoFocus
                            className="input"
                            style={{ width: '100%', fontSize: 12 }}
                            placeholder="https://acme.atlassian.net"
                            value={atlassianVal.site}
                            onChange={e => setAtlassianInput(prev => ({ ...prev, [intg.key]: { ...prev[intg.key], site: e.target.value } }))}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 10.5, color: 'var(--fg-4)', marginBottom: 4 }}>Email</div>
                          <input
                            className="input"
                            style={{ width: '100%', fontSize: 12 }}
                            placeholder="you@acme.co"
                            value={atlassianVal.email}
                            onChange={e => setAtlassianInput(prev => ({ ...prev, [intg.key]: { ...prev[intg.key], email: e.target.value } }))}
                          />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10.5, color: 'var(--fg-4)', marginBottom: 4 }}>
                          API token — <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>generate at id.atlassian.com</a>
                        </div>
                        <input
                          className="input"
                          style={{ width: '100%', fontSize: 12, fontFamily: 'var(--mono)' }}
                          placeholder="ATATT3x…"
                          value={atlassianVal.token}
                          onChange={e => setAtlassianInput(prev => ({ ...prev, [intg.key]: { ...prev[intg.key], token: e.target.value } }))}
                          onKeyDown={e => { if (e.key === 'Enter') saveAtlassian(intg.key, atlassianVal); }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={isConnecting || !atlassianVal.site.trim() || !atlassianVal.email.trim() || !atlassianVal.token.trim()}
                          onClick={() => saveAtlassian(intg.key, atlassianVal)}
                        >
                          {isConnecting ? 'Saving…' : 'Save credentials'}
                        </button>
                        <button className="btn btn-sm" onClick={() => setAtlassianInput(prev => { const n = {...prev}; delete n[intg.key]; return n; })}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

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
                      <button className="btn btn-sm btn-primary" disabled={!apiVal.trim() || isConnecting} onClick={() => saveApiKey(intg.key, apiVal)}>
                        {isConnecting ? 'Saving…' : 'Save'}
                      </button>
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

                      {/* Access level */}
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

                      {/* Scope picker — uses real API data for Jira/Confluence */}
                      {(intg.authType === 'atlassian' || (intg.scopeOptions && intg.scopeOptions.length > 0)) && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)' }}>
                              {intg.scopeLabel || 'Scope'} — select what to sync
                            </div>
                            {loadingScopes[intg.key] && (
                              <span className="mono" style={{ fontSize: 9, color: 'var(--fg-4)' }}>loading…</span>
                            )}
                            {dynamicScopes[intg.key] && (
                              <button className="btn btn-sm" style={{ fontSize: 9.5, padding: '1px 7px', marginLeft: 'auto' }}
                                onClick={() => setDynamicScopes(prev => { const n = {...prev}; delete n[intg.key]; return n; })}>
                                Refresh
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {(() => {
                              const live = dynamicScopes[intg.key];
                              const opts = live
                                ? live.map(o => ({ value: o.key, label: `${o.key} — ${o.name}` }))
                                : (intg.scopeOptions || []).map(o => ({ value: o, label: o }));
                              if (!loadingScopes[intg.key] && opts.length === 0) {
                                return <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>No {(intg.scopeLabel || 'items').toLowerCase()} found.</span>;
                              }
                              return opts.map(({ value, label }) => {
                                const selected = selectedScopes.includes(value);
                                return (
                                  <button key={value}
                                    onClick={() => toggleScope(intg.key, value, selectedScopes)}
                                    style={{
                                      padding: '4px 11px', borderRadius: 20, fontSize: 11.5,
                                      fontFamily: 'inherit', cursor: 'pointer',
                                      border: selected ? 'none' : '1px solid var(--line-2)',
                                      background: selected ? 'var(--accent)' : 'transparent',
                                      color: selected ? '#fff' : 'var(--fg-3)',
                                      transition: 'all 0.1s',
                                    }}>
                                    {label}
                                  </button>
                                );
                              });
                            })()}
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
        Credentials are saved to <code>data/tokens.json</code> on the server — never transmitted to third parties.
        API keys and tokens are not logged or exposed via the API.
      </div>
    </div>
  );
}

Object.assign(window, { IntegrationsView });
