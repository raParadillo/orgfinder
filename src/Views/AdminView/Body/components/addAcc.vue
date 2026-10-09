<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";

type OrgOption = {
  org_id: number;
  name: string;
};

const router = useRouter();
const orgs = ref<OrgOption[]>([]);
const isSubmitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");


const email = ref("");
const role = ref<"admin" | "officer" | "">("");
const selectedOrgId = ref<number | null>(null);
const status = ref<"active" | "archived">("active");

async function loadOrganizations() {
  const { data, error } = await supabase
    .from("orgs")
    .select("org_id, name")
    .order("name");

  if (error) {
    console.error("Error loading orgs:", error.message);
    return;
  }

   if (data) {
    orgs.value = data;
  }
}

async function handleCreateAccount() {
  const cleanEmail = email.value.trim().toLowerCase();

  if (!cleanEmail.endsWith("@liceo.edu.ph")) {
    errorMessage.value = "Please use an official school email.";
    return;
  }

   if (!role.value) {
    errorMessage.value = "Please select a role.";
    return;
  }

  if (role.value === "officer" && !selectedOrgId.value) {
    errorMessage.value = "Please select an organization for this officer.";
    return;
  }


  isSubmitting.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  const { error } = await supabase.from("users").insert({
    email: cleanEmail,
    role: role.value,
    org_id: role.value === "admin" ? null : selectedOrgId.value,
    is_active: status.value === "active",
  });

  if (error) {
    if (error.code === "23505") {
      errorMessage.value = "An account with this email already exists.";
    } else {
      errorMessage.value = error.message;
    }
    isSubmitting.value = false;
  } else {
    await router.push("/admin/accounts");
  }
}



onMounted(() => {
  loadOrganizations();
});
</script>

<template>
  <main class="flex-1 h-full overflow-y-auto bg-white p-8">
    <h1 class="text-3xl font-extrabold text-[#1a1a1a]">Create Account</h1>

    <div v-if="errorMessage" class="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
      {{ errorMessage }}
    </div>

    <div class="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12">
      
      <div class="space-y-6 lg:col-span-7">
        <h2 class="text-sm font-bold text-[#8f0c12]">Account Creation Guidelines</h2>

        <div class="space-y-1 text-xs text-[#444]">
          <h3 class="font-bold text-[#222]">Institutional Email Rule</h3>
          <p class="leading-relaxed">• Must use an official institutional email (@liceo.edu.ph).</p>
          <p class="leading-relaxed">• Personal email accounts (Gmail, Yahoo, etc.) are strictly prohibited for official access.</p>
        </div>


        <div class="space-y-1 text-xs text-[#444]">
          <h3 class="font-bold text-[#222]">Role Permissions</h3>
          <p class="leading-relaxed">
            • <strong>Officer:</strong> Grants access to manage the designated organization's profile, events, and public details.
          </p>
          <p class="leading-relaxed">
            • <strong>Admin:</strong> Grants elevated system-wide administrative access. Assign only to authorized portal managers.
          </p>
        </div>

        <div class="space-y-1 text-xs text-[#444]">
          <h3 class="font-bold text-[#222]">Organization Assignment</h3>
          <p class="leading-relaxed">
            • Verify the associated organization carefully. Assigning the wrong organization gives the user unauthorized access to that group's management tools.
          </p>
          <p class="leading-relaxed">
            • Prerequisite: The organization must already exist in the system. If the organization is not listed in the selection, go to Creating New Org and create it first before creating this account.
          </p>
        </div>

        <div class="space-y-1 text-xs text-[#444]">
          <h3 class="font-bold text-[#222]">Account Status</h3>
          <p class="leading-relaxed">• <strong>Active:</strong> Immediately enables login and grants access upon creation.</p>
          <p class="leading-relaxed">• <strong>Inactive / Archived:</strong> Registers the account into the system without permitting active login access.</p>
        </div>
      </div>

      <form class="space-y-5 lg:col-span-5" @submit.prevent="handleCreateAccount">

        <div>
          <label class="block text-xs font-bold text-[#222]">
            Liceo email
            <input
              v-model="email"
              type="email"
              placeholder="e.g., Example@liceo.edu.ph"
              required
              class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-4 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
            />
          </label>
        </div>

        <div>
          <label class="block text-xs font-bold text-[#222]">
            Role
            <select
              v-model="role"
              required
              class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-4 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]">
              <option value="" disabled>-- Select Role --</option>
              <option value="officer">Officer</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>

        <div>
          <label class="block text-xs font-bold text-[#222]">
            Org associated
            <select
              v-model="selectedOrgId"
              :disabled="role !== 'officer'"
              class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-4 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207] disabled:opacity-50">
              <option v-if="role === 'admin'" :value="null">All Organizations (Admin)</option>
              <option v-else :value="null" disabled>-- Select Organization --</option>
              <option v-for="org in orgs" :key="org.org_id" :value="org.org_id">
                {{ org.name }}
              </option>
            </select>
          </label>
        </div>


        <div>
          <label class="block text-xs font-bold text-[#222]">
            Status
            <select
              v-model="status"
              class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-4 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        <div class="pt-2">
          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full rounded-lg bg-[#6b0207] py-2.5 text-xs font-bold text-white transition hover:bg-[#520105] disabled:opacity-60 shadow-sm"
          >
            {{ isSubmitting ? "Creating Account..." : "Create Account" }}
          </button>
        </div>

      </form>

    </div>
  </main>
</template>
