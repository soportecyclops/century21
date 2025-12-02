/* app.js — Cyclops CRM (Century21 style)
   - Requiere: supabase UMD (ver index.html)
   - Reemplazar SUPABASE_URL y SUPABASE_ANON_KEY por los tuyos o cargarlos por env/config.
*/

/* ========== CONFIG ========== */
/* Reemplaza aquí o carga desde un archivo seguro / env en producción */
const SUPABASE_URL = 'REPLACE_WITH_SUPABASE_URL'; // ej: https://kliecdqosksoilbwgbxx.supabase.co
const SUPABASE_ANON_KEY = 'REPLACE_WITH_SUPABASE_ANON_KEY';
/* ============================ */

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase: URL o ANON key no configurados. Rellena SUPABASE_URL y SUPABASE_ANON_KEY en app.js');
}

/* Supabase client (UMD) */
const supabaseClient = window.supabase && window.supabase.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabaseClient) {
  console.error('Supabase client no disponible. ¿Incluiste el script CDN en index.html?');
}

/* ========== HELPERS ========== */
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const el = id => document.getElementById(id);
const show = (node) => node.classList.remove('hidden');
const hide = (node) => node.classList.add('hidden');

function notify(msg, type = 'info') {
  // simple inline notification for login form area or session status
  const status = qs('#login-message');
  if (status) {
    status.textContent = msg;
    status.className = 'muted small ' + (type === 'error' ? 'error' : type === 'success' ? 'success' : '');
    setTimeout(() => { status.textContent = ''; }, 4000);
  }
  const sessionStatus = el('session-status');
  if (sessionStatus) sessionStatus.textContent = msg;
}

/* ========== SELECTORS ========== */
const loginForm = el('login-form');
const emailInput = el('email');
const passwordInput = el('password');
const btnSignup = el('btn-signup');
const btnLogout = el('btn-logout');
const btnDemo = el('btn-demo');

const panel = el('panel');
const loginCard = el('login-card');
const userWelcome = el('user-welcome');
const userRoleEl = el('user-role');

const clientsTbody = el('clients-tbody');
const q = el('q');
const btnNew = el('btn-new');

const formSection = el('form-section');
const listSection = el('list-section');
const clientForm = el('client-form');
const btnCancel = el('btn-cancel');
const btnDelete = el('btn-delete');
const formTitle = el('form-title');
const clientIdInput = el('client-id');

const yearEl = el('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* Current session/profile */
let currentUser = null;
let currentProfile = null;

/* ========== AUTH FLOW ========== */
async function onAuthChange(event, session) {
  // called on sign in / sign out
  if (session && session.user) {
    currentUser = session.user;
    await loadProfileAndShow();
  } else {
    currentUser = null;
    currentProfile = null;
    // UI
    hide(panel);
    show(loginCard);
    hide(btnLogout);
    el('session-status').textContent = 'No autenticado';
  }
}

/* Initialize: check session, subscribe */
(async () => {
  if (!supabaseClient) return;
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session) {
    currentUser = data.session.user;
    await loadProfileAndShow();
  } else {
    // show login
    hide(panel);
    show(loginCard);
  }

  // subscribe to auth changes
  supabaseClient.auth.onAuthStateChange((event, session) => onAuthChange(event, session));
})();

async function loadProfileAndShow() {
  if (!supabaseClient || !currentUser) return;
  try {
    // fetch profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // If not found, upsert default profile
      console.warn('Profile load error (ignorable if not exists):', profileError.message || profileError);
    }

    if (!profile) {
      // create minimal profile
      const { error: upsertError } = await supabaseClient.from('profiles').upsert({
        id: currentUser.id,
        full_name: currentUser.email,
        role: 'user'
      });
      if (upsertError) console.warn('Error creando profile por defecto:', upsertError.message);
      currentProfile = { full_name: currentUser.email, role: 'user' };
    } else {
      currentProfile = profile;
    }

    // update UI
    userWelcome.textContent = currentProfile.full_name || currentUser.email;
    userRoleEl.textContent = currentProfile.role || 'user';

    // show panel
    hide(loginCard);
    show(panel);
    show(btnLogout);
    el('session-status').textContent = `Conectado como ${currentProfile.full_name || currentUser.email}`;

    // load clients
    loadClients();
  } catch (err) {
    console.error('Error loadProfileAndShow', err);
  }
}

/* ========== AUTH HANDLERS ========== */
loginForm && loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!supabaseClient) return notify('Supabase no configurado', 'error');
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return notify('Completa email y contraseña', 'error');

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return notify(error.message, 'error');
    notify('Autenticando...', 'success');
    // onAuthChange will catch session and show panel
  } catch (err) {
    console.error(err);
    notify('Error iniciando sesión', 'error');
  }
});

btnSignup && btnSignup.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return notify('Completa email y contraseña', 'error');

  try {
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return notify(error.message, 'error');
    notify('Cuenta creada. Revisa tu email para confirmar.', 'success');
  } catch (err) {
    console.error(err);
    notify('Error creando cuenta', 'error');
  }
});

btnLogout && btnLogout.addEventListener('click', async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  // onAuthChange will update UI
});

/* Demo button helper (no guarda datos en supabase) */
btnDemo && btnDemo.addEventListener('click', () => {
  emailInput.value = 'demo@demo.com';
  passwordInput.value = 'demopass';
  notify('Demo cargado en el formulario', 'info');
});

/* ========== CLIENTS CRUD ========== */

/**
 * Helper to read client form fields safely
 * Usage: c('nombre') returns value or ''
 */
function c(id) {
  const node = el(`c-${id}`);
  if (!node) return '';
  if (node.type === 'checkbox') return node.checked;
  return node.value ?? '';
}

async function loadClients() {
  if (!supabaseClient) return;
  clientsTbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

  const search = (q && q.value) ? q.value.trim() : '';
  try {
    let query = supabaseClient.from('clients').select('*');

    if (search) {
      // proper OR ilike for supabase: nombre.ilike.%search%,email.ilike.%search%,celular.ilike.%search%
      const escaped = search.replace(/%/g, '\\%');
      const orString = `nombre.ilike.%${escaped}%,email.ilike.%${escaped}%,celular.ilike.%${escaped}%`;
      query = query.or(orString);
    }

    // ordering (assumes created_at exists)
    const { data, error } = await query.order('created_at', { ascending: false }).limit(500);

    if (error) {
      console.error('Error cargando clients', error);
      clientsTbody.innerHTML = `<tr><td colspan="5">Error cargando registros</td></tr>`;
      return;
    }

    if (!data || data.length === 0) {
      clientsTbody.innerHTML = `<tr><td colspan="5">No hay registros</td></tr>`;
      return;
    }

    clientsTbody.innerHTML = '';
    data.forEach(cItem => {
      const tr = document.createElement('tr');
      const nombre = `${cItem.nombre ?? ''} ${cItem.apellido ?? ''}`.trim();
      const contacto = cItem.email || cItem.celular || cItem.instagram || '';
      const estado = cItem.estado || '';
      const presupuesto = cItem.presupuesto_compra ? Number(cItem.presupuesto_compra).toLocaleString() : '';

      tr.innerHTML = `
        <td>${escapeHtml(nombre)}</td>
        <td>${escapeHtml(contacto)}</td>
        <td>${escapeHtml(estado)}</td>
        <td>${escapeHtml(presupuesto)}</td>
        <td class="actions">
          <button data-id="${cItem.id}" class="btn btn-secondary btn-edit">Editar</button>
          <button data-id="${cItem.id}" class="btn btn-danger btn-delete">Eliminar</button>
        </td>
      `;
      clientsTbody.appendChild(tr);
    });

    // attach listeners
    qsa('.btn-edit', clientsTbody).forEach(b => b.addEventListener('click', onEditClick));
    qsa('.btn-delete', clientsTbody).forEach(b => b.addEventListener('click', onDeleteClick));
  } catch (err) {
    console.error('loadClients error', err);
    clientsTbody.innerHTML = `<tr><td colspan="5">Error inesperado</td></tr>`;
  }
}

/* search debounce */
let searchTimeout = null;
q && q.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadClients, 350);
});

/* open/close form */
btnNew && btnNew.addEventListener('click', () => openForm());
btnCancel && btnCancel.addEventListener('click', closeForm);

function openForm(client = null) {
  listSection.classList.add('hidden');
  formSection.classList.remove('hidden');
  formSection.setAttribute('aria-hidden', 'false');
  btnDelete.classList.toggle('hidden', !client);
  formTitle.textContent = client ? 'Editar cliente' : 'Nuevo cliente';

  clientForm.reset();
  clientIdInput.value = client?.id || '';

  if (client) {
    // populate fields present in the client object
    Object.keys(client).forEach(key => {
      const field = el(`c-${key}`);
      if (field) {
        if (field.type === 'checkbox') field.checked = !!client[key];
        else field.value = client[key] ?? '';
      }
    });
  }
}

function closeForm() {
  formSection.classList.add('hidden');
  listSection.classList.remove('hidden');
  formSection.setAttribute('aria-hidden', 'true');
}

/* Edit / Delete handlers */
async function onEditClick(e) {
  const id = e.currentTarget.dataset.id;
  if (!id) return notify('ID inexistente', 'error');
  const { data, error } = await supabaseClient.from('clients').select('*').eq('id', id).single();
  if (error) {
    console.error('onEditClick error', error);
    return notify('Error cargando registro', 'error');
  }
  openForm(data);
}

async function onDeleteClick(e) {
  const id = e.currentTarget.dataset.id;
  if (!id) return notify('ID inexistente', 'error');
  if (!confirm('Eliminar este cliente?')) return;
  const { error } = await supabaseClient.from('clients').delete().eq('id', id);
  if (error) return notify(error.message, 'error');
  notify('Registro eliminado', 'success');
  loadClients();
}

/* Submit form (create / update) */
clientForm && clientForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const id = clientIdInput.value;

  // basic validation
  const nombre = c('nombre').trim();
  if (!nombre) return notify('El nombre es obligatorio', 'error');

  const payload = {
    user_id: currentUser?.id ?? null,
    nombre,
    apellido: c('apellido').trim() || null,
    instagram: c('instagram').trim() || null,
    celular: c('celular').trim() || null,
    email: c('email').trim() || null,
    fecha_alta: c('fecha_alta') || null,
    tipo_contacto: c('tipo_contacto') || null,
    tipo_cliente: c('tipo_cliente') || null,
    direccion: c('direccion') || null,
    localidad: c('localidad') || null,
    partido: c('partido') || null,
    fecha_proximo_contacto: c('fecha_proximo_contacto') || null,
    estado: c('estado') || null,
    origen: c('origen') || null,
    necesita_vender: (c('necesita_vender') === 'true'),
    presupuesto_compra: c('presupuesto_compra') ? Number(c('presupuesto_compra')) : null,
    zona_busqueda: c('zona_busqueda') || null,
    observaciones: c('observaciones') || null
  };

  try {
    if (id) {
      const { error } = await supabaseClient.from('clients').update(payload).eq('id', id);
      if (error) return notify(error.message, 'error');
      notify('Registro actualizado', 'success');
    } else {
      const { error } = await supabaseClient.from('clients').insert(payload);
      if (error) return notify(error.message, 'error');
      notify('Registro creado', 'success');
    }
    closeForm();
    loadClients();
  } catch (err) {
    console.error('save client error', err);
    notify('Error guardando registro', 'error');
  }
});

btnDelete && btnDelete.addEventListener('click', async () => {
  const id = clientIdInput.value;
  if (!id) return notify('ID inexistente', 'error');
  if (!confirm('Eliminar este cliente?')) return;
  const { error } = await supabaseClient.from('clients').delete().eq('id', id);
  if (error) return notify(error.message, 'error');
  notify('Registro eliminado', 'success');
  closeForm();
  loadClients();
});

/* ========== UTILITIES ========== */
function escapeHtml(text) {
  if (!text && text !== 0) return '';
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* ========== END ========== */
