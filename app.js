// ===============================
// CONFIG SUPABASE
// ===============================
const SUPABASE_URL = "https://kliecdqosksoilbwgbxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsaWVjZHFvc2tzb2lsYndnYnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjE3NjIsImV4cCI6MjA4MDIzNzc2Mn0.kLcGwhxDxCFw1865dvKuG7jUulWMd3WJI1de5W2kEOE";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helpers
const qs  = (s) => document.querySelector(s);
const qsa = (s) => document.querySelectorAll(s);

// Views
const loginView     = qs("#login-view");
const dashboardView = qs("#dashboard-view");

// Forms
const loginForm      = qs("#login-form");
const loginFeedback  = qs("#login-feedback");

const clientForm     = qs("#client-form");
const formFeedback   = qs("#form-feedback");

const clientList     = qs("#client-list");
const searchInput    = qs("#search");
const btnRefresh     = qs("#btn-refresh");
const btnLogout      = qs("#btn-logout");

// ===============================
// SESIÓN
// ===============================
async function checkSession() {
    const { data } = await supabase.auth.getSession();
    data?.session ? showDashboard() : showLogin();
}

function showLogin() {
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
}

function showDashboard() {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    loadClients();
}

// ===============================
// LOGIN
// ===============================
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email    = qs("#login-email").value.trim();
    const password = qs("#login-password").value.trim();

    loginFeedback.textContent = "Procesando...";

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        loginFeedback.textContent = "Credenciales incorrectas.";
        return;
    }

    loginFeedback.textContent = "";
    showDashboard();
});

// LOGOUT
btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    showLogin();
});

// ===============================
// CRUD
// ===============================
async function loadClients() {
    clientList.innerHTML = `<tr><td colspan="7">Cargando...</td></tr>`;

    const searchTerm = searchInput.value.trim();

    let query = supabase.from("clients").select("*").order("nombre", { ascending: true });

    if (searchTerm) {
        query = query.or(
            `nombre.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,celular.ilike.%${searchTerm}%`
        );
    }

    const { data, error } = await query;

    if (error) {
        clientList.innerHTML = `<tr><td colspan="7">Error cargando datos</td></tr>`;
        return;
    }

    renderClients(data);
}

function renderClients(rows) {
    if (!rows.length) {
        clientList.innerHTML = `<tr><td colspan="7">Sin resultados</td></tr>`;
        return;
    }

    clientList.innerHTML = rows.map(c => `
        <tr>
            <td>${c.nombre}</td>
            <td>${c.email}</td>
            <td>${c.celular}</td>
            <td>${c.empresa ?? ""}</td>
            <td>${c.estado ?? ""}</td>
            <td>${c.interes ?? ""}</td>
            <td>
                <button class="btn-black" onclick="editClient('${c.id}')">Editar</button>
                <button class="btn-black" onclick="deleteClient('${c.id}')">Eliminar</button>
            </td>
        </tr>
    `).join("");
}

// ===============================
// EDITAR
// ===============================
function editClient(id) {
    supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data }) => {
            qs("#client-id").value = data.id;
            qs("#nombre").value    = data.nombre;
            qs("#email").value     = data.email;
            qs("#celular").value   = data.celular;
            qs("#empresa").value   = data.empresa ?? "";
            qs("#estado").value    = data.estado ?? "nuevo";
            qs("#interes").value   = data.interes ?? "";

            window.scrollTo({ top: 0, behavior: "smooth" });
        });
}

// ===============================
// GUARDAR
// ===============================
clientForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = qs("#client-id").value;

    const clientData = {
        nombre: qs("#nombre").value,
        email: qs("#email").value,
        celular: qs("#celular").value,
        empresa: qs("#empresa").value,
        estado: qs("#estado").value,
        interes: qs("#interes").value,
    };

    let response = id
        ? await supabase.from("clients").update(clientData).eq("id", id)
        : await supabase.from("clients").insert(clientData);

    if (response.error) {
        formFeedback.textContent = "Error guardando datos";
        return;
    }

    formFeedback.textContent = "Guardado correctamente";
    clientForm.reset();
    loadClients();
});

// ===============================
// ELIMINAR
// ===============================
async function deleteClient(id) {
    await supabase.from("clients").delete().eq("id", id);
    loadClients();
}

// ===============================
// BUSCADOR
// ===============================
searchInput.addEventListener("input", loadClients);
btnRefresh.addEventListener("click", loadClients);

// ===============================
// INIT
// ===============================
checkSession();
