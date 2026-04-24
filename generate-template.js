const ExcelJS = require('exceljs');
const path = require('path');

async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Operator';

  const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
  const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  const EXAMPLE_FONT = { color: { argb: 'FF888888' }, italic: true, size: 10 };
  const BORDER = {
    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  };

  function addSheet(name, columns, exampleRows, notes) {
    const ws = wb.addWorksheet(name);

    // Instructions row
    if (notes) {
      ws.mergeCells(1, 1, 1, columns.length);
      const instrCell = ws.getCell(1, 1);
      instrCell.value = notes;
      instrCell.font = { italic: true, color: { argb: 'FF666666' }, size: 9 };
      instrCell.alignment = { wrapText: true };
      ws.getRow(1).height = 30;
    }

    // Header row
    const headerRowNum = notes ? 2 : 1;
    const headerRow = ws.getRow(headerRowNum);
    columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.border = BORDER;
      cell.alignment = { vertical: 'middle' };
    });
    headerRow.height = 22;

    // Set column widths
    ws.columns = columns.map((col) => ({ width: col.width || 18 }));

    // Add data validation for enum columns
    const dataRowStart = headerRowNum + 1;
    const dataRowEnd = headerRowNum + 100;
    columns.forEach((col, i) => {
      if (col.validation) {
        for (let r = dataRowStart; r <= dataRowEnd; r++) {
          ws.getCell(r, i + 1).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`"${col.validation.join(',')}"`],
            showErrorMessage: true,
            errorTitle: 'Invalid value',
            error: `Choose from: ${col.validation.join(', ')}`,
          };
        }
      }
    });

    // Example rows
    exampleRows.forEach((row, ri) => {
      const r = ws.getRow(headerRowNum + 1 + ri);
      row.forEach((val, ci) => {
        const cell = r.getCell(ci + 1);
        cell.value = val;
        cell.font = EXAMPLE_FONT;
        cell.border = BORDER;
      });
    });

    return ws;
  }

  // ── PROGRAMS ──
  addSheet('Programs', [
    { header: 'ref_id', width: 12 },
    { header: 'name', width: 30 },
    { header: 'status', width: 12, validation: ['planned', 'active', 'on-track', 'at-risk', 'blocked', 'done', 'closed'] },
    { header: 'description', width: 45 },
    { header: 'deliverable', width: 35 },
  ], [
    ['pg-1', 'Example Program', 'active', 'Strategic initiative description', 'Expected program outcome'],
  ], 'Enter one program per row. ref_id is used to link projects to this program.');

  // ── PROJECTS ──
  addSheet('Projects', [
    { header: 'ref_id', width: 10 },
    { header: 'program_ref', width: 12 },
    { header: 'code', width: 10 },
    { header: 'name', width: 30 },
    { header: 'objective', width: 35 },
    { header: 'description', width: 35 },
    { header: 'deliverable', width: 30 },
    { header: 'status', width: 12, validation: ['planned', 'on-track', 'at-risk', 'blocked', 'done', 'closed'] },
    { header: 'priority', width: 12, validation: ['critical', 'high', 'medium', 'low'] },
    { header: 'color', width: 10, validation: ['amber', 'rose', 'sky', 'violet', 'emerald'] },
    { header: 'owner', width: 16 },
    { header: 'team (pipe-separated)', width: 22 },
    { header: 'start_date', width: 14 },
    { header: 'due_date', width: 14 },
    { header: 'depends_on (pipe-separated)', width: 22 },
  ], [
    ['p-1', 'pg-1', 'ALPHA', 'Project Alpha', 'Deliver the new API', 'Full API redesign', 'Production API v2', 'on-track', 'high', 'sky', 'Jane', 'Alice|Bob|Carol', '2026-01-15', '2026-06-30', ''],
    ['p-2', 'pg-1', 'BETA', 'Project Beta', 'Migrate legacy data', '', 'Migrated database', 'on-track', 'medium', 'amber', 'You', 'Dave|Eve', '2026-02-01', '2026-07-15', 'p-1'],
  ], 'Enter one project per row. program_ref should match a ref_id from the Programs sheet. Use | to separate multiple team members or dependencies.');

  // ── SUCCESS CRITERIA ──
  addSheet('Success Criteria', [
    { header: 'project_ref', width: 12 },
    { header: 'type', width: 10, validation: ['metric', 'binary'] },
    { header: 'text', width: 40 },
    { header: 'baseline', width: 20 },
    { header: 'target', width: 20 },
    { header: 'final', width: 20 },
    { header: 'final_result', width: 12, validation: ['hit', 'missed'] },
    { header: 'done', width: 8, validation: ['yes', 'no'] },
  ], [
    ['p-1', 'metric', 'API response time under 200ms', '450ms', '200ms', '', '', ''],
    ['p-1', 'metric', '99.9% uptime in production', '99.5%', '99.9%', '', '', ''],
    ['p-1', 'binary', 'Runbook published and reviewed', '', '', '', '', 'no'],
  ], 'type: metric (baseline/target/final) or binary (done/not done). baseline/target/final only for metric. done only for binary.');

  // ── MILESTONES ──
  addSheet('Milestones', [
    { header: 'project_ref', width: 12 },
    { header: 'name', width: 30 },
    { header: 'description', width: 35 },
    { header: 'deliverable', width: 30 },
    { header: 'date', width: 14 },
    { header: 'status', width: 14, validation: ['planned', 'in-progress', 'blocked', 'done', 'cancelled'] },
  ], [
    ['p-1', 'API Design Complete', 'Finalize OpenAPI spec', 'Approved API specification', '2026-03-01', 'planned'],
    ['p-1', 'Beta Launch', 'Deploy to staging', 'Working staging environment', '2026-05-15', 'planned'],
  ], 'project_ref should match a ref_id from the Projects sheet.');

  // ── TASKS ──
  addSheet('Tasks', [
    { header: 'ref_id', width: 10 },
    { header: 'project_ref', width: 12 },
    { header: 'milestone_ref', width: 12 },
    { header: 'title', width: 35 },
    { header: 'status', width: 14, validation: ['todo', 'in-progress', 'blocked', 'done', 'cancelled'] },
    { header: 'priority', width: 12, validation: ['critical', 'high', 'medium', 'low'] },
    { header: 'due_date', width: 14 },
    { header: 'estimate (days)', width: 14 },
    { header: 'source', width: 12, validation: ['planned', 'reactive'] },
    { header: 'description', width: 40 },
    { header: 'depends_on (pipe-separated)', width: 22 },
  ], [
    ['t-1', 'p-1', 'ms-1', 'Write API specification', 'todo', 'high', '2026-02-15', 3, 'planned', 'Draft the OpenAPI spec for all endpoints', ''],
    ['t-2', 'p-1', 'ms-2', 'Implement auth endpoints', 'todo', 'high', '2026-03-01', 5, 'planned', 'Build login, logout, token refresh', 't-1'],
    ['t-3', 'p-1', '', 'Set up CI/CD pipeline', 'todo', 'medium', '2026-02-20', 2, 'planned', '', ''],
  ], 'ref_id is used to link blockers and dependencies. milestone_ref links to a milestone ref_id from the Milestones sheet. depends_on uses pipe-separated task ref_ids.');

  // ── BLOCKERS ──
  addSheet('Blockers', [
    { header: 'task_ref', width: 12 },
    { header: 'project_ref', width: 12 },
    { header: 'reason', width: 45 },
    { header: 'since', width: 14 },
  ], [
    ['t-2', 'p-1', 'Waiting on security team approval for auth approach', '2026-02-10'],
  ], 'task_ref should match a ref_id from the Tasks sheet.');

  // ── RISKS ──
  addSheet('Risks', [
    { header: 'project_ref', width: 12 },
    { header: 'title', width: 30 },
    { header: 'description', width: 35 },
    { header: 'severity (1-5)', width: 12, validation: ['1', '2', '3', '4', '5'] },
    { header: 'likelihood (1-5)', width: 12, validation: ['1', '2', '3', '4', '5'] },
    { header: 'category', width: 14, validation: ['Technical', 'Financial', 'Schedule', 'Resource', 'External', 'Compliance'] },
    { header: 'response', width: 12, validation: ['Reduce', 'Avoid', 'Accept', 'Transfer'] },
    { header: 'mitigation', width: 35 },
    { header: 'impact', width: 30 },
    { header: 'trigger', width: 25 },
    { header: 'contingency', width: 30 },
    { header: 'status', width: 12, validation: ['open', 'monitoring', 'closed', 'cancelled'] },
    { header: 'owner', width: 14 },
    { header: 'due_date', width: 14 },
    { header: 'review_date', width: 14 },
  ], [
    ['p-1', 'API performance risk', 'Response times may exceed targets under load', '4', '3', 'Technical', 'Reduce', 'Load testing in staging before launch', 'Degraded user experience', 'Avg response > 500ms in staging', 'Add caching layer', 'open', 'Jane', '2026-04-01', '2026-03-15'],
  ], 'severity: 1=negligible to 5=catastrophic. likelihood: 1=rare to 5=almost certain. Score = severity x likelihood.');

  // ── DECISIONS ──
  addSheet('Decisions', [
    { header: 'project_ref', width: 12 },
    { header: 'meeting_ref', width: 12 },
    { header: 'title', width: 30 },
    { header: 'body', width: 40 },
    { header: 'context', width: 35 },
    { header: 'options_considered', width: 35 },
    { header: 'reversibility', width: 14, validation: ['reversible', 'irreversible'] },
    { header: 'date', width: 14 },
    { header: 'tags (pipe-separated)', width: 22 },
  ], [
    ['p-1', '', 'Use PostgreSQL for primary store', 'PostgreSQL chosen over MongoDB for relational data needs', 'Need ACID transactions for financial data', 'A) PostgreSQL  B) MongoDB  C) CockroachDB', 'irreversible', '2026-01-20', 'architecture|database'],
  ], 'meeting_ref is optional — link to a meeting ref_id if this decision came from a meeting.');

  // ── QUESTIONS ──
  addSheet('Questions', [
    { header: 'project_ref (pipe-separated)', width: 22 },
    { header: 'meeting_ref', width: 12 },
    { header: 'title', width: 35 },
    { header: 'body', width: 40 },
    { header: 'resolution', width: 35 },
    { header: 'resolved', width: 10, validation: ['true', 'false'] },
    { header: 'date', width: 14 },
    { header: 'tags (pipe-separated)', width: 22 },
  ], [
    ['p-1', '', 'Do we need SOC 2 compliance for the API?', 'Legal mentioned compliance requirements', '', 'false', '2026-02-05', 'compliance|legal'],
  ], 'Use | to separate multiple project refs. resolved should be true or false.');

  // ── MEETINGS ──
  addSheet('Meetings', [
    { header: 'ref_id', width: 10 },
    { header: 'title', width: 30 },
    { header: 'date', width: 14 },
    { header: 'attendees (pipe-separated)', width: 25 },
    { header: 'notes', width: 45 },
    { header: 'project_refs (pipe-separated)', width: 22 },
    { header: 'recurrence', width: 12, validation: ['none', 'weekly', 'biweekly', 'monthly', 'quarterly'] },
  ], [
    ['mt-1', 'Sprint Planning', '2026-02-10', 'Jane|Alice|Bob', 'Planned sprint 1 scope', 'p-1|p-2', 'biweekly'],
  ], 'ref_id is used to link decisions/questions to this meeting. Use | to separate attendees and project refs.');

  // ── REMINDERS ──
  addSheet('Reminders', [
    { header: 'date', width: 14 },
    { header: 'title', width: 30 },
    { header: 'note', width: 45 },
  ], [
    ['2026-03-01', 'Review Q1 milestones', 'Check all project milestones and update statuses'],
  ], 'Simple date-based reminders.');

  // ── INSTRUCTIONS sheet ──
  const instrWs = wb.addWorksheet('Instructions');
  instrWs.columns = [{ width: 80 }];
  const instructions = [
    'OPERATOR IMPORT TEMPLATE — INSTRUCTIONS',
    '',
    'HOW TO USE:',
    '1. Fill out each sheet with your data (delete the gray example rows first)',
    '2. Upload this file to the Operator AI assistant',
    '3. Ask the assistant to "populate Operator with the data from this template"',
    '',
    'LINKING ENTITIES:',
    '• ref_id columns are for cross-referencing between sheets (e.g., linking tasks to projects)',
    '• Use any naming convention you like (pg-1, p-myproject, t-auth, etc.)',
    '• Operator will generate its own internal IDs — your ref_ids are just for linking',
    '',
    'MULTIPLE VALUES:',
    '• Use | (pipe) to separate multiple values: team members, tags, project refs, dependencies',
    '• Example: Alice|Bob|Carol or architecture|backend',
    '',
    'DATES:',
    '• Use YYYY-MM-DD format (e.g., 2026-03-15)',
    '',
    'DROPDOWN FIELDS:',
    '• Fields like status, priority, severity have dropdown validation — click a cell to see options',
    '',
    'OPTIONAL FIELDS:',
    '• Leave any field blank if not applicable — only title/name fields are required',
    '',
    'SHEETS:',
    '• Programs — Top-level initiatives containing multiple projects',
    '• Projects — Core work units with status, priority, dates, team',
    '• Success Criteria — Measurable targets for each project',
    '• Milestones — Key dates and deliverables within projects',
    '• Tasks — Individual work items within projects',
    '• Blockers — What\'s blocking specific tasks',
    '• Risks — Risk register with severity, likelihood, mitigation',
    '• Decisions — Logged decisions with context and rationale',
    '• Questions — Open questions needing answers',
    '• Meetings — Meeting notes with attendees and recurrence',
    '• Reminders — Date-based reminders',
  ];
  instructions.forEach((line, i) => {
    const cell = instrWs.getCell(i + 1, 1);
    cell.value = line;
    if (i === 0) {
      cell.font = { bold: true, size: 14 };
    } else if (line.endsWith(':')) {
      cell.font = { bold: true, size: 11 };
    } else {
      cell.font = { size: 10, color: { argb: 'FF444444' } };
    }
  });

  // Move Instructions to first position
  wb.removeWorksheet(instrWs.id);
  const instrWs2 = wb.addWorksheet('Instructions', { properties: { tabColor: { argb: 'FFFFD700' } } });
  instrWs2.columns = [{ width: 80 }];
  instructions.forEach((line, i) => {
    const cell = instrWs2.getCell(i + 1, 1);
    cell.value = line;
    if (i === 0) cell.font = { bold: true, size: 14 };
    else if (line.endsWith(':')) cell.font = { bold: true, size: 11 };
    else cell.font = { size: 10, color: { argb: 'FF444444' } };
  });

  const outPath = path.join(__dirname, 'operator-import-template.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log('Template written to', outPath);
}

generate().catch(console.error);
