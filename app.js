/* app.js - Versión E (panel usuarios + full client form) */

/* CONFIG: PONER tus valores o cargarlos desde config.js (no subir a repo) */
const SUPABASE_URL = "https://kliecdqosksoilbwgbxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsaWVjZHFvc2tzb2lsYndnYnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjE3NjIsImV4cCI6MjA4MDIzNzc2Mn0.kLcGwhxDxCFw1865dvKuG7jUulWMd3WJI1de5W2kEOE";

/* Supabase client */
const supabase = window.supabase && window.supabase.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabase) console.error('Supabase client no disponible');

/* Helpers */
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));
const exists = el => el !== null && el !== undefined;
const debounce = (fn, wait=300)=>{let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a), wait)}};
const escapeHtml = s => s==null?'':String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

/* ELEMENTS */
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

let currentUser = null;
let currentRole = 'user';

/* AUTH / SESSION */
async function checkSession(){
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (data?.session){
    currentUser = data.session.user;
    await loadProfile();
    showDashboard();
  } else showLogin();
}

function showLogin(){ if (loginView) loginView.classList.remove('hidden'); if (dashboardView) dashboardView.classList.add('hidden'); }
function showDashboard(){ if (loginView) loginView.classList.add('hidden'); if (dashboardView) dashboardView.classList.remove('hidden'); }

/* load profile role */
async function loadProfile(){
  if (!currentUser) return;
  const { data, error } = await supabase.from('profiles').select('role, full_name').eq('id', currentUser.id).single();
  if (error || !data){
    currentRole = 'user';
    userWelcome.textContent = currentUser.email;
    userRoleEl.textContent = currentRole;
    roleBadge.textContent = currentRole.toUpperCase();
    btnUsersPanel.classList.add('hidden');
    return;
  }
  currentRole = data.role || 'user';
  userWelcome.textContent = data.full_name || currentUser.email;
  userRoleEl.textContent = currentRole;
  roleBadge.textContent = currentRole.toUpperCase();
  // show users panel button only for admin
  if (currentRole === 'admin') btnUsersPanel.classList.remove('hidden');
  else btnUsersPanel.classList.add('hidden');
}

/* LOGIN */
if (loginForm) loginForm.addEventListener('submit', async e=>{
  e.preventDefault();
  if (!supabase) return;
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  if (!email || !password) return loginFeedback.textContent = 'Completa email y contraseña';
  loginFeedback.textContent = 'Autenticando...';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { loginFeedback.textContent = error.message; return; }
  loginFeedback.textContent = '';
  await checkSession();
});

/* LOGOUT */
if (btnLogout) btnLogout.addEventListener('click', async ()=> {
  if (!supabase) return;
  await supabase.auth.signOut();
  currentUser = null;
  showLogin();
});

/* CLIENTS: load, render, create/update/delete */
async function loadClients(){
  if (!supabase || !clientList) return;
  clientList.innerHTML = '<tr><td colspan="20">Cargando...</td></tr>';
  const search = searchInput?.value?.trim() || '';
  let query = supabase.from('clients').select('*').order('created_at', { ascending:false }).limit(1000);

  if (currentRole === 'user' && currentUser) query = query.eq('user_id', currentUser.id);

  if (search){
    const esc = search.replace(/%/g,'\\%');
    const orStr = `first_name.ilike.%${esc}%,last_name.ilike.%${esc}%,email.ilike.%${esc}%,phone.ilike.%${esc}%`;
    query = query.or(orStr);
  }

  const { data, error } = await query;
  if (error) {
    clientList.innerHTML = `<tr><td colspan="20">Error: ${escapeHtml(error.message || '')}</td></tr>`;
    return;
  }
  renderClients(data || []);
}

function renderClients(rows){
  if (!clientList) return;
  if (!rows || rows.length === 0) { clientList.innerHTML = '<tr><td colspan="20">Sin registros</td></tr>'; return; }
  clientList.innerHTML = rows.map(c => {
    const name = `${escapeHtml(c.first_name||'')} ${escapeHtml(c.last_name||'')}`.trim();
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
      <td>${c.needs_to_sell? 'Sí':'No'}</td>
      <td>${escapeHtml(c.purchase_budget||'')}</td>
      <td>${escapeHtml(c.search_area||'')}</td>
      <td>${escapeHtml(c.notes||'')}</td>
      <td>
        <button class="btn btn-ghost" onclick="editClient('${c.id}')">Editar</button>
        ${currentRole === 'admin' ? `<button class="btn btn-danger" onclick="deleteClient('${c.id}')">Eliminar</button>`: ''}
      </td>
    </tr>`;
  }).join('');
}

/* open form */
function openForm(client=null){
  if (formSection) formSection.classList.remove('hidden');
  if (clientsSection) clientsSection.classList.add('hidden');
  if (btnDelete) btnDelete.classList.toggle('hidden', !client);
  formTitle.textContent = client ? 'Editar cliente' : 'Nuevo cliente';
  clientForm.reset();
  if (client){
    f_id.value = client.id || '';
    f_first_name.value = client.first_name || '';
    f_last_name.value = client.last_name || '';
    f_instagram.value = client.instagram || '';
    f_email.value = client.email || '';
    f_phone.value = client.phone || '';
    f_signup_date.value = client.signup_date ? client.signup_date.split('T')[0] : '';
    f_contact_type.value = client.contact_type || '';
    f_client_type.value = client.client_type || '';
    f_address.value = client.address || '';
    f_locality.value = client.locality || '';
    f_district.value = client.district || '';
    f_last_contact_date.value = client.last_contact_date ? client.last_contact_date.split('T')[0] : '';
    f_next_contact_date.value = client.next_contact_date ? client.next_contact_date.split('T')[0] : '';
    f_status.value = client.status || '';
    f_origin.value = client.origin || '';
    f_needs_to_sell.value = client.needs_to_sell ? 'true' : 'false';
    f_purchase_budget.value = client.purchase_budget || '';
    f_search_area.value = client.search_area || '';
    f_notes.value = client.notes || '';
  } else {
    f_id.value = '';
  }
}

function closeForm(){
  if (formSection) formSection.classList.add('hidden');
  if (clientsSection) clientsSection.classList.remove('hidden');
  clientForm.reset();
}

/* edit/delete exposed */
window.editClient = async function(id){
  if (!supabase) return;
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error) return alert('Error cargando cliente');
  openForm(data);
};

window.deleteClient = async function(id){
  if (currentRole !== 'admin') return alert('Solo admin puede eliminar');
  if (!confirm('Eliminar este cliente?')) return;
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) return alert(error.message || 'Error al eliminar');
  loadClients();
};

/* save client */
if (clientForm) clientForm.addEventListener('submit', async e=>{
  e.preventDefault();
  if (!supabase) return;
  const payload = {
    user_id: currentUser?.id ?? null,
    first_name: f_first_name.value || null,
    last_name: f_last_name.value || null,
    instagram: f_instagram.value || null,
    phone: f_phone.value || null,
    email: f_email.value || null,
    signup_date: f_signup_date.value || null,
    contact_type: f_contact_type.value || null,
    client_type: f_client_type.value || null,
    address: f_address.value || null,
    locality: f_locality.value || null,
    district: f_district.value || null,
    last_contact_date: f_last_contact_date.value || null,
    next_contact_date: f_next_contact_date.value || null,
    status: f_status.value || null,
    origin: f_origin.value || null,
    needs_to_sell: f_needs_to_sell.value === 'true',
    purchase_budget: f_purchase_budget.value ? Number(f_purchase_budget.value) : null,
    search_area: f_search_area.value || null,
    notes: f_notes.value || null
  };

  const id = f_id.value;
  let res;
  if (id) res = await supabase.from('clients').update(payload).eq('id', id);
  else res = await supabase.from('clients').insert(payload);

  if (res.error){ formFeedback.textContent = res.error.message || 'Error'; return; }
  formFeedback.textContent = 'Guardado';
  clientForm.reset();
  closeForm();
  loadClients();
});

/* UI hooks */
if (btnNew) btnNew.addEventListener('click', ()=> openForm());
if (btnCancel) btnCancel.addEventListener('click', closeForm);
if (searchInput) searchInput.addEventListener('input', debounce(loadClients, 350));
if (btnRefresh) btnRefresh.addEventListener('click', loadClients);

/* USERS PANEL: list profiles and create user via backend */
if (btnUsersPanel) btnUsersPanel.addEventListener('click', ()=> {
  usersSection.classList.remove('hidden');
  document.getElementById('clients-section').classList.add('hidden');
  formSection && formSection.classList.add('hidden');
  loadProfiles();
});

/* load profiles (from public.profiles) */
async function loadProfiles(){
  if (!supabase || !profilesList) return;
  profilesList.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
  const { data, error } = await supabase.from('profiles').select('*').order('created_at',{ascending:false}).limit(1000);
  if (error) { profilesList.innerHTML = '<tr><td colspan="5">Error cargando profiles</td></tr>'; return; }
  // For each profile, we optionally fetch email via backend endpoint (since auth.users not accessible by anon key)
  profilesList.innerHTML = '';
  for (const p of data){
    const email = await fetchUserEmail(p.id); // backend call
    profilesList.innerHTML += `
      <tr>
        <td>${escapeHtml(p.full_name||'')}</td>
        <td>${escapeHtml(p.role||'')}</td>
        <td>${escapeHtml(p.created_at||'')}</td>
        <td>${escapeHtml(email||'')}</td>
        <td>
          <!-- actions: later: edit role, disable, reset password -->
          <button class="btn btn-ghost" onclick="editProfile('${p.id}')">Editar</button>
        </td>
      </tr>
    `;
  }
}

/* create user form -> calls backend API (secure) */
if (createUserForm) createUserForm.addEventListener('submit', async e=>{
  e.preventDefault();
  createUserFeedback.textContent = 'Creando usuario...';
  const payload = {
    email: newUserEmail.value.trim(),
    password: newUserPassword.value,
    full_name: newUserFullname.value.trim(),
    role: newUserRole.value
  };
  // Call your backend: /api/create-user
  try {
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      createUserFeedback.textContent = json?.error || 'Error creando usuario';
    } else {
      createUserFeedback.textContent = 'Usuario creado';
      newUserEmail.value = ''; newUserPassword.value=''; newUserFullname.value=''; newUserRole.value='user';
      loadProfiles();
    }
  } catch (err){
    createUserFeedback.textContent = 'Error de conexión';
    console.error(err);
  }
});

/* fetch user email via backend (server must query auth.users with service_role) */
async function fetchUserEmail(profileId){
  try {
    const res = await fetch(`/api/user-email?id=${profileId}`);
    if (!res.ok) return '';
    const j = await res.json();
    return j.email || '';
  } catch (e){ return ''; }
}

/* placeholder for edit profile (later: change role) */
window.editProfile = function(id){
  alert('Funcionalidad editar perfil (rol/reset) pendiente: se pueden implementar endpoints seguros para eso.');
}

/* initialize auth state listener */
if (supabase && supabase.auth && supabase.auth.onAuthStateChange){
  supabase.auth.onAuthStateChange((ev, session) => {
    if (session?.user){ currentUser = session.user; loadProfile(); showDashboard(); }
    else { currentUser = null; showLogin(); }
  });
}

/* init */
checkSession();
