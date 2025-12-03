// /api/users/list.js
import { supabase } from '../_supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Método no permitido' });

  const ADMIN_EMAIL = "administrador@soportecyclops.com.ar";
  const token = req.headers.authorization?.replace("Bearer ", "");

  // Validación de token
  if (!token)
    return res.status(401).json({ error: "Token faltante" });

  const { data: admin, error: adminError } = await supabase.auth.getUser(token);

  if (adminError || !admin?.user)
    return res.status(401).json({ error: "Token inválido" });

  // Verifica que el usuario sea el administrador
  if (admin.user.email !== ADMIN_EMAIL)
    return res.status(403).json({ error: "No autorizado" });

  // Traer perfiles
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .order("email", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    ok: true,
    users: data
  });
}
