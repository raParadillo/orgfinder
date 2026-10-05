<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import CategoryList from "./components/CategoryList.vue";
import OrgsList from "./components/OrgsList.vue";

type Organization = {
  id: string;
  acronym: string;
  name: string;
  description: string;
  category: string;
  logo_url: string | null;
  members: number;
};

const props = defineProps<{
  searchQuery: string;
}>();

const organizations = ref<Organization[]>([]);
const isLoading = ref(true);
const errorMessage = ref("");
const selectedCategory = ref("ALL");
const router = useRouter();

function getAcronym(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function openOrganization(organization: Organization) {
  router.push(`/org/${organization.id}`);
}

const filteredOrganizations = computed(() => {
  const query = props.searchQuery.toLowerCase().trim();
  const category = normalize(selectedCategory.value);

  return organizations.value.filter((organization) => {
    const matchesSearch = !query || [organization.name, organization.description, organization.category]
      .join(" ")
      .toLowerCase()
      .includes(query);
    const matchesCategory = selectedCategory.value === "ALL"
      || normalize(organization.category) === category;

    return matchesSearch && matchesCategory;
  });
});

const listTitle = computed(() => {
  if (props.searchQuery) return `Search Results: ${props.searchQuery}`;
  if (selectedCategory.value !== "ALL") return `${selectedCategory.value} Organizations`;
  return "Explore Guilds";
});

async function loadOrganizations() {
  const [{ data: organizationRows, error: organizationError }, { data: countRows, error: countError }] = await Promise.all([
    supabase
      .from("orgs")
      .select("org_id, name, category, description, is_active")
        .select("org_id, name, category, description, logo_url, is_active")
      .eq("is_active", true)
      .order("name"),
    supabase.from("org_member_counts").select("org_id, member_count"),
  ]);

  if (organizationError || countError) {
    errorMessage.value = (organizationError || countError)?.message || "Unable to load organizations.";
    return;
  }

  const memberCounts = new Map(
    (countRows ?? []).map((row) => [String(row.org_id), row.member_count]),
  );

  organizations.value = (organizationRows ?? []).map((organization) => ({
    id: String(organization.org_id),
    acronym: getAcronym(organization.name),
    name: organization.name,
    category: organization.category,
    description: organization.description || "No description available.",
    logo_url: organization.logo_url,
    members: memberCounts.get(String(organization.org_id)) ?? 0,
  }));
}

onMounted(async () => {
  try {
    await loadOrganizations();
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <section class="flex flex-col items-center gap-5 bg-white px-5 py-5" aria-labelledby="organization-list-title">
    <CategoryList @select="selectedCategory = $event" />
    <p v-if="isLoading" class="text-sm text-[#777]">Loading organizations...</p>
    <p v-else-if="errorMessage" class="text-sm text-red-700">{{ errorMessage }}</p>
    <OrgsList v-else class="mt-5" :title="listTitle" :organizations="filteredOrganizations" @view="openOrganization" />
  </section>
</template>
