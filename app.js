let history = [];
let entries = [];

const SYSTEM = "You are a clinical decision support assistant for junior clinicians and nurses. " +
  "A user will describe a patient in free text, possibly incomplete. Your job: " +
  "1) Interpret the vitals and clinical picture given, reasoning like a NEWS2-style early warning approach (respiratory rate, SpO2, oxygen use, systolic BP, heart rate, temperature, consciousness). " +
  "2) If key parameters are missing, ask brief, specific follow-up questions before giving a firm risk read, but you may give a provisional read if enough is present. " +
  "3) Always state clearly this does not replace clinical judgment and to escalate per local protocol when risk is high. " +
  "4) Keep responses short, direct, plain language, no markdown headers. " +
  "5) When you have enough information to give a risk assessment, call the log_entry tool once with a one-line summary and risk level (low, med, or high), so it is recorded. Only call it when you actually give an assessment, not on a pure clarifying-question turn.";

const TOOLS = [{
  name: 'log_entry',
  description: 'Log a completed risk assessment to the shift log.',
  input_schema: { type: 'object', properties: {
    summary: { type: 'string', description: 'One line summary of patient and key vitals' },
    risk: { type: 'string', enum: ['low', 'med', 'high'] }
  }, required: ['summary', 'risk'] }
}];

window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('vitalcheck_api_key');
  if (saved) document.getElementById('apiKey').value = saved;
  document.getElementById('apiKey').addEventListener('change', (e) => {
    localStorage.setItem('vitalcheck_api_key', e.target.value.trim());
  });
  document.getElementById('sendBtn').addEventListener('click', send);
  document.getElementById('input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });
});

function addMsg(who, text) {
  const chat = document.getElementById('chat');
  const div = document.createElement('div');
  div.className = 'msg ' + who;
  div.innerHTML = '<div class="who">' + (who === 'user' ? 'You' : 'Agent') + '</div>' + escapeHtml(text);
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderEntries() {
  const el = document.getElementById('entries');
  if (entries.length === 0) {
    el.innerHTML = '<div class="empty">No logged assessments yet.</div>';
    return;
  }
  el.innerHTML = entries.map(e =>
    '<div class="entry"><div>' + escapeHtml(e.summary) + '</div><span class="badge risk-' + e.risk + '">' + e.risk + '</span></div>'
  ).join('');
}

async function callClaude(apiKey, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SYSTEM,
      messages: messages,
      tools: TOOLS
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('API error ' + res.status + ': ' + t.slice(0, 200));
  }
  return res.json();
}

async function send() {
  const input = document.getElementById('input');
  const err = document.getElementById('err');
  err.textContent = '';
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey) { err.textContent = 'Enter your Anthropic API key above first.'; return; }
  const text = input.value.trim();
  if (!text) { err.textContent = 'Type a description or question first.'; return; }
  input.value = '';
  addMsg('user', text);
  history.push({ role: 'user', content: text });

  const btn = document.getElementById('sendBtn');
  btn.disabled = true;
  const thinkingDiv = addMsg('agent', 'Thinking...');

  try {
    let data = await callClaude(apiKey, history);
    let assistantContent = data.content;

    const toolUse = assistantContent.find(b => b.type === 'tool_use' && b.name === 'log_entry');
    if (toolUse) {
      entries.unshift(toolUse.input);
      renderEntries();
      history.push({ role: 'assistant', content: assistantContent });
      history.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: 'logged' }] });
      data = await callClaude(apiKey, history);
      assistantContent = data.content;
    }

    const textBlock = assistantContent.find(b => b.type === 'text');
    const replyText = textBlock ? textBlock.text : '(no response)';
    thinkingDiv.innerHTML = '<div class="who">Agent</div>' + escapeHtml(replyText);
    history.push({ role: 'assistant', content: assistantContent });
  } catch (e) {
    thinkingDiv.remove();
    err.textContent = e.message || 'Something went wrong reaching the API.';
  }
  btn.disabled = false;
}
