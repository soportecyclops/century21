/* app.js — Versión E regenerada (complete, robust, ready)
   - Usa Supabase UMD client (window.supabase)
   - Safe fetches a backend: /api/users/list, /api/users/create, /api/users/update
   - Fallback a /api/create-user and /api/user-email donde tiene sentido
   - NO sobrescribe user_id en update
   - Optimizado para evitar N+1 (admin obtiene emails desde backend)
*/

/* ==========================
   CONFIG - reemplazá si querés
   ========================== */
const SUPABASE_URL = "https://kliecdqosksoilbwgbxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsaWVjZHFvc2tzb2lsYndnYnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjE3NjIsImV4cCI6MjA4MDIzNzc2Mn0.kLcGwhxDxCFw1865dvKuG7jUulWMd3WJI1de5W2kEOE";

/* ==========================
   INIT SUPABASE
   ========================== */
const supabase = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabase) console.error('Supabase client no disponible. Verificá que cargaste el CDN antes de app.js');

/* ==========================
   HELPERS
   ========================== */
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));
const exists = el => el !== null && el !== undefined;
const debounce = (fn, wait = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };
const escapeHtml = s => s == null ? '' : String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

async function safeJson(res) {
  // Try to parse JSON, but gracefully handle HTML/text error responses
  if (!res) return null;
  const ct = res.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) return await res.json();
    // if text/html, try text and return as error object
    const txt = await res.text();
    // try to extract message if it's JSON inside HTML? fallback:
    return { __raw: txt };
  } catch (e) {
    return { __raw: 'invalid-response' };
  }
}

/* ==========================
   SELECTORS (guard checks)
   ========================== */
const loginView = qs('#login-view');
const dashboardView = qs('#dashboard-view');
const loginForm = qs('#login-form');
const loginEmail = qs('#login-email');
const loginPassword = qs('#login-password');
const loginFeedback = qs('#login-feedback');

const userWelcome = qs('#user-welcome');
const userRoleEl = qs('#user-role');
const roleBadge = qs('#role-badge');
const btnLogout = qs('#btn-logout');

const btnNew = qs('#btn-new');
const searchInput = qs('#search');
const btnRefresh = qs('#btn-refresh');
const btnUsersPanel = qs('#btn-users-panel');

const clientsSection = qs('#clients-section');
const clientList = qs('#client-list');

const formSection = qs('#form-section');
const clientForm = qs('#client-form');
const formFeedback = qs('#form-feedback');
const btnCancel = qs('#btn-cancel');
const btnDelete = qs('#btn-delete');
const formTitle = qs('#form-title');

/* client fields */
const f_id = qs('#client-id');
const f_first_name = qs('#first_name');
const f_last_name = qs('#last_name');
const f_instagram = qs('#instagram');
const f_email = qs('#email');
const f_phone = qs('#phone');
const f_signup_date = qs('#signup_date');
const f_contact_type = qs('#contact_type');
const f_client_type = qs('#client_type');
const f_address = qs('#address');
const f_locality = qs('#locality');
const f_district = qs('#district');
const f_last_contact_date = qs('#last_contact_date');
const f_next_contact_date = qs('#next_contact_date');
const f_status = qs('#status');
const f_origin = qs('#origin');
const f_needs_to_sell = qs('#needs_to_sell');
const f_purchase_budget = qs('#purchase_budget');
const f_search_area = qs('#search_area');
const f_notes = qs('#notes');

/* Users panel elements */
const usersSection = qs('#users-section');
const createUserForm = qs('#create-user-form');
const newUserEmail = qs('#new-user-email');
const newUserPassword = qs('#new-user-password');
const newUserFullname = qs('#new-user-fullname');
const newUserRole = qs('#new-user-role');
const createUserFeedback = qs('#create-user-feedback');
const profilesList = qs('#profiles-list');

/* STATE */
let currentUser = null;
let currentRole = 'user';

/* ==========================
   AUTH / SESSION
   ========================== */
async function checkSession() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    currentUser = data.session.user;
    await loadProfile();
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  if (loginView) loginView.classList.remove('hidden');
  if (dashboardView) dashboardView.classList.add('hidden');
}

function showDashboard() {
  if (loginView) loginView.classList.add('hidden');
  if (dashboardView) dashboardView.classList.remove('hidden');
}

/* load profile role from public.profiles (fallback safe) */
async function loadProfile() {
  if (!currentUser) return;
  // Try to read profiles table for role
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', currentUser.id)
      .maybeSingle();
    if (error) {
      console.warn('loadProfile error:', error);
      currentRole = 'user';
      userWelcome && (userWelcome.textContent = currentUser.email);
      userRoleEl && (userRoleEl.textContent = currentRole);
      roleBadge && (roleBadge.textContent = currentRole.toUpperCase());
      if (btnUsersPanel) btnUsersPanel.classList.add('hidden');
      return;
    }
    const role = data?.role || 'user';
    currentRole = role;
    userWelcome && (userWelcome.textContent = data?.full_name || currentUser.email);
    userRoleEl && (userRoleEl.textContent = currentRole);
    roleBadge && (roleBadge.textContent = currentRole.toUpperCase());
    if (btnUsersPanel) {
      if (currentRole === 'admin') btnUsersPanel.classList.remove('hidden');
      else btnUsersPanel.classList.add('hidden');
    }
  } catch (e) {
    console.error('loadProfile exception', e);
  }
}

/* LOGIN */
if (loginForm) loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!supabase) return loginFeedback && (loginFeedback.textContent = 'Supabase no configurado');
  const email = (loginEmail && loginEmail.value || '').trim();
  const password = (loginPassword && loginPassword.value) || '';
  if (!email || !password) return loginFeedback && (loginFeedback.textContent = 'Completa email y contraseña');
  loginFeedback.textContent = 'Autenticando...';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    loginFeedback.textContent = error.message || 'Error';
    return;
  }
  loginFeedback.textContent = '';
  await checkSession();
});

/* LOGOUT */
if (btnLogout) btnLogout.addEventListener('click', async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
  currentUser = null;
  showLogin();
});

/* ==========================
   CLIENTS: LOAD / RENDER / CRUD
   ========================== */

async function loadClients() {
  if (!supabase || !clientList) return;
  clientList.innerHTML = '<tr><td colspan="20">Cargando...</td></tr>';
  const search = (searchInput && searchInput.value || '').trim();
  let q = supabase.from('clients').select('*').order('created_at', { ascending: false }).limit(1000);

  // role logic: users only their own items
  if (currentRole === 'user' && currentUser) q = q.eq('user_id', currentUser.id);

  if (search) {
    const esc = search.replace(/%/g, '\\%');
    const orStr = `first_name.ilike.%${esc}%,last_name.ilike.%${esc}%,email.ilike.%${esc}%,phone.ilike.%${esc}%`;
    q = q.or(orStr);
  }

  const { data, error } = await q;
  if (error) {
    clientList.innerHTML = `<tr><td colspan="20">Error: ${escapeHtml(error.message || '')}</td></tr>`;
    return;
  }
  renderClients(data || []);
}

function renderClients(rows) {
  if (!clientList) return;
  if (!rows || rows.length === 0) {
    clientList.innerHTML = '<tr><td colspan="20">Sin registros</td></tr>';
    return;
  }

  const html = rows.map(c => {
    return `<tr>
      <td>${escapeHtml(c.first_name||'')}</td>
      <td>${escapeHtml(c.last_name||'')}</td>
      <td>${escapeHtml(c.instagram||'')}</td>
      <td>${escapeHtml(c.email||'')}</td>
      <td>${escapeHtml(c.phone||'')}</td>
      <td>${escapeHtml(c.signup_date||'')}</td>
      <td>${escapeHtml(c.contact_type||'')}</td>
      <td>${escapeHtml(c.client_type||'')}</td>
      <td>${escapeHtml(c.address||'')}</td>
      <td>${escapeHtml(c.locality||'')}</td>
      <td>${escapeHtml(c.district||'')}</td>
      <td>${escapeHtml(c.last_contact_date||'')}</td>
      <td>${escapeHtml(c.next_contact_date||'')}</td>
      <td>${escapeHtml(c.status||'')}</td>
      <td>${escapeHtml(c.origin||'')}</td>
      <td>${c.needs_to_sell ? 'Sí' : 'No'}</td>
      <td>${escapeHtml(c.purchase_budget||'')}</td>
      <td>${escapeHtml(c.search_area||'')}</td>
      <td>${escapeHtml(c.notes||'')}</td>
      <td>
        <button class="btn btn-ghost" onclick="editClient('${c.id}')">Editar</button>
        ${currentRole === 'admin' ? `<button class="btn btn-danger" onclick="deleteClient('${c.id}')">Eliminar</button>` : ''}
      </td>
    </tr>`;
  }).join('');

  clientList.innerHTML = html;
}

/* open form (load client into inputs) */
function openForm(client = null) {
  if (formSection) formSection.classList.remove('hidden');
  if (clientsSection) clientsSection.classList.add('hidden');
  if (btnDelete) btnDelete.classList.toggle('hidden', !client);
  if (formTitle) formTitle.textContent = client ? 'Editar cliente' : 'Nuevo cliente';
  clientForm && clientForm.reset();
  if (client) {
    f_id && (f_id.value = client.id || '');
    f_first_name && (f_first_name.value = client.first_name || '');
    f_last_name && (f_last_name.value = client.last_name || '');
    f_instagram && (f_instagram.value = client.instagram || '');
    f_email && (f_email.value = client.email || '');
    f_phone && (f_phone.value = client.phone || '');
    f_signup_date && (f_signup_date.value = client.signup_date ? client.signup_date.split('T')[0] : '');
    f_contact_type && (f_contact_type.value = client.contact_type || '');
    f_client_type && (f_client_type.value = client.client_type || '');
    f_address && (f_address.value = client.address || '');
    f_locality && (f_locality.value = client.locality || '');
    f_district && (f_district.value = client.district || '');
    f_last_contact_date && (f_last_contact_date.value = client.last_contact_date ? client.last_contact_date.split('T')[0] : '');
    f_next_contact_date && (f_next_contact_date.value = client.next_contact_date ? client.next_contact_date.split('T')[0] : '');
    f_status && (f_status.value = client.status || '');
    f_origin && (f_origin.value = client.origin || '');
    f_needs_to_sell && (f_needs_to_sell.value = client.needs_to_sell ? 'true' : 'false');
    f_purchase_budget && (f_purchase_budget.value = client.purchase_budget || '');
    f_search_area && (f_search_area.value = client.search_area || '');
    f_notes && (f_notes.value = client.notes || '');
  } else {
    f_id && (f_id.value = '');
  }
}

function closeForm() {
  if (formSection) formSection.classList.add('hidden');
  if (clientsSection) clientsSection.classList.remove('hidden');
  clientForm && clientForm.reset();
}

/* edit/delete exposed (window) */
window.editClient = async function (id) {
  if (!supabase) return alert('Supabase no configurado');
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
  if (error || !data) return alert('Error cargando cliente');
  openForm(data);
};

window.deleteClient = async function (id) {
  if (currentRole !== 'admin') return alert('Solo admin puede eliminar');
  if (!confirm('Eliminar este cliente?')) return;
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) return alert(error.message || 'Error al eliminar');
  await loadClients();
};

/* save client (insert or update) */
if (clientForm) clientForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!supabase) return;
  // build payload — do NOT include user_id on update
  const payload = {
    first_name: (f_first_name && f_first_name.value.trim()) || null,
    last_name: (f_last_name && f_last_name.value.trim()) || null,
    instagram: (f_instagram && f_instagram.value.trim()) || null,
    phone: (f_phone && f_phone.value.trim()) || null,
    email: (f_email && f_email.value.trim()) || null,
    signup_date: (f_signup_date && f_signup_date.value) || null,
    contact_type: (f_contact_type && f_contact_type.value.trim()) || null,
    client_type: (f_client_type && f_client_type.value.trim()) || null,
    address: (f_address && f_address.value.trim()) || null,
    locality: (f_locality && f_locality.value.trim()) || null,
    district: (f_district && f_district.value.trim()) || null,
    last_contact_date: (f_last_contact_date && f_last_contact_date.value) || null,
    next_contact_date: (f_next_contact_date && f_next_contact_date.value) || null,
    status: (f_status && f_status.value.trim()) || null,
    origin: (f_origin && f_origin.value.trim()) || null,
    needs_to_sell: (f_needs_to_sell && f_needs_to_sell.value === 'true') || false,
    purchase_budget: (f_purchase_budget && f_purchase_budget.value) ? Number(f_purchase_budget.value) : null,
    search_area: (f_search_area && f_search_area.value.trim()) || null,
    notes: (f_notes && f_notes.value.trim()) || null
  };

  const id = (f_id && f_id.value) || '';

  try {
    let res;
    if (id) {
      // update: do NOT change user_id
      res = await supabase.from('clients').update(payload).eq('id', id);
    } else {
      // insert: include user_id (currentUser may be null for admin-created records)
      payload.user_id = currentUser?.id ?? null;
      res = await supabase.from('clients').insert(payload);
    }

    if (res.error) {
      formFeedback && (formFeedback.textContent = res.error.message || 'Error guardando');
      return;
    }

    formFeedback && (formFeedback.textContent = 'Guardado correctamente');
    clientForm.reset();
    closeForm();
    await loadClients();
  } catch (err) {
    console.error('save client error', err);
    formFeedback && (formFeedback.textContent = 'Error guardando');
  }
});

/* UI hooks */
if (btnNew) btnNew.addEventListener('click', () => openForm());
if (btnCancel) btnCancel.addEventListener('click', closeForm);
if (searchInput) searchInput.addEventListener('input', debounce(loadClients, 350));
if (btnRefresh) btnRefresh.addEventListener('click', loadClients);

/* ==========================
   USERS PANEL: load profiles / create / update role
   - Admin-only create & update use secure backend endpoints
   - Frontend uses /api/users/* when available
   - Fallbacks: /api/create-user and /api/user-email (older)
   ========================== */

if (btnUsersPanel) btnUsersPanel.addEventListener('click', async () => {
  if (usersSection) usersSection.classList.remove('hidden');
  if (clientsSection) clientsSection.classList.add('hidden');
  if (formSection) formSection.classList.add('hidden');
  await loadProfiles(); // loads profiles and emails efficiently
});

async function loadProfiles() {
  if (!profilesList) return;
  profilesList.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

  // If admin, try to fetch full user list (with email) from backend /api/users/list
  if (currentRole === 'admin') {
    try {
      const token = await getSessionAccessToken();
      // try primary endpoint
      let res = await fetch('/api/users/list', {
        method: 'GET',
        headers: token ? { Authorization: 'Bearer ' + token } : {}
      });
      if (res.status === 404 || res.status === 405) {
        // fallback to older endpoint name
        res = await fetch('/api/list-users', {
          method: 'GET',
          headers: token ? { Authorization: 'Bearer ' + token } : {}
        });
      }

      if (res.ok) {
        const json = await safeJson(res);
        const users = json?.users || json || [];
        // render users (users array should contain { id, email, full_name, role, created_at? })
        profilesList.innerHTML = users.map(u => {
          return `<tr>
            <td>${escapeHtml(u.full_name || '')}</td>
            <td>${escapeHtml(u.role || '')}</td>
            <td>${escapeHtml(u.created_at || '')}</td>
            <td>${escapeHtml(u.email || '')}</td>
            <td>
              <button class="btn btn-ghost" onclick="openEditProfileModal('${u.id}', '${escapeHtml(u.full_name || '')}', '${escapeHtml(u.role || '')}')">Editar</button>
            </td>
          </tr>`;
        }).join('');
        return;
      }
      // if backend call failed, fallback to reading public.profiles and then fetching emails per-profile
    } catch (err) {
      console.warn('loadProfiles backend error', err);
    }
  }

  // Non-admin or backend not available: read public.profiles via Supabase anon key
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('full_name', { ascending: true }).limit(1000);
    if (error) {
      profilesList.innerHTML = `<tr><td colspan="5">Error cargando profiles: ${escapeHtml(error.message || '')}</td></tr>`;
      return;
    }
    // To avoid N+1: try to fetch emails via single batch endpoint if available
    const profiles = data || [];
    // Try batch email fetch if backend supports /api/users/list with no auth (unlikely)
    let emailsMap = {};
    if (currentRole === 'admin') {
      try {
        const token = await getSessionAccessToken();
        const r = await fetch('/api/users/list', { method: 'GET', headers: token ? { Authorization: 'Bearer ' + token } : {} });
        if (r.ok) {
          const j = await safeJson(r);
          for (const u of (j.users || [])) emailsMap[u.id] = u.email;
        }
      } catch (e) { /* ignore */ }
    }
    // render
    profilesList.innerHTML = profiles.map(p => {
      const email = emailsMap[p.id] || '';
      return `<tr>
        <td>${escapeHtml(p.full_name || '')}</td>
        <td>${escapeHtml(p.role || '')}</td>
        <td>${escapeHtml(p.created_at || '')}</td>
        <td>${escapeHtml(email || '')}</td>
        <td>
          ${currentRole === 'admin' ? `<button class="btn btn-ghost" onclick="openEditProfileModal('${p.id}', '${escapeHtml(p.full_name||'')}', '${escapeHtml(p.role||'')}')">Editar</button>` : ''}
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    profilesList.innerHTML = `<tr><td colspan="5">Error inesperado</td></tr>`;
    console.error(err);
  }
}

/* Create user flow: call backend secure endpoint
   Primary: POST /api/users/create (expects Authorization Bearer token of admin)
   Fallback: POST /api/create-user (older example)
*/
if (createUserForm) createUserForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!newUserEmail || !newUserPassword) return;
  createUserFeedback && (createUserFeedback.textContent = 'Creando usuario...');
  const payload = {
    email: (newUserEmail.value || '').trim(),
    password: newUserPassword.value || '',
    full_name: (newUserFullname.value || '').trim(),
    role: (newUserRole.value || 'user')
  };
  if (!payload.email || !payload.password) {
    createUserFeedback && (createUserFeedback.textContent = 'Email y password requeridos');
    return;
  }

  // get token for admin auth header if present
  const token = await getSessionAccessToken();

  // attempt primary endpoint
  try {
    let res = await fetch('/api/users/create', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
      body: JSON.stringify(payload)
    });

    if (res.status === 404 || res.status === 405) {
      // try older fallback
      res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const json = await safeJson(res);
    if (!res.ok) {
      createUserFeedback && (createUserFeedback.textContent = (json && (json.error || json.message)) || `Error creando usuario (${res.status})`);
      console.warn('create user fail', json);
      return;
    }

    createUserFeedback && (createUserFeedback.textContent = 'Usuario creado correctamente');
    // reset form
    newUserEmail.value = ''; newUserPassword.value = ''; newUserFullname.value = ''; newUserRole.value = 'user';
    // reload profiles
    await loadProfiles();
  } catch (err) {
    createUserFeedback && (createUserFeedback.textContent = 'Error de conexión');
    console.error('create user exception', err);
  }
});

/* Utility: extract access token from supabase session for backend auth header */
async function getSessionAccessToken() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch (e) {
    return null;
  }
}

/* Edit profile modal (simple prompt UX) - admin only
   Calls /api/users/update (PATCH) with { id, full_name, role }
   Fallback attempts no-auth if server expects otherwise
*/
window.openEditProfileModal = async function (id, currentFullName = '', currentRoleVal = '') {
  if (currentRole !== 'admin') return alert('Solo admin puede editar usuarios');
  const newName = prompt('Nombre completo:', currentFullName) || currentFullName;
  const newRole = prompt('Rol (admin / moderador / user):', currentRoleVal) || currentRoleVal;
  if (!newRole) return;

  // build payload
  const payload = { id, full_name: newName, role: newRole };

  const token = await getSessionAccessToken();
  try {
    let res = await fetch('/api/users/update', {
      method: 'PATCH',
      headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
      body: JSON.stringify(payload)
    });

    if (res.status === 404 || res.status === 405) {
      // try fallback path if server uses another file structure
      res = await fetch('/api/update-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const json = await safeJson(res);
    if (!res.ok) {
      alert('Error actualizando usuario: ' + ((json && (json.error || json.message)) || res.status));
      console.warn('update user failed', json);
      return;
    }
    alert('Usuario actualizado correctamente');
    await loadProfiles();
  } catch (err) {
    console.error('update user exception', err);
    alert('Error de conexión');
  }
};

/* fetch user email (legacy single fetch) - kept for backwards compatibility
   Preferred flow: admin calls /api/users/list which returns email fields (handled in loadProfiles)
*/
async function fetchUserEmailFallback(profileId) {
  try {
    // try primary new endpoint
    const token = await getSessionAccessToken();
    let res = await fetch(`/api/users/email?id=${profileId}`, { method: 'GET', headers: token ? { Authorization: 'Bearer ' + token } : {} });
    if (res.status === 404) {
      // try older path
      res = await fetch(`/api/user-email?id=${profileId}`, { method: 'GET' });
    }
    if (!res.ok) return '';
    const json = await safeJson(res);
    return json?.email || '';
  } catch (e) {
    return '';
  }
}

/* expose editProfile for legacy buttons (no-op with message) */
window.editProfile = function (id) {
  if (currentRole !== 'admin') return alert('Solo admin puede editar perfiles');
  // open prompting editor
  openEditProfileModal(id, '', '');
};

/* ==========================
   Auth state listener & init
   ========================== */
if (supabase && supabase.auth && supabase.auth.onAuthStateChange) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      currentUser = session.user;
      loadProfile().then(() => checkShowUI());
      showDashboard();
    } else {
      currentUser = null;
      showLogin();
    }
  });
}

function checkShowUI() {
  // ensure UI elements are consistent
  if (currentRole === 'admin' && btnUsersPanel) btnUsersPanel.classList.remove('hidden');
  else if (btnUsersPanel) btnUsersPanel.classList.add('hidden');
}

/* INIT */
checkSession();

/* expose loadClients for console testing */
window._loadClients = loadClients;
