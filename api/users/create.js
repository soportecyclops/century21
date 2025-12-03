// /api/users/create.js
import { supabase } from '../_supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Método no permitido' });

  const ADMIN_EMAIL = "administrador@soportecyclops.com.ar";
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token)
    return res.status(401).json({ error: "Token faltante" });

  const { data: admin, error: adminError } = await supabase.auth.getUser(token);

  if (adminError || !admin?.user)
    return res.status(401).json({ error: "Token inválido" });

  if (admin.user.email !== ADMIN_EMAIL)
    return res.status(403).json({ error: "No autorizado" });

  const { email, password, full_name, role } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email y password requeridos" });

  // Crear usuario en Supabase Auth
  const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (createError)
    return res.status(500).json({ error: createError.message });

  // Crear perfil asociado
  await supabase.from("profiles").insert({
    id: authUser.user.id,
    full_name: full_name || "",
    role: role || "user"
  });

  return res.status(200).json({
    ok: true,
    message: "Usuario creado correctamente",
    id: authUser.user.id
  });
}
