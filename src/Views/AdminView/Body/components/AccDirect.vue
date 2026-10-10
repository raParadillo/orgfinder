<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { supabase } from "@/lib/supabaseClient";
import { Search, Inbox, Trash } from "@primeicons/vue";

type UserAccount = {
  user_id: number;
  email: string;
  role: string;
  is_active: boolean;
  org_id?: number | null;
  org_name?: string | null;
};
const accounts = ref<UserAccount[]>([]);
const activeTab = ref<"active" | "archived">("active");
const searchQuery = ref("");
const isLoading = ref(true);
const pendingDeleteAccount = ref<UserAccount | null>(null);
const isDeletingAccount = ref(false);
const deleteError = ref("");


async function loadAccounts() {
  isLoading.value = true;
  const [{ data: usersData, error: usersError }, { data: orgsData }] = await Promise.all([
    supabase
      .from("users")
      .select("user_id, email, role, is_active, org_id")
      .order("user_id"),
    supabase.from("orgs").select("org_id, name"),
  ]);
  const orgMap = new Map((orgsData ?? []).map((org) => [org.org_id, org.name]));
  if (usersData) {
    accounts.value = usersData.map((u) => ({
      ...u,
      org_name: u.org_id ? orgMap.get(u.org_id) ?? "—" : "All (Admin)",
    }));
  }
  isLoading.value = false;
}

const filteredAccounts = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  const showActive = activeTab.value === "active";
  return accounts.value.filter((account) => {
    const matchesTab = account.is_active === showActive;
    const matchesSearch =
      !query ||
      account.email.toLowerCase().includes(query) ||
      account.role.toLowerCase().includes(query) ||
      (account.org_name && account.org_name.toLowerCase().includes(query)) ||
      String(account.user_id).includes(query);
    return matchesTab && matchesSearch;
  });
});


async function toggleArchive(account: UserAccount) {
  const newStatus = !account.is_active;
  const action = newStatus ? "Restore" : "Archive";

  const { data: sessionData } = await supabase.auth.getSession();
  const myEmail = sessionData.session?.user.email?.toLowerCase();
  if (!newStatus && myEmail && account.email.toLowerCase() === myEmail) {
    console.warn("You cannot archive your own account.");
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .update({ is_active: newStatus })
    .eq("user_id", account.user_id)
    .select("user_id, is_active");

  if (error) {
    console.error(`Could not ${action.toLowerCase()}: ${error.message}`);
    return;
  }
  if (!data || data.length === 0) {
    console.warn("Nothing was changed. The database blocked this update (check RLS policies).");
    return;
  }

  account.is_active = newStatus;
}

function openDeleteConfirmation(account: UserAccount) {
  deleteError.value = "";
  pendingDeleteAccount.value = account;
}

function closeDeleteConfirmation() {
  if (!isDeletingAccount.value) {
    pendingDeleteAccount.value = null;
    deleteError.value = "";
  }
}

async function deleteAccount() {
  const account = pendingDeleteAccount.value;
  if (!account || account.is_active) return;

  isDeletingAccount.value = true;
  deleteError.value = "";

  const { data, error } = await supabase
    .from("users")
    .delete()
    .eq("user_id", account.user_id)
    .eq("is_active", false)
    .select("user_id");

  if (error) {
    deleteError.value = error.message || "Unable to delete this account.";
    isDeletingAccount.value = false;
    return;
  }
  if (!data || data.length === 0) {
    deleteError.value = "The account was not deleted. Check the database delete policy.";
    isDeletingAccount.value = false;
    return;
  }

  accounts.value = accounts.value.filter((item) => item.user_id !== account.user_id);
  pendingDeleteAccount.value = null;
  isDeletingAccount.value = false;
}

onMounted(() => {
  loadAccounts();
});
</script>
<template>
      <main class="flex-1 h-full overflow-y-auto bg-white p-8">

    <h1 class="text-3xl font-extrabold text-[#1a1a1a]">Lists of Accounts</h1>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#eee] pb-4">

      <div class="flex items-center gap-6">
        <button
          type="button"
          class="pb-1 text-sm font-bold transition"
          :class="activeTab === 'active' ? 'border-b-2 border-[#1a1a1a] text-[#1a1a1a]' : 'text-[#888] hover:text-[#444]'"
          @click="activeTab = 'active'"
        >
          Active
        </button>
        <button
          type="button"
          class="pb-1 text-sm font-bold transition"
          :class="activeTab === 'archived' ? 'border-b-2 border-[#1a1a1a] text-[#1a1a1a]' : 'text-[#888] hover:text-[#444]'"
          @click="activeTab = 'archived'"
        >
          Archived
        </button>
      </div>

      <div class="relative w-80">
        <Search class="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search by..."
          class="w-full rounded-full bg-[#f1f1f1] py-1.5 pl-9 pr-4 text-xs text-[#222] outline-none focus:ring-1 focus:ring-[#6b0207]"
        />
      </div>
    </div>

    <div class="mt-4 text-xs font-semibold text-[#555]">
      {{ filteredAccounts.length }} Results
    </div>

    <div v-if="isLoading" class="py-12 text-center text-xs text-gray-500">
      Loading accounts...
    </div>

    <div v-else-if="filteredAccounts.length" class="mt-4 overflow-hidden rounded-xl border border-[#e5e5e5]">
      <table class="w-full text-left text-xs text-[#333]">

        <thead class="bg-[#d9d9d9] text-[11px] font-semibold text-[#333]">
          <tr>
            <th class="w-10 px-4 py-3 text-center"></th>
            <th class="px-4 py-3">user_id</th>
            <th class="px-4 py-3">org</th>
            <th class="px-4 py-3">email</th>
            <th class="px-4 py-3">role</th>
            <th class="px-4 py-3 text-center">Action</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-[#efefef] bg-white">
          <tr
            v-for="account in filteredAccounts"
            :key="account.user_id"
            class="transition hover:bg-gray-50"
          >

            <td class="px-4 py-3.5 text-center">
              <span
                class="inline-block h-2.5 w-2.5 rounded-full"
                :class="account.is_active ? 'bg-emerald-500' : 'bg-gray-400'"
              ></span>
            </td>

            <td class="px-4 py-3.5 font-medium text-[#222]">
              {{ account.user_id }}
            </td>
          
            <td class="px-4 py-3.5 font-medium text-[#222]">
              {{ account.org_name || "—" }}
            </td>
        
            <td class="px-4 py-3.5 text-[#555]">
              {{ account.email }}
            </td>
       
            <td class="px-4 py-3.5 font-semibold capitalize text-[#333]">
              {{ account.role }}
            </td>
   
            <td class="px-4 py-3.5 text-center">
              <div class="flex items-center justify-center gap-2">
                <button
                  type="button"
                  @click="toggleArchive(account)"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-[#6b0207] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#520105]"
                >
                  <span>{{ activeTab === "active" ? "Archive" : "Restore" }}</span>
                  <Inbox class="h-3 w-3 shrink-0" />
                </button>
                <button
                  v-if="activeTab === 'archived'"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-50"
                  @click="openDeleteConfirmation(account)"
                >
                  <span>Delete</span>
                  <Trash class="h-3 w-3 shrink-0" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else
      class="mt-8 rounded-xl border border-dashed border-[#ddd] p-12 text-center text-xs text-[#888]"
    >
      No {{ activeTab }} accounts found.
    </div>

    <div
      v-if="pendingDeleteAccount"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="presentation"
      @click.self="closeDeleteConfirmation"
    >
      <section
        class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        <h2 id="delete-account-title" class="text-lg font-bold text-[#1a1a1a]">
          Delete account?
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-[#555]">
          Are you sure you want to permanently delete
          <span class="font-semibold text-[#222]">{{ pendingDeleteAccount.email }}</span>?
          This action cannot be undone.
        </p>

        <p v-if="deleteError" class="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
          {{ deleteError }}
        </p>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            :disabled="isDeletingAccount"
            class="rounded-lg px-4 py-2 text-xs font-semibold text-[#555] transition hover:bg-gray-100 disabled:opacity-50"
            @click="closeDeleteConfirmation"
          >
            No
          </button>
          <button
            type="button"
            :disabled="isDeletingAccount"
            class="rounded-lg bg-[#6b0207] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#520105] disabled:opacity-60"
            @click="deleteAccount"
          >
            {{ isDeletingAccount ? "Deleting..." : "Yes, delete account" }}
          </button>
        </div>
      </section>
    </div>
  </main>
</template>
