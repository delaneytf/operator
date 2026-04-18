// Confluence integration — read-only space tree + article viewer.

function ConfluenceView({ state }) {
  const spaces = state.confluenceSpaces || [];
  const pagesAll = state.confluencePages || [];
  const [activeSpace, setActiveSpace] = React.useState(spaces[0]?.id);
  const [activePage, setActivePage] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [syncing, setSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState(null);

  const syncConfluence = async () => {
    setSyncing(true); setSyncError(null);
    try {
      const res = await fetch('/api/confluence/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      actions.setConfluenceData(data);
      actions.setMeta({ integrations: { ...state.meta.integrations, confluence: { syncedAt: new Date().toISOString().slice(0, 10) } } });
      if (data.confluenceSpaces?.[0]) setActiveSpace(data.confluenceSpaces[0].id);
    } catch (e) {
      setSyncError(e.message);
    } finally { setSyncing(false); }
  };

  if (!spaces.length) {
    return (
      <div className="content-narrow">
        <EmptyState title="Confluence not connected" body="Add your credentials to .env and click Sync to load your Confluence spaces." icon="note" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={syncConfluence} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync from Confluence'}
          </button>
          {syncError && <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 12 }}>{syncError}</div>}
        </div>
      </div>
    );
  }

  const pages = pagesAll.filter((p) => p.spaceId === activeSpace &&
    (!search || p.title.toLowerCase().includes(search.toLowerCase()) || p.body.toLowerCase().includes(search.toLowerCase()) || (p.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase())))
  );
  const page = pagesAll.find((p) => p.id === activePage) || pages[0];
  React.useEffect(() => { if (!page && pages[0]) setActivePage(pages[0].id); }, [activeSpace]);

  return (
    <div className="content-narrow" style={{ maxWidth: 1280 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="row-flex" style={{ marginBottom: 4 }}>
          <Pill tone="info"><Icon name="note" size={10} /> Confluence</Pill>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
            {state.meta.integrations?.confluence?.site} · synced {fmtRelative(state.meta.integrations?.confluence?.syncedAt)}
          </span>
        </div>
        <div className="row-flex-sb" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="title-h1">Docs</div>
            <div className="title-sub">Read-only · browse team docs without switching tools</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button className="btn btn-sm" onClick={syncConfluence} disabled={syncing} title="Pull latest data from Confluence">
              {syncing ? '…' : <><Icon name="download" size={11} /> Sync</>}
            </button>
            {syncError && <div style={{ color: 'var(--danger)', fontSize: 11 }}>{syncError}</div>}
          </div>
        </div>
      </div>

      <div className="confluence-grid">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="card-head"><span className="card-head-title">Spaces</span></div>
          <div style={{ padding: 6 }}>
            {spaces.map((s) => {
              const count = pagesAll.filter((p) => p.spaceId === s.id).length;
              return (
                <button key={s.id} className={`sb-item ${activeSpace === s.id ? 'active' : ''}`} onClick={() => setActiveSpace(s.id)}>
                  <span className="sb-item-icon" style={{ fontSize: 13 }}>{s.icon}</span>
                  <span className="sb-item-label">{s.name}</span>
                  <span className="sb-item-hint">{count}</span>
                </button>
              );
            })}
          </div>
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--line)' }}>
            <input className="input" placeholder="Search pages…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', fontSize: 12 }} />
          </div>
          <div style={{ padding: 6, overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {pages.map((p) => (
              <button key={p.id} className={`sb-item ${page?.id === p.id ? 'active' : ''}`} onClick={() => setActivePage(p.id)} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 2, paddingTop: 7, paddingBottom: 7 }}>
                <span className="sb-item-label" style={{ fontSize: 12.5, lineHeight: 1.3 }}>{p.title}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{p.author} · {fmtRelative(p.updated)}</span>
              </button>
            ))}
            {pages.length === 0 && <EmptyState title="No pages" />}
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden', minHeight: 0 }}>
          {page ? <ArticleView page={page} state={state} /> : <EmptyState title="Select a page" />}
        </div>
      </div>
    </div>
  );
}

function ArticleView({ page, state }) {
  const space = state.confluenceSpaces.find((s) => s.id === page.spaceId);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '18px 28px 14px', borderBottom: '1px solid var(--line)' }}>
        <div className="row-flex" style={{ marginBottom: 10 }}>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{space?.name} / {page.title}</span>
          <a href={`https://${state.meta.integrations?.confluence?.site}/wiki/spaces/${space?.key}/pages/${page.id}`} target="_blank" rel="noopener" className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', textDecoration: 'none', marginLeft: 'auto' }}>↗ open in Confluence</a>
        </div>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 10, textWrap: 'pretty' }}>{page.title}</div>
        <div className="row-flex" style={{ flexWrap: 'wrap' }}>
          <JiraAvatar name={page.author} size={18} />
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{page.author}</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>· updated {fmtRelative(page.updated)}</span>
          <span style={{ flex: 1 }} />
          {page.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>
      <div style={{ padding: '20px 28px 60px', overflowY: 'auto', flex: 1 }}>
        <MarkdownBlock src={page.body} />
      </div>
    </div>
  );
}

function MarkdownBlock({ src }) {
  const lines = src.split('\n');
  const out = [];
  let listBuf = [];
  const flushList = () => {
    if (listBuf.length) { out.push(<ul key={`ul-${out.length}`} className="md-ul">{listBuf.map((l, i) => <li key={i}>{renderInline(l)}</li>)}</ul>); listBuf = []; }
  };
  lines.forEach((line, i) => {
    if (line.startsWith('# ')) { flushList(); out.push(<h2 key={i} className="md-h1">{renderInline(line.slice(2))}</h2>); }
    else if (line.startsWith('## ')) { flushList(); out.push(<h3 key={i} className="md-h2">{renderInline(line.slice(3))}</h3>); }
    else if (line.startsWith('### ')) { flushList(); out.push(<h4 key={i} className="md-h3">{renderInline(line.slice(4))}</h4>); }
    else if (/^\s*[-*]\s/.test(line)) { listBuf.push(line.replace(/^\s*[-*]\s/, '')); }
    else if (/^\d+\.\s/.test(line)) { listBuf.push(line.replace(/^\d+\.\s/, '')); }
    else if (line.startsWith('> ')) { flushList(); out.push(<blockquote key={i} className="md-quote">{renderInline(line.slice(2))}</blockquote>); }
    else if (line.trim() === '') { flushList(); }
    else { flushList(); out.push(<p key={i} className="md-p">{renderInline(line)}</p>); }
  });
  flushList();
  return <div className="md">{out}</div>;
}

function renderInline(text) {
  const parts = []; let rest = text; let key = 0;
  while (rest.length) {
    const bold = rest.match(/\*\*([^*]+)\*\*/);
    const code = rest.match(/`([^`]+)`/);
    const next = [bold, code].filter(Boolean).sort((a, b) => a.index - b.index)[0];
    if (!next) { parts.push(rest); break; }
    if (next.index > 0) parts.push(rest.slice(0, next.index));
    if (next === bold) parts.push(<strong key={key++}>{next[1]}</strong>);
    else parts.push(<code key={key++} className="md-code">{next[1]}</code>);
    rest = rest.slice(next.index + next[0].length);
  }
  return parts;
}

Object.assign(window, { ConfluenceView, ArticleView, MarkdownBlock });
