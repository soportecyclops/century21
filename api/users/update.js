// /api/users/update.js
import { supabase } from '../_supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH')
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

  const { id, full_name, role } = req.body;

  if (!id)
    return res.status(400).json({ error: "ID requerido" });

  // Actualizar perfil
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: full_name || undefined,
      role: role || undefined
    })
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    ok: true,
    message: "Usuario actualizado correctamente"
  });
}
