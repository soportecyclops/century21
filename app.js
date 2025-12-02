// === CONFIGURE ===
const SUPABASE_URL = 'https://REPLACE_WITH_YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'REPLACE_WITH_YOUR_ANON_KEY';
// ==================

const supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Selectors
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnSignup = document.getElementById('btn-signup');
const btnSignout = document.getElementById('btn-signout');

const panel = document.getElementById('panel');
const userWelcome = document.getElementById('user-welcome');
const userRoleEl = document.getElementById('user-role');
const btnLogout = document.getElementById('btn-logout');
const clientsTbody = document.getElementById('clients-tbody');
const q = document.getElementById('q');

const formSection = document.getElementById('form-section');
const listSection = document.getElementById('list-section');
const btnNew = document.getElementById('btn-new');
const clientForm = document.getElementById('client-form');
const btnCancel = document.getElementById('btn-cancel');
const btnDelete = document.getElementById('btn-delete');

let currentUser = null;
let currentProfile = null;

// LOGIN
async function handleLogin(e) {
  e.preventDefault();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value
  });
  if (error) return alert(error.message);
  loadUserAndShowPanel();
}

async function handleSignup() {
  if (!emailInput.value || !passwordInput.value)
    return alert('Completa email y contraseña');
  const { error } = await supabase.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value
  });
  if (error) return alert(error.message);
  alert('Cuenta creada. Revisa tu email.');
}

async function handleLogout() {
  await supabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  panel.style.display = 'none';
  document.querySelector('.login-panel').style.display = 'block';
}

// Load profile
async function loadUserAndShowPanel() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  currentUser = user;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.email,
      role: 'user'
    });
    currentProfile = { full_name: user.email, role: 'user' };
  } else currentProfile = profile;

  userWelcome.textContent = currentProfile.full_name;
  userRoleEl.textContent = currentProfile.role;

  document.querySelector('.login-panel').style.display = 'none';
  panel.style.display = 'block';
  btnSignout.classList.remove('hidden');

  loadClients();
}

// Check session on load
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) loadUserAndShowPanel();
})();

// LOAD CLIENTS
async function loadClients() {
  clientsTbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
  const search = q.value || '';

  let query = supabase.from('clients').select('*');

  if (search)
    query = query.ilike('nombre', `%${search}%`)
      .or(`email.ilike.%${search}%,celular.ilike.%${search}%`);

  const { data, error } = await query.order('created_at', { ascending: false }).limit(200);

  if (error) return console.error(error);

  clientsTbody.innerHTML = '';

  if (!data.length)
    return clientsTbody.innerHTML = '<tr><td colspan="5">No hay registros</td></tr>';

  data.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.nombre || ''} ${c.apellido || ''}</td>
      <td>${c.email || c.celular || c.instagram || ''}</td>
      <td>${c.estado || ''}</td>
      <td>${c.presupuesto_compra || ''}</td>
      <td class="actions">
        <button data-id="${c.id}" class="btn-edit">Editar</button>
        <button data-id="${c.id}" class="btn-delete">Eliminar</button>
      </td>
    `;
    clientsTbody.appendChild(tr);
  });

  document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', onEditClick));
  document.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', onDeleteClick));
}

q.addEventListener('input', loadClients);

// FORM HANDLING
btnNew.addEventListener('click', () => openForm());
btnCancel.addEventListener('click', closeForm);

function openForm(client = null) {
  listSection.classList.add('hidden');
  formSection.classList.remove('hidden');
  btnDelete.classList.toggle('hidden', !client);
  document.getElementById('form-title').textContent = client ? 'Editar cliente' : 'Nuevo cliente';

  clientForm.reset();
  document.getElementById('client-id').value = client?.id || '';

  if (client) {
    Object.keys(client).forEach(key => {
      const field = document.getElementById(`c-${key}`);
      if (field) field.value = client[key] ?? '';
    });
  }
}

function closeForm() {
  formSection.classList.add('hidden');
  listSection.classList.remove('hidden');
}

async function onEditClick(e) {
  const id = e.target.dataset.id;
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error) return alert('Error cargando registro');
  openForm(data);
}

async function onDeleteClick(e) {
  if (!confirm('Eliminar?')) return;
  const id = e.target.dataset.id;
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) return alert(error.message);
  loadClients();
}

clientForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();

  const id = document.getElementById('client-id').value;

  const payload = {
    user_id: currentUser.id,
    nombre: c('nombre'),
    apellido: c('apellido'),
    instagram: c('instagram'),
    celular: c('celular'),
    email: c('email'),
    fecha_alta: c('fecha_alta') || null,
    tipo_contacto: c('tipo_contacto'),
    tipo_cliente: c('tipo_cliente'),
    direccion: c('direccion'),
    localidad: c('localidad'),
    partido: c('partido'),
    fecha_proximo_contacto: c('fecha_proximo_contacto') || null,
    estado: c('estado'),
    origen: c('origen'),
    necesita_vender: c('necesita_vender') === 'true',
    presupuesto_compra: c('presupuesto_compra') || null,
    zona_busqueda: c('zona_busqueda'),
    observaciones: c('observaciones')
  };

  if (id) {
    const { error } = await supabase.from('clients').update(payload).eq('id', id);
    if (error) return alert(error.message);
  } else {
    const { error } = await supabase.from('clients').insert(payload);
    if (error) return alert(error.message);
  }

  closeForm();
  loadClients();
});

btnDelete.addEventListener('click', async () => {
  const id = document.getElementById('client-id').value;
  if (!confirm('Eliminar este cliente?')) return;
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) return alert(error.message);
  closeForm();
  loadClients();
});

// Helper
function c(id) {
  return document.getElementById(`c-${id}`).value;
}
