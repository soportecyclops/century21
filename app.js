// ===============================
// CONFIG SUPABASE
// ===============================
const SUPABASE_URL = "https://kliecdqosksoilbwgbxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsaWVjZHFvc2tzb2lsYndnYnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjE3NjIsImV4cCI6MjA4MDIzNzc2Mn0.kLcGwhxDxCFw1865dvKuG7jUulWMd3WJI1de5W2kEOE";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// HELPERS
// ===============================
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => document.querySelectorAll(sel);

// Views
const loginView = qs("#login-view");
const dashboardView = qs("#dashboard-view");

// Inputs
const loginForm = qs("#login-form");
const loginFeedback = qs("#login-feedback");

const clientForm = qs("#client-form");
const formFeedback = qs("#form-feedback");

const clientList = qs("#client-list");
const searchInput = qs("#search");
const btnRefresh = qs("#btn-refresh");
const btnLogout = qs("#btn-logout");
const roleBadge = qs("#role-badge");

let currentUser = null;
let currentRole = "user";


// ===============================
// SESSION CHECK
// ===============================
async function checkSession() {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
        currentUser = data.session.user;
        await fetchUserRole();
        showDashboard();
    } else {
        showLogin();
    }
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
// USER ROLE
// ===============================
async function fetchUserRole() {
    const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

    currentRole = data?.role ?? "user";

    roleBadge.textContent = currentRole.toUpperCase();
}


// ===============================
// LOGIN
// ===============================
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = qs("#login-email").value.trim();
    const password = qs("#login-password").value.trim();

    loginFeedback.textContent = "Procesando...";

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        loginFeedback.textContent = "Credenciales incorrectas.";
        return;
    }

    loginFeedback.textContent = "";
    checkSession();
});


// ===============================
// LOGOUT
// ===============================
btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    showLogin();
});


// ===============================
// LOAD CLIENTS
// ===============================
async function loadClients() {
    clientList.innerHTML = `<tr><td colspan="8">Cargando...</td></tr>`;

    const searchTerm = searchInput.value.trim();

    let query = supabase
        .from("clients")
        .select("*")
        .order("first_name", { ascending: true });

    if (currentRole === "user") {
        query.eq("user_id", currentUser.id);
    }

    if (searchTerm) {
        query.or(
            `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
        );
    }

    const { data, error } = await query;

    if (error) {
        clientList.innerHTML = `<tr><td colspan="8">Error cargando datos</td></tr>`;
        return;
    }

    renderClients(data);
}


// ===============================
// RENDER
// ===============================
function renderClients(rows) {
    if (!rows.length) {
        clientList.innerHTML = `<tr><td colspan="8">Sin resultados</td></tr>`;
        return;
    }

    clientList.innerHTML = rows
        .map(
            (c) => `
        <tr>
            <td>${c.first_name} ${c.last_name}</td>
            <td>${c.email ?? ""}</td>
            <td>${c.phone ?? ""}</td>
            <td>${c.locality ?? ""}</td>
            <td>${c.district ?? ""}</td>
            <td>${c.status ?? ""}</td>
            <td>${c.notes ?? ""}</td>
            <td>
                <button onclick="editClient('${c.id}')" class="btn-black">Editar</button>
                ${
                    currentRole === "admin"
                        ? `<button onclick="deleteClient('${c.id}')" class="btn-black">Eliminar</button>`
                        : ``
                }
            </td>
        </tr>`
        )
        .join("");
}


// ===============================
// EDIT CLIENT
// ===============================
window.editClient = async function (id) {
    const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

    qs("#client-id").value = data.id;
    qs("#first_name").value = data.first_name;
    qs("#last_name").value = data.last_name;
    qs("#email").value = data.email ?? "";
    qs("#phone").value = data.phone ?? "";
    qs("#locality").value = data.locality ?? "";
    qs("#district").value = data.district ?? "";
    qs("#status").value = data.status ?? "";
    qs("#notes").value = data.notes ?? "";

    window.scrollTo({ top: 0, behavior: "smooth" });
};


// ===============================
// SAVE CLIENT
// ===============================
clientForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
        first_name: qs("#first_name").value,
        last_name: qs("#last_name").value,
        email: qs("#email").value,
        phone: qs("#phone").value,
        locality: qs("#locality").value,
        district: qs("#district").value,
        status: qs("#status").value,
        notes: qs("#notes").value,
        user_id: currentUser.id
    };

    const id = qs("#client-id").value;

    let result;
    if (id) {
        result = await supabase.from("clients").update(payload).eq("id", id);
    } else {
        result = await supabase.from("clients").insert(payload);
    }

    if (result.error) {
        formFeedback.textContent = "Error guardando";
        return;
    }

    formFeedback.textContent = "Guardado correctamente";
    clientForm.reset();
    loadClients();
});


// ===============================
// DELETE CLIENT
// ===============================
window.deleteClient = async function (id) {
    if (currentRole !== "admin") return;

    await supabase.from("clients").delete().eq("id", id);
    loadClients();
};


// ===============================
// SEARCH + REFRESH
// ===============================
searchInput.addEventListener("input", loadClients);
btnRefresh.addEventListener("click", loadClients);


// ===============================
// INIT
// ===============================
checkSession();
