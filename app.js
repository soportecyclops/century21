/* app.js — Cyclops CRM (Versión D) */

/* ===== CONFIG (REEMPLAZAR si querés variables externas) ===== */
const SUPABASE_URL = "https://kliecdqosksoilbwgbxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsaWVjZHFvc2tzb2lsYndnYnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjE3NjIsImV4cCI6MjA4MDIzNzc2Mn0.kLcGwhxDxCFw1865dvKuG7jUulWMd3WJI1de5W2kEOE";
/* ============================================================ */

/* supabase client (UMD global 'supabase' provided by CDN) */
const supabase = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabase) {
  console.error('Supabase client no disponible. Verifica que el CDN esté cargado antes de app.js');
}

/* HELPERS */
const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));
const exists = (el) => el !== null && el !== undefined;
function debounce(fn, wait = 300){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), wait); }; }
function escapeHtml(s){ if(s==null) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

/* ELEMENTS (guard checks) */
const loginView = qs('#login-view');
const dashboardView = qs('#dashboard-view');

const loginForm = qs('#login-form');
const loginEmail = qs('#login-email');
const loginPassword = qs('#login-password');
const loginFeedback = qs('#login-feedback');

const btnLogout = qs('#btn-logout');
const roleBadge = qs('#role-badge');
const userWelcome = qs('#user-welcome');
const userRoleEl = qs('#user-role');

const btnNew = qs('#btn-new');
const searchInput = qs('#search');
const btnRefresh = qs('#btn-refresh');

const clientList = qs('#client-list');
const formSection = qs('#form-section');
const clientForm = qs('#client-form');
const btnCancel = qs('#btn-cancel');
const btnDelete = qs('#btn-delete');
const formFeedback = qs('#form-feedback');
const formTitle = qs('#form-title');

/* form fields */
const f_id = qs('#client-id');
const f_first_name = qs('#first_name');
const f_last_name  = qs('#last_name');
const f_email = qs('#email');
const f_phone = qs('#phone');
const f_locality = qs('#locality');
const f_district = qs('#district');
const f_status = qs('#status');
const f_notes = qs('#notes');

/* State */
let currentUser = null;
let currentRole = 'user'; // admin | moderador | user

/* AUTH FLOW */
async function checkSession(){
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (data?.session){
    currentUser = data.session.user;
    await loadProfile();
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin(){
  if (loginView) loginView.classList.remove('hidden');
  if (dashboardView) dashboardView.classList.add('hidden');
}

function showDashboard(){
  if (loginView) loginView.classList.add('hidden');
  if (dashboardView) dashboardView.classList.remove('hidden');
  loadClients();
}

/* load profile role */
async function loadProfile(){
  if (!currentUser) return;
  const { data, error } = await supabase.from('profiles').select('role, full_name').eq('id', currentUser.id).single();
  if (error){
    console.warn('No profile found for user', error);
    currentRole = 'user';
    userWelcome.textContent = currentUser?.email ?? 'Usuario';
    userRoleEl.textContent = currentRole;
    roleBadge.textContent = currentRole.toUpperCase();
    return;
  }
  currentRole = data?.role ?? 'user';
  userWelcome.textContent = data?.full_name ?? currentUser.email;
  userRoleEl.textContent = currentRole;
  if (roleBadge) roleBadge.textContent = currentRole.toUpperCase();
}

/* Login handler */
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase) return loginFeedback && (loginFeedback.textContent = 'Supabase no configurado');
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    if(!email || !password) return loginFeedback && (loginFeedback.textContent = 'Completa email y contraseña');

    loginFeedback.textContent = 'Autenticando...';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      loginFeedback.textContent = error.message;
      return;
    }
    loginFeedback.textContent = '';
    // session will be available; re-check
    await checkSession();
  });
}

/* Logout */
if (btnLogout) btnLogout.addEventListener('click', async ()=> {
  if (!supabase) return;
  await supabase.auth.signOut();
  currentUser = null;
  showLogin();
});

/* UI: new / cancel */
if (btnNew) btnNew.addEventListener('click', ()=> openForm());
if (btnCancel) btnCancel.addEventListener('click', closeForm);

/* open form */
function openForm(client=null){
  if (formSection) formSection.classList.remove('hidden');
  if (clientList) clientList.closest('.card') && clientList.closest('.card').classList.add('hidden');
  if (btnDelete) btnDelete.classList.toggle('hidden', !client);
  if (formTitle) formTitle.textContent = client ? 'Editar cliente' : 'Nuevo cliente';
  clientForm && clientForm.reset();
  if (client){
    f_id.value = client.id || '';
    f_first_name.value = client.first_name || '';
    f_last_name.value = client.last_name || '';
    f_email.value = client.email || '';
    f_phone.value = client.phone || '';
    f_locality.value = client.locality || '';
    f_district.value = client.district || '';
    f_status.value = client.status || '';
    f_notes.value = client.notes || '';
  } else {
    f_id.value = '';
  }
}

/* close form */
function closeForm(){
  if (formSection) formSection.classList.add('hidden');
  if (clientList) clientList.closest('.card') && clientList.closest('.card').classList.remove('hidden');
  clientForm && clientForm.reset();
}

/* LOAD CLIENTS */
async function loadClients(){
  if (!supabase) return;
  if (!clientList) return;
  clientList.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';

  const search = (searchInput && searchInput.value) ? searchInput.value.trim() : '';
  let q = supabase.from('clients').select('*').order('created_at', { ascending: false }).limit(1000);

  // role logic: user sees only own, admin/moderador see all
  if (currentRole === 'user' && currentUser){
    q = q.eq('user_id', currentUser.id);
  }

  if (search){
    const esc = search.replace(/%/g,'\\%');
    const orStr = `first_name.ilike.%${esc}%,last_name.ilike.%${esc}%,email.ilike.%${esc}%,phone.ilike.%${esc}%`;
    q = q.or(orStr);
  }

  const { data, error } = await q;
  if (error) {
    clientList.innerHTML = `<tr><td colspan="8">Error: ${escapeHtml(error.message || 'fallo')}</td></tr>`;
    return;
  }
  renderClients(data || []);
}

/* render rows */
function renderClients(rows){
  if (!clientList) return;
  if (!rows || rows.length === 0){
    clientList.innerHTML = `<tr><td colspan="8">No hay registros</td></tr>`;
    return;
  }

  clientList.innerHTML = rows.map(c => {
    const name = `${escapeHtml(c.first_name || '')} ${escapeHtml(c.last_name || '')}`.trim();
    const email = escapeHtml(c.email || '');
    const phone = escapeHtml(c.phone || '');
    const locality = escapeHtml(c.locality || '');
    const district = escapeHtml(c.district || '');
    const status = escapeHtml(c.status || '');
    const notes = escapeHtml(c.notes || '');

    const canDelete = currentRole === 'admin';
    const deleteBtn = canDelete ? `<button class="btn btn-danger" onclick="deleteClient('${c.id}')">Eliminar</button>` : '';

    return `
      <tr>
        <td>${name}</td>
        <td>${email}</td>
        <td>${phone}</td>
        <td>${locality}</td>
        <td>${district}</td>
        <td>${status}</td>
        <td>${notes}</td>
        <td>
          <button class="btn btn-ghost" onclick="editClient('${c.id}')">Editar</button>
          ${deleteBtn}
        </td>
      </tr>
    `;
  }).join('');
}

/* expose edit/delete to window for onclick handlers */
window.editClient = async function(id){
  if (!supabase) return;
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error) {
    console.error('editClient error', error);
    return;
  }
  openForm(data);
};

window.deleteClient = async function(id){
  if (currentRole !== 'admin') return alert('Solo admin puede eliminar');
  if (!confirm('Eliminar este cliente?')) return;
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) return alert('Error: ' + (error.message || 'fallo'));
  loadClients();
};

/* SAVE (insert/update) */
if (clientForm) {
  clientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase) return;

    const payload = {
      user_id: currentUser?.id ?? null,
      first_name: f_first_name.value.trim() || null,
      last_name: f_last_name.value.trim() || null,
      email: f_email.value.trim() || null,
      phone: f_phone.value.trim() || null,
      locality: f_locality.value.trim() || null,
      district: f_district.value.trim() || null,
      status: f_status.value || null,
      notes: f_notes.value || null
    };

    const id = f_id.value;
    let res;
    if (id) {
      res = await supabase.from('clients').update(payload).eq('id', id);
    } else {
      res = await supabase.from('clients').insert(payload);
    }

    if (res.error) {
      formFeedback && (formFeedback.textContent = res.error.message || 'Error guardando');
      return;
    }

    formFeedback && (formFeedback.textContent = 'Guardado correctamente');
    clientForm.reset();
    closeForm();
    loadClients();
  });
}

/* search + refresh */
if (searchInput) {
  searchInput.addEventListener('input', debounce(loadClients, 350));
}
if (btnRefresh) btnRefresh.addEventListener('click', loadClients);

/* new/cancel handlers */
if (btnNew) btnNew.addEventListener('click', ()=> openForm());
if (btnDelete) btnDelete.addEventListener('click', async ()=>{
  const id = f_id.value;
  if (!id) return;
  await window.deleteClient(id);
});

/* auth state change (keeps UI in sync) */
if (supabase && supabase.auth && supabase.auth.onAuthStateChange) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      currentUser = session.user;
      await loadProfileAfterAuth();
    } else {
      currentUser = null;
      showLogin();
    }
  });
}

/* helper to re-load profile quickly */
async function loadProfileAfterAuth(){
  if (!currentUser) return;
  await loadProfile();
  showDashboard();
}

/* INIT */
checkSession();
