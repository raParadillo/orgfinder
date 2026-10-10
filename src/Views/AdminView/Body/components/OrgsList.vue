<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import { Pencil, Search, Times } from "@primeicons/vue";

type Org = {
  org_id: number;
  name: string;
  description: string;
  category: string;
  fb_url: string | null;
  is_active: boolean;
  logo_url: string | null;
  members_count?: number;
};

const organizations = ref<Org[]>([]);
const activeTab = ref<"active" | "archived">("active");
const searchQuery = ref("");
const isLoading = ref(true);
const router = useRouter();
const showEditDrawer = ref(false);
const editingOrg = ref<Org | null>(null);
const isSaving = ref(false);
const editError = ref("");
const orgToDelete = ref<Org | null>(null);
const isDeleting = ref(false);
const deleteError = ref("");
const editForm = ref({
  name: "",
  category: "",
  description: "",
  fbUrl: "",
  logoUrl: "",
});
const logoFile = ref<File | null>(null);
const logoPreview = ref("");

const categories = [
  { value: "academic", label: "Academic" },
  { value: "sports", label: "Sports" },
  { value: "cultural", label: "Cultural" },
  { value: "special_interest", label: "Special Interest" },
  { value: "other", label: "Other" },
];

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
      .select("org_id, name, description, category, fb_url, is_active, logo_url")
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

function openDeleteConfirmation(org: Org) {
  deleteError.value = "";
  orgToDelete.value = org;
}

function closeDeleteConfirmation() {
  if (!isDeleting.value) orgToDelete.value = null;
}

async function deleteOrganization() {
  const org = orgToDelete.value;
  if (!org) return;

  isDeleting.value = true;
  deleteError.value = "";

  if (org.logo_url) {
    let logoPath = "";
    try {
      const logoUrl = new URL(org.logo_url);
      const bucketMarkers = [
        "/storage/v1/object/public/org-logos/",
        "/storage/v1/object/sign/org-logos/",
        "/org-logos/",
      ];
      const bucketMarker = bucketMarkers.find((marker) =>
        logoUrl.pathname.includes(marker),
      );
      if (bucketMarker) {
        logoPath = decodeURIComponent(
          logoUrl.pathname.slice(logoUrl.pathname.indexOf(bucketMarker) + bucketMarker.length),
        );
      }
    } catch {
      deleteError.value = "The organization logo URL is invalid.";
      isDeleting.value = false;
      return;
    }

    if (!logoPath) {
      deleteError.value = "Could not determine the organization logo storage path.";
      isDeleting.value = false;
      return;
    }

    const lastSlash = logoPath.lastIndexOf("/");
    const logoFolder = lastSlash === -1 ? "" : logoPath.slice(0, lastSlash);
    const logoName = lastSlash === -1 ? logoPath : logoPath.slice(lastSlash + 1);
    const { error: logoDeleteError } = await supabase.storage
      .from("org-logos")
      .remove([logoPath]);

    if (logoDeleteError) {
      deleteError.value = `Could not delete the organization logo: ${logoDeleteError.message}`;
      isDeleting.value = false;
      return;
    }

    const { data: remainingFiles, error: verifyError } = await supabase.storage
      .from("org-logos")
      .list(logoFolder, { search: logoName, limit: 10 });

    if (verifyError) {
      deleteError.value = `Logo deletion could not be verified: ${verifyError.message}`;
      isDeleting.value = false;
      return;
    }

    if (remainingFiles?.some((file) => file.name === logoName)) {
      deleteError.value =
        "Supabase did not remove the logo. Run the storage DELETE policy migration, then try again.";
      isDeleting.value = false;
      return;
    }
  }

  const { error } = await supabase
    .from("orgs")
    .delete()
    .eq("org_id", org.org_id);

  if (error) {
    deleteError.value = error.message || "Unable to delete the organization.";
    isDeleting.value = false;
    return;
  }

  organizations.value = organizations.value.filter(
    (organization) => organization.org_id !== org.org_id,
  );
  orgToDelete.value = null;
  isDeleting.value = false;
}

function viewOrg(orgId: number) {
  router.push(`/org/${orgId}`);
}

function openEditDrawer(org: Org) {
  editingOrg.value = org;
  editForm.value = {
    name: org.name,
    category: org.category || "",
    description: org.description || "",
    fbUrl: org.fb_url || "",
    logoUrl: org.logo_url || "",
  };
  logoFile.value = null;
  logoPreview.value = org.logo_url || "";
  editError.value = "";
  showEditDrawer.value = true;
}

function closeEditDrawer() {
  if (!isSaving.value) showEditDrawer.value = false;
}

async function saveOrganization() {
  const org = editingOrg.value;
  if (!org) return;

  if (!editForm.value.name.trim()) {
    editError.value = "Organization name is required.";
    return;
  }

  isSaving.value = true;
  editError.value = "";
  let uploadedLogoPath = "";
  let logoUrl = editForm.value.logoUrl.trim() || null;

  if (logoFile.value) {
    const fileExtension = logoFile.value.name.split(".").pop()?.toLowerCase() || "jpg";
    uploadedLogoPath = `org-${org.org_id}-${Date.now()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("org-logos")
      .upload(uploadedLogoPath, logoFile.value);

    if (uploadError) {
      editError.value = uploadError.message || "Unable to upload the organization photo.";
      isSaving.value = false;
      return;
    }

    const { data: publicLogo } = supabase.storage
      .from("org-logos")
      .getPublicUrl(uploadedLogoPath);
    logoUrl = publicLogo.publicUrl;
  }

  const updates = {
    name: editForm.value.name.trim(),
    category: editForm.value.category || null,
    description: editForm.value.description.trim() || null,
    fb_url: editForm.value.fbUrl.trim() || null,
    logo_url: logoUrl,
  };

  const { error } = await supabase
    .from("orgs")
    .update(updates)
    .eq("org_id", org.org_id);

  if (error) {
    if (uploadedLogoPath) {
      await supabase.storage.from("org-logos").remove([uploadedLogoPath]);
    }
    editError.value = error.message || "Unable to save organization details.";
    isSaving.value = false;
    return;
  }

  Object.assign(org, updates);
  showEditDrawer.value = false;
  isSaving.value = false;
}

function handleLogoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  editError.value = "";
  if (!file.type.startsWith("image/")) {
    editError.value = "Please select an image file.";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    editError.value = "The organization photo must be 2 MB or smaller.";
    return;
  }

  logoFile.value = file;
  logoPreview.value = URL.createObjectURL(file);
}

function clearLogo() {
  logoFile.value = null;
  logoPreview.value = "";
  editForm.value.logoUrl = "";
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
          <div class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2">
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
            <button
              type="button"
              :aria-label="`Edit ${org.name}`"
              class="shrink-0 rounded p-1 text-[#888] transition hover:bg-[#f3f3f3] hover:text-[#6b0207]"
              @click="openEditDrawer(org)"
            >
              <Pencil class="h-3.5 w-3.5" />
            </button>
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
            v-if="org.is_active"
            @click="viewOrg(org.org_id)"
            class="flex-1 rounded bg-[#f3f3f3] py-1.5 text-center text-[0.65rem] font-semibold text-[#444] transition hover:bg-[#e6e6e6]"
          >
            View
          </button>
          <button
            v-else
            type="button"
            @click="openDeleteConfirmation(org)"
            class="flex-1 rounded bg-red-50 py-1.5 text-center text-[0.65rem] font-semibold text-red-700 transition hover:bg-red-100"
          >
            Delete
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

    <div
      v-if="orgToDelete"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      role="presentation"
      @click.self="closeDeleteConfirmation"
    >
      <div
        class="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-organization-title"
      >
        <h2 id="delete-organization-title" class="text-base font-bold text-[#222]">
          Delete organization?
        </h2>
        <p class="mt-2 text-xs leading-relaxed text-[#666]">
          This permanently deletes
          <strong class="text-[#222]">{{ orgToDelete.name }}</strong>.
          This action cannot be undone.
        </p>
        <p v-if="deleteError" class="mt-3 text-xs font-semibold text-red-700">
          {{ deleteError }}
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            :disabled="isDeleting"
            class="rounded-lg border border-[#ddd] px-4 py-2 text-xs font-semibold text-[#555] hover:bg-[#f5f5f5] disabled:opacity-50"
            @click="closeDeleteConfirmation"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isDeleting"
            class="rounded-lg bg-[#8f0c12] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6f080d] disabled:cursor-not-allowed disabled:opacity-60"
            @click="deleteOrganization"
          >
            {{ isDeleting ? "Deleting..." : "Delete organization" }}
          </button>
        </div>
      </div>
    </div>

    <Transition name="drawer">
      <aside
        v-if="showEditDrawer"
        class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
        aria-label="Edit organization"
      >
        <div class="flex items-center justify-between border-b border-[#eee] px-6 py-5">
          <div>
            <h2 class="text-base font-bold text-[#222]">Edit organization</h2>
            <p class="mt-1 text-xs text-[#777]">Update the public organization details.</p>
          </div>
          <button
            type="button"
            aria-label="Close edit organization form"
            :disabled="isSaving"
            class="rounded-lg p-2 text-[#777] transition hover:bg-gray-100 hover:text-[#222] disabled:opacity-50"
            @click="closeEditDrawer"
          >
            <Times class="h-4 w-4" />
          </button>
        </div>

        <form class="flex-1 overflow-y-auto px-6 py-6" @submit.prevent="saveOrganization">
          <div class="space-y-4">
            <label class="block text-xs font-semibold text-[#555]">
              Organization name <span class="text-[#6b0207]">*</span>
              <input
                v-model="editForm.name"
                type="text"
                required
                class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
              />
            </label>

            <label class="block text-xs font-semibold text-[#555]">
              Category
              <select
                v-model="editForm.category"
                class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
              >
                <option value="">No category</option>
                <option v-for="category in categories" :key="category.value" :value="category.value">
                  {{ category.label }}
                </option>
              </select>
            </label>

            <label class="block text-xs font-semibold text-[#555]">
              Description
              <textarea
                v-model="editForm.description"
                rows="5"
                class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] p-3 text-xs leading-relaxed text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
              ></textarea>
            </label>

            <label class="block text-xs font-semibold text-[#555]">
              Facebook URL
              <input
                v-model="editForm.fbUrl"
                type="url"
                placeholder="https://facebook.com/your-organization"
                class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
              />
            </label>

            <div>
              <label class="block text-xs font-semibold text-[#555]">Organization photo</label>
              <div class="mt-1.5 rounded-lg border border-dashed border-[#d5d5d5] p-3">
                <div v-if="logoPreview" class="mb-3 flex items-center gap-3">
                  <img
                    :src="logoPreview"
                    alt="Organization logo preview"
                    class="h-16 w-16 rounded-lg border object-cover"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-semibold text-[#333]">
                      {{ logoFile ? logoFile.name : "Current organization photo" }}
                    </p>
                    <button
                      type="button"
                      class="mt-1 text-[11px] font-semibold text-[#6b0207] hover:underline"
                      @click="clearLogo"
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
                <label class="inline-flex cursor-pointer items-center rounded-lg border border-[#d5d5d5] bg-white px-3.5 py-2 text-xs font-semibold text-[#333] transition hover:bg-gray-50">
                  <span>{{ logoPreview ? "Change photo" : "Upload photo" }}</span>
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleLogoUpload"
                  />
                </label>
                <p class="mt-2 text-[10px] text-[#999]">JPG or PNG · Max 2 MB</p>
              </div>
            </div>
          </div>

          <p v-if="editError" class="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
            {{ editError }}
          </p>

          <div class="mt-8 flex items-center justify-end gap-3 border-t border-[#eee] pt-4">
            <button
              type="button"
              :disabled="isSaving"
              class="rounded-lg px-4 py-2 text-xs font-semibold text-[#555] transition hover:bg-gray-100 disabled:opacity-50"
              @click="closeEditDrawer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="rounded-lg bg-[#6b0207] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#520105] disabled:opacity-60"
            >
              {{ isSaving ? "Saving..." : "Save changes" }}
            </button>
          </div>
        </form>
      </aside>
    </Transition>
    <div
      v-if="showEditDrawer"
      class="fixed inset-0 z-40 bg-black/30"
      @click="closeEditDrawer"
    ></div>
  </main>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
