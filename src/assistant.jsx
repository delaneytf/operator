// AI Assistant — grounded in full platform data + Jira + Confluence

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

    // Always-included app data
    const projects = state.projects.map((p) => ({
      id: p.id, code: p.code, name: p.name, status: p.status,
      dueDate: p.dueDate || null, owner: p.owner || null, objective: (p.objective || '').slice(0, 200),
    }));

    const tasks = state.tasks
      .filter((t) => t.status !== 'done')
      .map((t) => {
        const proj = state.projects.find((p) => p.id === t.projectId);
        const taskBlockers = (state.blockers || []).filter((b) => b.taskId === t.id);
        return {
          id: t.id, title: t.title, status: t.status, priority: t.priority,
          dueDate: t.dueDate || null, estimate: t.estimate || 0,
          project: proj ? proj.code : null,
          blockers: taskBlockers.map((b) => b.description),
          dependsOn: (t.dependsOn || []).length,
        };
      })
      .sort((a, b) => (['critical','high','medium','low'].indexOf(a.priority) - ['critical','high','medium','low'].indexOf(b.priority)));

    const risks = (state.risks || [])
      .filter((r) => r.status !== 'closed')
      .map((r) => {
        const proj = state.projects.find((p) => p.id === r.projectId);
        return {
          id: r.id, title: r.title, status: r.status,
          score: r.severity * r.likelihood, severity: r.severity, likelihood: r.likelihood,
          project: proj ? proj.code : null, reviewDate: r.reviewDate || null,
          mitigation: (r.mitigation || '').slice(0, 150),
        };
      })
      .sort((a, b) => b.score - a.score);

    const blockers = (state.blockers || []).map((b) => {
      const task = state.tasks.find((t) => t.id === b.taskId);
      const proj = task ? state.projects.find((p) => p.id === task.projectId) : null;
      return {
        description: b.description, waitingOn: b.waitingOn, since: b.since,
        task: task ? task.title : null, project: proj ? proj.code : null,
        jiraKey: b.jiraKey || null,
      };
    });

    const questions = (state.notes || [])
      .filter((n) => n.kind === 'question' && !n.resolved)
      .map((q) => {
        const proj = state.projects.find((p) => p.id === (q.projectId || (q.projectIds || [])[0]));
        return { id: q.id, title: q.title, body: (q.body || '').slice(0, 200), project: proj ? proj.code : null, date: q.date };
      });

    const decisions = (state.notes || [])
      .filter((n) => n.kind === 'decision')
      .slice(0, 15)
      .map((d) => {
        const proj = state.projects.find((p) => p.id === (d.projectId || (d.projectIds || [])[0]));
        return { title: d.title, body: (d.body || '').slice(0, 200), project: proj ? proj.code : null, date: d.date };
      });

    const meetings = (state.meetings || [])
      .slice(0, 10)
      .map((m) => ({
        title: m.title, date: m.date, project: (state.projects.find((p) => p.id === m.projectId) || {}).code || null,
        summary: (m.summary || '').slice(0, 200),
      }));

    // Keyword-scored integrations
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

    return { projects, tasks, risks, blockers, questions, decisions, meetings, jira, confluence: conf, sprints };
  };

  const send = async () => {
    if (!input.trim() || busy) return;
    let tid = activeThread;
    if (!tid) { const t = actions.addChatThread(input.slice(0, 40)); tid = t.id; setActiveThread(tid); }
    const q = input.trim();
    actions.appendChatMessage(tid, { role: 'user', text: q });
    setInput(''); setBusy(true);
    const ctx = buildContext(q);
    const sys = `You are an AI assistant embedded in a project management tool. You have READ-ONLY access to all of the user's platform data: projects, tasks, risks, blockers, questions, decisions, meetings, plus Jira issues, sprints, and Confluence pages. Answer using ONLY the provided context. When referencing a task or risk use its title. When citing a Jira issue, use its key (e.g. ATL-412). When citing a Confluence page, use its title in quotes. If context is insufficient, say so. Be concise — 3–6 sentences or short bullets unless the user asks for more detail.`;
    const blob = `CONTEXT:\n\nPROJECTS:\n${JSON.stringify(ctx.projects, null, 2)}\n\nOPEN TASKS (sorted by priority):\n${JSON.stringify(ctx.tasks.slice(0, 30), null, 2)}\n\nOPEN RISKS:\n${JSON.stringify(ctx.risks.slice(0, 15), null, 2)}\n\nBLOCKERS:\n${JSON.stringify(ctx.blockers, null, 2)}\n\nOPEN QUESTIONS:\n${JSON.stringify(ctx.questions.slice(0, 10), null, 2)}\n\nRECENT DECISIONS:\n${JSON.stringify(ctx.decisions, null, 2)}\n\nRECENT MEETINGS:\n${JSON.stringify(ctx.meetings, null, 2)}\n\nSPRINTS:\n${JSON.stringify(ctx.sprints, null, 2)}\n\nJIRA ISSUES (keyword-matched):\n${JSON.stringify(ctx.jira, null, 2)}\n\nCONFLUENCE PAGES (keyword-matched):\n${JSON.stringify(ctx.confluence, null, 2)}\n\n---\nQUESTION: ${q}`;
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
    'What is blocking the most progress across my projects right now?',
    'Which risks are highest priority and what are the mitigations?',
    'Summarize what is overdue or at risk this week.',
    'What open questions have been unanswered the longest?',
    'What is blocking the Atlas sprint right now?',
    'Summarize the Atlas v2 PRD in 3 bullets.',
  ];

  return (
    <div className="content-narrow assistant-wrap" style={{ maxWidth: 1280 }}>
      <div className="row-flex-sb" style={{ marginBottom: 14 }}>
        <div>
          <div className="row-flex" style={{ marginBottom: 4 }}>
            <Pill tone="accent"><Icon name="bolt" size={10} /> Assistant</Pill>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>full platform context · Jira · Confluence</span>
          </div>
          <div className="title-h1">Ask a question</div>
          <div className="title-sub">Answers sourced from your tasks, projects, risks, meetings, decisions, questions, sprints, and docs.</div>
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
            <input className="input" placeholder="Ask about tasks, risks, blockers, projects, sprints, decisions…" value={input} onChange={(e) => setInput(e.target.value)} disabled={busy} />
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
