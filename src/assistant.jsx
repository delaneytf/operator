// AI Assistant — grounded in Jira + Confluence via window.claude.complete

function Assistant({ state }) {
  const [activeThread, setActiveThread] = React.useState((state.chatThreads || [])[0]?.id || null);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [scope, setScope] = React.useState({ jira: true, confluence: true });
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (!activeThread && (state.chatThreads || [])[0]) setActiveThread(state.chatThreads[0].id);
  }, [(state.chatThreads || []).length]);

  const thread = (state.chatThreads || []).find((t) => t.id === activeThread);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
  }, [thread?.messages.length, busy]);

  const newThread = () => {
    const t = actions.addChatThread('New conversation');
    setActiveThread(t.id);
  };

  const buildContext = (q) => {
    const keywords = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const score = (text) => keywords.reduce((a, k) => a + (text.toLowerCase().includes(k) ? 1 : 0), 0);
    const jira = scope.jira ? state.jiraIssues
      .map((i) => ({ i, score: score(`${i.key} ${i.summary} ${i.description || ''} ${(i.labels || []).join(' ')} ${i.assignee} ${i.status}`) }))
      .sort((a, b) => b.score - a.score).slice(0, 12)
      .map(({ i }) => ({ key: i.key, type: i.type, status: i.status, priority: i.priority, assignee: i.assignee, summary: i.summary, sprint: state.sprints.find((s) => s.id === i.sprintId)?.name, points: i.storyPoints, description: (i.description || '').slice(0, 240) }))
      : [];
    const conf = scope.confluence ? state.confluencePages
      .map((p) => ({ p, score: score(`${p.title} ${p.body} ${(p.tags || []).join(' ')}`) }))
      .sort((a, b) => b.score - a.score).slice(0, 5)
      .map(({ p }) => ({ id: p.id, title: p.title, space: state.confluenceSpaces.find((s) => s.id === p.spaceId)?.name, author: p.author, updated: p.updated, excerpt: p.body.slice(0, 500) }))
      : [];
    const sprints = state.sprints.map((s) => ({
      name: s.name, state: s.state, start: s.start, end: s.end, goal: s.goal,
      points_total: state.jiraIssues.filter((i) => i.sprintId === s.id).reduce((a, b) => a + (b.storyPoints || 0), 0),
      points_done: state.jiraIssues.filter((i) => i.sprintId === s.id && i.status === 'Done').reduce((a, b) => a + (b.storyPoints || 0), 0),
      in_progress: state.jiraIssues.filter((i) => i.sprintId === s.id && i.status === 'In Progress').length,
      blocked: state.jiraIssues.filter((i) => i.sprintId === s.id && i.status === 'Blocked').length,
    }));
    return { jira, confluence: conf, sprints };
  };

  const send = async () => {
    if (!input.trim() || busy) return;
    let tid = activeThread;
    if (!tid) { const t = actions.addChatThread(input.slice(0, 40)); tid = t.id; setActiveThread(tid); }
    const q = input.trim();
    actions.appendChatMessage(tid, { role: 'user', text: q });
    setInput(''); setBusy(true);
    const ctx = buildContext(q);
    const sys = `You are an assistant embedded in a project management tool. You have READ-ONLY access to the user's Jira issues, sprints, and Confluence pages. Answer using ONLY the provided context. When citing a Jira issue, use its key (e.g. ATL-412). When citing a Confluence page, use its title in quotes. If context is insufficient, say so. Be concise — 3–6 sentences or short bullets.`;
    const blob = `CONTEXT:\n\nSPRINTS:\n${JSON.stringify(ctx.sprints, null, 2)}\n\nJIRA ISSUES:\n${JSON.stringify(ctx.jira, null, 2)}\n\nCONFLUENCE PAGES:\n${JSON.stringify(ctx.confluence, null, 2)}\n\n---\nQUESTION: ${q}`;
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: sys, messages: [{ role: 'user', content: blob }] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      const answer = data.text;
      const citedJira = (answer.match(/\b[A-Z]{2,6}-\d+\b/g) || []);
      const citedConf = ctx.confluence.filter((c) => answer.includes(c.title)).map((c) => c.title);
      actions.appendChatMessage(tid, { role: 'assistant', text: answer, citations: [...new Set([...citedJira, ...citedConf])] });
    } catch (e) {
      actions.appendChatMessage(tid, { role: 'assistant', text: `Couldn't reach the assistant. ${e.message || 'Is the server running and ANTHROPIC_API_KEY set in .env?'}`, citations: [] });
    } finally { setBusy(false); }
  };

  const examples = [
    'What is blocking the Atlas sprint right now?',
    "Summarize the Atlas v2 PRD in 3 bullets.",
    'Which Helios tickets are highest priority?',
    'Is the Postgres 16 upgrade on track?',
    'What did customer research surface about handoffs?',
  ];

  return (
    <div className="content-narrow assistant-wrap" style={{ maxWidth: 1280 }}>
      <div className="row-flex-sb" style={{ marginBottom: 14 }}>
        <div>
          <div className="row-flex" style={{ marginBottom: 4 }}>
            <Pill tone="accent"><Icon name="bolt" size={10} /> Assistant</Pill>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>grounded in Jira + Confluence</span>
          </div>
          <div className="title-h1">Ask a question</div>
          <div className="title-sub">Answers sourced from your team's issues, sprint status, and docs.</div>
        </div>
        <button className="btn" onClick={newThread}><Icon name="plus" size={11} /> New chat</button>
      </div>

      <div className="assistant-grid">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="card-head"><span className="card-head-title">Conversations</span></div>
          <div style={{ padding: 6, overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {(state.chatThreads || []).length === 0 && <div style={{ padding: 14, color: 'var(--fg-4)', fontSize: 12 }}>No conversations yet.</div>}
            {(state.chatThreads || []).map((t) => (
              <button key={t.id} className={`sb-item ${activeThread === t.id ? 'active' : ''}`} onClick={() => setActiveThread(t.id)} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 2, paddingTop: 7, paddingBottom: 7 }}>
                <span className="sb-item-label truncate" style={{ width: '100%', fontSize: 12.5 }}>{t.title}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{t.messages.length} msgs · {fmtRelative(t.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="card-head">
            <span className="card-head-title">{thread?.title || 'New conversation'}</span>
            <div className="row-flex">
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>scope:</span>
              <button className={`seg-btn ${scope.jira ? 'active' : ''}`} style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '2px 7px' }} onClick={() => setScope((s) => ({ ...s, jira: !s.jira }))}>Jira</button>
              <button className={`seg-btn ${scope.confluence ? 'active' : ''}`} style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '2px 7px' }} onClick={() => setScope((s) => ({ ...s, confluence: !s.confluence }))}>Confluence</button>
            </div>
          </div>
          <div ref={scrollRef} className="chat-scroll">
            {(!thread || thread.messages.length === 0) && (
              <div style={{ padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: 'var(--fg-2)', marginBottom: 12, fontWeight: 500 }}>Try asking:</div>
                <div className="stack-sm" style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {examples.map((ex) => (
                    <button key={ex} className="btn" style={{ textAlign: 'left', justifyContent: 'flex-start', width: '100%' }} onClick={() => setInput(ex)}>
                      <Icon name="bolt" size={10} /> {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {thread?.messages.map((m, i) => <ChatBubble key={i} message={m} />)}
            {busy && (
              <div className="chat-bubble chat-bubble-assistant">
                <div className="chat-label">Assistant</div>
                <div className="chat-typing"><span></span><span></span><span></span></div>
              </div>
            )}
          </div>
          <form className="chat-input-row" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input className="input" placeholder="Ask about sprints, tickets, or docs…" value={input} onChange={(e) => setInput(e.target.value)} disabled={busy} />
            <button type="submit" className="btn btn-primary" disabled={!input.trim() || busy}>{busy ? '…' : 'Send'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
      <div className="chat-label">{isUser ? 'You' : 'Assistant'}</div>
      <div className="chat-text">{message.text}</div>
      {message.citations?.length > 0 && (
        <div className="chat-cites">
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>sources:</span>
          {message.citations.map((c, i) => <span key={i} className="tag">{c}</span>)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Assistant, ChatBubble });
