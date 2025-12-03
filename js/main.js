/* js/main.js for fitFAT — Assignment 2
   - Uses localStorage key "fitfat_clients"
   - Add / Edit (via index.html?edit=<id>)
   - Delete
   - Search on clients page
   - View page loads suggested exercises from Wger API
   - Training history stored per-client (array)
*/

/* ---------- Constants ---------- */
const STORAGE_KEY = 'fitfat_clients';

/* ---------- Helpers ---------- */
function loadClients() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed reading clients from localStorage', e);
    return [];
  }
}

function saveClients(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function genId() {
  return 'c' + Date.now() + Math.floor(Math.random() * 999);
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[&<>"']/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]);
  });
}

/* ---------- Initialization ---------- */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('client-form')) initFormPage();
  if (document.getElementById('clients-wrapper')) initClientsPage();
  if (document.getElementById('client-details')) initViewPage();
});

/* ---------- Form page: add / edit ---------- */
function initFormPage() {
  const form = document.getElementById('client-form');
  const submitBtn = document.getElementById('submit-btn');
  const cancelEditBtn = document.getElementById('cancel-edit');

  // Check for edit query param
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');
  if (editId) {
    populateFormForEdit(editId);
    document.getElementById('form-title').textContent = 'Edit Client';
    submitBtn.textContent = 'Save Changes';
    cancelEditBtn.style.display = 'inline-block';
  }

  // cancel edit: go back to Add mode
  cancelEditBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleFormSubmit(editId);
  });
}

function populateFormForEdit(id) {
  const clients = loadClients();
  const client = clients.find(c => c.id === id);
  if (!client) return;
  document.getElementById('name').value = client.name || '';
  document.getElementById('age').value = client.age || '';
  document.getElementById('gender').value = client.gender || '';
  document.getElementById('email').value = client.email || '';
  document.getElementById('phone').value = client.phone || '';
  document.getElementById('goal').value = client.goal || '';
  document.getElementById('start-date').value = client.startDate || '';
  document.getElementById('history').value = (client.history && client.history.join('\n\n')) || '';
}

function validateForm() {
  // clear errors
  document.querySelectorAll('.error').forEach(el => el.textContent = '');

  const name = document.getElementById('name').value.trim();
  const age = document.getElementById('age').value.trim();
  const gender = document.getElementById('gender').value;
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const goal = document.getElementById('goal').value;
  const startDate = document.getElementById('start-date').value;
  const historyText = document.getElementById('history').value.trim();

  let ok = true;
  if (!name) { setError('name', 'Name is required'); ok = false; }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) { setError('email', 'Valid email required'); ok = false; }
  if (!phone) { setError('phone', 'Phone is required'); ok = false; }
  if (phone && !/^[0-9]{4}-[0-9]{3}-[0-9]{2}-[0-9]{2}$/.test(phone)) {
    setError('phone', 'Phone must match xxxx-xxx-xx-01 (digits only)');
    ok = false;
  }
  if (!goal) { setError('goal', 'Please choose a fitness goal'); ok = false; }
  if (!startDate) { setError('start-date', 'Start date required'); ok = false; }

  return { ok, data: { name, age, gender, email, phone, goal, startDate, historyText } };
}

function setError(field, msg) {
  const el = document.querySelector(`.error[data-for="${field}"]`);
  if (el) el.textContent = msg;
}

function handleFormSubmit(editId) {
  const { ok, data } = validateForm();
  if (!ok) return;

  let clients = loadClients();

  if (editId) {
    // update existing
    const idx = clients.findIndex(c => c.id === editId);
    if (idx === -1) {
      alert('Client not found.');
      return;
    }
    clients[idx] = {
      ...clients[idx],
      name: data.name,
      age: data.age,
      gender: data.gender,
      email: data.email,
      phone: data.phone,
      goal: data.goal,
      startDate: data.startDate,
      history: mergeHistory(clients[idx].history || [], data.historyText)
    };
    saveClients(clients);
    window.location.href = 'clients.html';
  } else {
    // add new
    const newId = genId();
    const client = {
      id: newId,
      name: data.name,
      age: data.age,
      gender: data.gender,
      email: data.email,
      phone: data.phone,
      goal: data.goal,
      startDate: data.startDate,
      history: data.historyText ? [formatHistoryEntry(data.historyText)] : []
    };
    clients.push(client);
    saveClients(clients);
    window.location.href = 'clients.html';
  }
}

function mergeHistory(existing, newText) {
  const arr = Array.isArray(existing) ? existing.slice() : [];
  if (newText && newText.trim()) arr.unshift(formatHistoryEntry(newText));
  return arr;
}

function formatHistoryEntry(text) {
  const now = new Date();
  return `${now.toLocaleDateString()} - ${text.trim()}`;
}

/* ---------- Clients page ---------- */
function initClientsPage() {
  renderClients();

  // guards
  const search = document.getElementById('search');
  const clearBtn = document.getElementById('clear-search');
  const seedBtn = document.getElementById('seed-btn');

  search && search.addEventListener('input', () => renderClients(search.value.trim()));
  clearBtn && clearBtn.addEventListener('click', () => { if (search) search.value = ''; renderClients(); });
  seedBtn && seedBtn.addEventListener('click', seedSampleClients);
}

function renderClients(query = '') {
  const wrapper = document.getElementById('clients-wrapper');
  const clients = loadClients();
  const filtered = query ? clients.filter(c => (
    (c.name || '').toLowerCase().includes(query.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(query.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(query.toLowerCase()) ||
    (c.goal || '').toLowerCase().includes(query.toLowerCase())
  )) : clients;

  if (!filtered.length) {
    wrapper.innerHTML = `<div class="card"><p class="muted">No clients found. Add one from the Add Client page or click "Seed Sample" to add sample data.</p></div>`;
    return;
  }

  let html = `<table><thead><tr>
    <th>Name</th><th>Email</th><th>Phone</th><th>Goal</th><th>Start Date</th><th>Actions</th>
  </tr></thead><tbody>`;

  filtered.forEach(c => {
    html += `<tr>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.email)}</td>
      <td>${escapeHtml(c.phone)}</td>
      <td>${escapeHtml(c.goal)}</td>
      <td>${escapeHtml(c.startDate)}</td>
      <td class="actions">
        <button class="btn small" data-action="view" data-id="${c.id}">View</button>
        <button class="btn small" data-action="edit" data-id="${c.id}">Edit</button>
        <button class="btn small" data-action="delete" data-id="${c.id}">Delete</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  wrapper.innerHTML = html;

  // add listeners
  wrapper.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const action = e.currentTarget.dataset.action;
      handleClientAction(action, id);
    });
  });
}

function handleClientAction(action, id) {
  if (action === 'view') {
    window.location.href = `view.html?id=${encodeURIComponent(id)}`;
    return;
  }
  if (action === 'edit') {
    // redirect to index with query param for editing
    window.location.href = `index.html?edit=${encodeURIComponent(id)}`;
    return;
  }
  if (action === 'delete') {
    if (!confirm('Delete this client? This cannot be undone.')) return;
    let clients = loadClients();
    clients = clients.filter(c => c.id !== id);
    saveClients(clients);
    renderClients(document.getElementById('search')?.value || '');
  }
}

/* ---------- View page ---------- */
function initViewPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    document.getElementById('client-details').innerHTML = '<p class="muted">No client specified.</p>';
    return;
  }
  renderViewPage(id);

  const historyForm = document.getElementById('history-form');
  historyForm && historyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = document.getElementById('history-text').value.trim();
    if (!text) return;
    addHistoryEntry(id, text);
    document.getElementById('history-text').value = '';
    renderViewPage(id);
  });
}

function renderViewPage(id) {
  const clients = loadClients();
  const client = clients.find(c => c.id === id);
  const detailsEl = document.getElementById('client-details');
  const nameEl = document.getElementById('client-name');
  const historyEl = document.getElementById('history-list');
  const exerciseEl = document.getElementById('exercise-list');

  if (!client) {
    detailsEl.innerHTML = '<p class="muted">Client not found.</p>';
    nameEl.textContent = 'Client Details';
    return;
  }

  nameEl.textContent = client.name;

  detailsEl.innerHTML = `
    <p><strong>Email:</strong> ${escapeHtml(client.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(client.phone)}</p>
    <p><strong>Age:</strong> ${escapeHtml(client.age)}</p>
    <p><strong>Gender:</strong> ${escapeHtml(client.gender)}</p>
    <p><strong>Goal:</strong> ${escapeHtml(client.goal)}</p>
    <p><strong>Membership Start:</strong> ${escapeHtml(client.startDate)}</p>
  `;

  // history
  historyEl.innerHTML = '';
  (client.history || []).forEach(h => {
    const li = document.createElement('li');
    li.textContent = h;
    historyEl.appendChild(li);
  });

  // fetch suggested exercises
  exerciseEl.textContent = 'Loading exercises...';
  fetchExercisesForGoal(client.goal)
    .then(list => {
      if (!list || !list.length) {
        exerciseEl.innerHTML = '<p class="muted">No exercises available.</p>';
        return;
      }
      const ul = document.createElement('ul');
      list.forEach(ex => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${escapeHtml(ex.name)}</strong>${ex.description ? ' — ' + stripHtml(ex.description).slice(0,140) + '...' : ''}`;
        ul.appendChild(li);
      });
      exerciseEl.innerHTML = '';
      exerciseEl.appendChild(ul);
    })
    .catch(err => {
      console.error(err);
      exerciseEl.innerHTML = '<p class="muted">Failed to load exercises (CORS or network).</p>';
    });
}

function addHistoryEntry(id, text) {
  const clients = loadClients();
  const idx = clients.findIndex(c => c.id === id);
  if (idx === -1) return;
  const entry = `${new Date().toLocaleDateString()} - ${text}`;
  clients[idx].history = clients[idx].history || [];
  clients[idx].history.unshift(entry);
  saveClients(clients);
}

/* ---------- Wger API fetch (public) ---------- */
async function fetchExercisesForGoal(goal) {
  // We get a bunch of exercises and pick five that roughly match the goal keyword.
  const endpoint = 'https://wger.de/api/v2/exercise/?language=2&limit=200';
  const resp = await fetch(endpoint);
  if (!resp.ok) throw new Error('Wger API error');
  const data = await resp.json();
  const all = (data.results || []).filter(e => e.name);
  if (!all.length) return [];

  // map goals -> keywords
  const mapping = {
    'Weight Loss': ['cardio', 'running', 'aerobic', 'circuit'],
    'Muscle Gain': ['strength', 'bench', 'squat', 'dumbbell', 'barbell', 'press', 'deadlift'],
    'Flexibility': ['stretch', 'yoga', 'flexibility'],
    'Endurance': ['endurance', 'cardio', 'running', 'cycling'],
    'General Fitness': ['bodyweight','push','pull','squat','lunge']
  };

  const keys = mapping[goal] || mapping['General Fitness'];

  // score exercises by presence of keywords in name/description
  const scored = all.map(e => {
    const text = (e.name + ' ' + (e.description || '')).toLowerCase();
    const score = keys.reduce((s,k) => s + (text.includes(k) ? 1 : 0), 0);
    return { ex: e, score };
  }).filter(x => true);

  scored.sort((a,b) => b.score - a.score);

  // pick top N with score > 0; otherwise random five
  const chosen = scored.filter(s => s.score > 0).slice(0,5).map(s => s.ex);
  if (chosen.length >= 5) return chosen;
  // fallback: pick random unique
  const out = [];
  const used = new Set();
  while (out.length < 5 && used.size < all.length) {
    const idx = Math.floor(Math.random() * all.length);
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(all[idx]);
  }
  return out;
}

/* ---------- Utility helpers ---------- */
function stripHtml(html) {
  return html ? html.replace(/<[^>]*>?/gm, '') : '';
}

/* ---------- Seed sample clients (helpful for demonstration / grading) ---------- */
function seedSampleClients() {
  const existing = loadClients();
  if (existing.length) {
    if (!confirm('There are existing clients — overwrite with sample data?')) return;
  }
  const samples = [
    { id: genId(), name: 'Mike Morgan', email: 'mickymouse@test.com', phone: '8888-555-77-01', goal: 'Weight Loss', startDate: '2025-02-15', age: '29', gender: 'Male', history: ['2025-02-15 - Existing client added (sample)'] },
    { id: genId(), name: 'Tyson Oplak', email: 'tys.op@test.com', phone: '8888-555-77-02', goal: 'Muscle Gain', startDate: '2025-03-10', age: '34', gender: 'Male', history: ['2025-03-10 - Sample entry'] },
    { id: genId(), name: 'Mordecai Bird', email: 'morebird@test.com', phone: '8888-555-77-03', goal: 'Endurance', startDate: '2025-01-22', age: '26', gender: 'Male', history: [] },
    { id: genId(), name: 'Rigby Racoon', email: 'rigrac@test.com', phone: '8888-555-77-04', goal: 'General Fitness', startDate: '2025-05-02', age: '22', gender: 'Male', history: [] },
    { id: genId(), name: 'Benson Boss', email: 'bboss@test.com', phone: '8888-555-77-05', goal: 'Weight Loss', startDate: '2024-12-01', age: '41', gender: 'Male', history: [] },
    { id: genId(), name: 'Skips Skips', email: 'yetiman@test.com', phone: '8888-555-77-06', goal: 'Muscle Gain', startDate: '2025-02-05', age: '40', gender: 'Male', history: [] },
    { id: genId(), name: 'Pops Candy', email: 'popsweets@test.com', phone: '8888-555-77-07', goal: 'Flexibility', startDate: '2025-03-30', age: '37', gender: 'Male', history: [] },
    { id: genId(), name: 'William Afton', email: 'purple.guy@test.com', phone: '8888-555-77-08', goal: 'Endurance', startDate: '2025-04-14', age: '50', gender: 'Male', history: [] },
    { id: genId(), name: 'Mohamed Ali', email: 'mhmd.ali@test.com', phone: '8888-555-77-09', goal: 'General Fitness', startDate: '2025-01-08', age: '32', gender: 'Male', history: [] },
    { id: genId(), name: 'Eddie Brock', email: 'venom@test.com', phone: '8888-555-77-10', goal: 'Weight Loss', startDate: '2025-02-25', age: '34', gender: 'Male', history: [] }
  ];
  saveClients(samples);
  alert('Sample clients seeded. You will be redirected to the clients list.');
  window.location.href = 'clients.html';
}
