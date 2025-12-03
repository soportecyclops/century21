// server.js (Express example) - deploy en servidor seguro
const express = require('express');
const fetch = require('node-fetch'); // node18+ tiene fetch nativo; ajustar según entorno
const bodyParser = require('body-parser');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Falta configurar SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const app = express();
app.use(bodyParser.json());

/**
 * POST /api/create-user
 * body: { email, password, full_name, role }
 */
app.post('/api/create-user', async (req, res) => {
  const { email, password, full_name, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });

  try {
    // 1) create user via admin REST endpoint
    const createResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ email, password, email_confirm: true })
    });

    const createJson = await createResp.json();
    if (!createResp.ok) return res.status(createResp.status).json({ error: createJson });

    const userId = createJson.id;

    // 2) insert profile
    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ id: userId, full_name: full_name || email, role: role || 'user' })
    });
    const insertJson = await insertResp.json();
    if (!insertResp.ok) {
      // try to cleanup user?
      return res.status(insertResp.status).json({ error: insertJson });
    }

    return res.status(201).json({ user: createJson, profile: insertJson });
  } catch (err) {
    console.error('create-user error', err);
    return res.status(500).json({ error: 'error interno' });
  }
});

/**
 * GET /api/user-email?id=UUID
 * returns { email }
 */
app.get('/api/user-email', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id requerido' });
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
    });
    if (!resp.ok) {
      const j = await resp.json();
      return res.status(resp.status).json({ error: j });
    }
    const j = await resp.json();
    return res.json({ email: j.email });
  } catch (err){
    console.error(err);
    return res.status(500).json({ error: 'error interno' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server listening on', PORT));
