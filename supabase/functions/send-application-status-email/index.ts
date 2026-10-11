import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  applicationId: number;
  status: "pending" | "approved" | "declined";
  notes: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return jsonResponse({ error: "Authentication is required." }, 401);

    const body = (await request.json()) as RequestBody;
    if (
      !Number.isInteger(body.applicationId) ||
      !["pending", "approved", "declined"].includes(body.status)
    ) {
      return jsonResponse({ error: "Invalid application status request." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    if (!supabaseUrl || !supabaseAnonKey || !resendApiKey || !fromEmail) {
      return jsonResponse({ error: "Email service is not configured." }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user?.email) {
      return jsonResponse({ error: "Authentication is invalid." }, 401);
    }

    const { data: officer, error: officerError } = await supabase
      .from("users")
      .select("org_id, role, is_active")
      .ilike("email", authData.user.email)
      .maybeSingle();
    if (officerError || !officer?.org_id || officer.role !== "officer" || !officer.is_active) {
      return jsonResponse({ error: "You are not authorized to send application updates." }, 403);
    }

    const [{ data: application, error: applicationError }, { data: organization, error: organizationError }] =
      await Promise.all([
        supabase
          .from("applications")
          .select("email")
          .eq("application_id", body.applicationId)
          .eq("org_id", officer.org_id)
          .single(),
        supabase.from("orgs").select("name").eq("org_id", officer.org_id).single(),
      ]);
    if (applicationError || !application?.email || organizationError || !organization?.name) {
      return jsonResponse({ error: "Application or organization could not be found." }, 404);
    }

    const statusLabel = body.status.charAt(0).toUpperCase() + body.status.slice(1);
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + resendApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [application.email],
        subject: `Application update from ${organization.name}`,
        text: [
          `Your application to ${organization.name} has been ${statusLabel}!`,
          "",
          "Read notes:",
          body.notes || "No notes were provided.",
        ].join("\n"),
      }),
    });
    if (!resendResponse.ok) {
      return jsonResponse({ error: `Resend rejected the email: ${await resendResponse.text()}` }, 502);
    }

    return jsonResponse({ sent: true }, 200);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to send application email." },
      500,
    );
  }
});

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
