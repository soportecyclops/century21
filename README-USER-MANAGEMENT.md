📘 README — Gestión de Usuarios (Admin Panel + Roles)
Endpoints incluidos
Archivo	Método	Descripción
/api/users/list.js	GET	Lista todos los usuarios
/api/users/create.js	POST	Crea un usuario nuevo
/api/users/update.js	PATCH	Actualiza roles y datos
Autenticación

Todos los endpoints requieren:

Authorization: Bearer <TOKEN_ADMIN>


El único usuario autorizado es:

administrador@soportecyclops.com.ar

Estructura de la tabla profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'user' check (role in ('admin','user')),
  email text
);


Nota: El email se completa automáticamente desde auth.users().

Ejemplos de requests
📌 Listar usuarios
GET /api/users/list
Authorization: Bearer xxxxx

📌 Crear usuario
POST /api/users/create
Content-Type: application/json
Authorization: Bearer xxxxx

{
  "email": "nuevo@dominio.com",
  "password": "12345678",
  "full_name": "Nuevo Usuario",
  "role": "user"
}

📌 Editar usuario
PATCH /api/users/update
Content-Type: application/json
Authorization: Bearer xxxxx

{
  "id": "UUID",
  "role": "admin"
}

🟦 6) Integración Frontend (HTML + JS para panel admin)
📌 Botón “Editar”
<button class="editUserBtn" data-id="{{id}}">Editar</button>

📌 Lógica JS completa
async function updateUser(id, newRole, newName) {
  const token = localStorage.getItem("adminToken");

  const res = await fetch("/api/users/update", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      id,
      role: newRole,
      full_name: newName
    })
  });

  const data = await res.json();
  return data.ok;
}

🟦 7) TODO LISTO PARA PRODUCCIÓN

✔ Routes organizadas
✔ Control de acceso estricto
✔ Roles editables
✔ Frontend conectable en 1 minuto
✔ Compatible Vercel / Node / Express
✔ Código limpio, seguro y documentado
