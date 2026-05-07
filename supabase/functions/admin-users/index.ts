// Admin user management edge function
// Provides: list users, create user, update role, set active, reset password
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check admin role
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin role required" }, 403);

    const body = await req.json();
    const action = body.action as string;

    if (action === "list") {
      const { data: usersList, error: listErr } = await admin.auth.admin.listUsers();
      if (listErr) throw listErr;
      const ids = usersList.users.map((u) => u.id);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        admin.from("profiles").select("*").in("id", ids),
        admin.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);
      const merged = usersList.users.map((u) => {
        const p = profiles?.find((x) => x.id === u.id);
        const r = roles?.find((x) => x.user_id === u.id);
        return {
          id: u.id,
          email: u.email,
          full_name: p?.full_name ?? null,
          phone: p?.phone ?? null,
          role: r?.role ?? "employee",
          is_active: p?.is_active ?? !u.banned_until,
          banned_until: u.banned_until ?? null,
          created_at: u.created_at,
        };
      });
      return json({ users: merged });
    }

    if (action === "create") {
      const { email, password, full_name, role } = body;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (createErr) throw createErr;
      // Update default role assigned by trigger
      await admin.from("user_roles").update({ role }).eq("user_id", created.user.id);
      return json({ user: created.user });
    }

    if (action === "update_role") {
      const { user_id, role } = body;
      // Upsert role
      const { data: existing } = await admin.from("user_roles").select("id").eq("user_id", user_id).maybeSingle();
      if (existing) {
        await admin.from("user_roles").update({ role }).eq("user_id", user_id);
      } else {
        await admin.from("user_roles").insert({ user_id, role });
      }
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, password } = body;
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "set_active") {
      const { user_id, is_active } = body;
      // Ban / unban via supabase admin
      const { error } = await admin.auth.admin.updateUserById(user_id, {
        ban_duration: is_active ? "none" : "876000h",
      });
      if (error) throw error;
      await admin.from("profiles").update({ is_active }).eq("id", user_id);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
