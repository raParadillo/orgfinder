<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import { Search } from "@primeicons/vue";

type Org = {
  org_id: number;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  logo_url: string | null;
  members_count?: number;
};

const organizations = ref<Org[]>([]);
const activeTab = ref<"active" | "archived">("active");
const searchQuery = ref("");
const isLoading = ref(true);
const router = useRouter();

function getAcronym(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

async function loadOrganizations() {
  isLoading.value = true;

  const [{ data: orgRows }, { data: countRows }] = await Promise.all([
    supabase
      .from("orgs")
      .select("org_id, name, description, category, is_active, logo_url")
      .order("name"),
    supabase.from("org_member_counts").select("org_id, member_count"),
  ]);

  const countMap = new Map((countRows ?? []).map((row) => [row.org_id, row.member_count]));

  if (orgRows) {
    organizations.value = orgRows.map((org) => ({
      ...org,
      members_count: countMap.get(org.org_id) ?? 0,
    }));
  }

  isLoading.value = false;
}

const filteredOrganizations = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  const showActive = activeTab.value === "active";

  return organizations.value.filter((org) => {
    const matchesTab = (org.is_active ?? true) === showActive;
    const matchesSearch =
      !query ||
      org.name.toLowerCase().includes(query) ||
      (org.description && org.description.toLowerCase().includes(query));

    return matchesTab && matchesSearch;
  });
});

async function toggleArchive(org: Org) {
  const newStatus = !org.is_active;
  const { error } = await supabase
    .from("orgs")
    .update({ is_active: newStatus })
    .eq("org_id", org.org_id);

  if (error) {
    console.error("Could not update organization status:", error.message);
    return;
  }
  org.is_active = newStatus;
}

function viewOrg(orgId: number) {
  router.push(`/org/${orgId}`);
}

onMounted(() => {
  loadOrganizations();
});
</script>

<template>
  <main class="flex-1 h-full overflow-y-auto bg-white p-8">
    <h1 class="text-3xl font-extrabold text-[#1a1a1a]">Lists of Organizations</h1>

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
        <Search class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search"
          class="w-full rounded-full bg-[#f1f1f1] py-1.5 pl-8 pr-4 text-xs text-[#222] outline-none focus:ring-1 focus:ring-[#6b0207]"
        />
      </div>
    </div>

    <div class="mt-4 text-xs font-semibold text-[#555]">
      {{ filteredOrganizations.length }} Results
    </div>

    <div v-if="isLoading" class="py-12 text-center text-xs text-gray-500">
      Loading organizations...
    </div>

    <!-- Organizations Grid -->
    <div
      v-else-if="filteredOrganizations.length"
      class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      <article
        v-for="org in filteredOrganizations"
        :key="org.org_id"
        class="flex flex-col justify-between rounded-xl border border-[#e5e5e5] bg-white p-3.5 shadow-sm transition hover:shadow-md"
      >
        <div>
          <div class="flex items-center gap-2">
            <img
              v-if="org.logo_url"
              :src="org.logo_url"
              @error="org.logo_url = null"
              :alt="`${org.name} logo`"
              class="h-8 w-8 rounded object-cover"
            />
            <span
              v-else
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#1d1d1d] text-[0.6rem] font-bold text-[#ffca28]"
            >
              {{ getAcronym(org.name) }}
            </span>
            <h2 class="text-xs font-bold leading-tight text-[#222] line-clamp-1">
              {{ org.name }}
            </h2>
          </div>

          <p class="mt-2 text-[0.65rem] leading-relaxed text-[#777] line-clamp-2">
            {{ org.description || "No description provided." }}
          </p>

          <div class="mt-2 flex items-center gap-1.5 text-[0.65rem] font-semibold text-emerald-600">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>{{ org.members_count }} members</span>
          </div>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <button
            type="button"
            @click="viewOrg(org.org_id)"
            class="flex-1 rounded bg-[#f3f3f3] py-1.5 text-center text-[0.65rem] font-semibold text-[#444] transition hover:bg-[#e6e6e6]"
          >
            View
          </button>
          <button
            type="button"
            @click="toggleArchive(org)"
            class="flex-1 rounded bg-[#6b0207] py-1.5 text-center text-[0.65rem] font-semibold text-white transition hover:bg-[#520105]"
          >
            {{ activeTab === "active" ? "Archive" : "Restore" }}
          </button>
        </div>
      </article>
    </div>

    <div
      v-else
      class="mt-8 rounded-xl border border-dashed border-[#ddd] p-12 text-center text-xs text-[#888]"
    >
      No {{ activeTab }} organizations found.
    </div>
  </main>
</template>
