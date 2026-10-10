<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { supabase } from "@/lib/supabaseClient";
import { Check } from "@primeicons/vue";

const orgId = ref<number | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const name = ref("");
const category = ref("academic");
const description = ref("");
const fbUrl = ref("");
const logoUrl = ref<string | null>(null);
const isActive = ref(true);

const categories = [
  { value: "academic", label: "Academic" },
  { value: "sports", label: "Sports" },
  { value: "cultural", label: "Cultural" },
  { value: "special_interest", label: "Special Interest" },
  { value: "other", label: "Other" },
];

const acronym = computed(() => {
  if (!name.value) return "ORG";
  return name.value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
});

async function loadOrgProfile() {
  isLoading.value = true;
  errorMessage.value = "";

  const { data: sessionData } = await supabase.auth.getSession();
  const email = sessionData.session?.user?.email;

  if (!email) {
    isLoading.value = false;
    return;
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .ilike("email", email)
    .maybeSingle();

  if (userData?.org_id) {
    orgId.value = userData.org_id;

    const { data: orgData } = await supabase
      .from("orgs")
      .select("org_id, name, category, description, fb_url, logo_url, is_active")
      .eq("org_id", userData.org_id)
      .single();

    if (orgData) {
      name.value = orgData.name || "";
      category.value = orgData.category
        ? orgData.category.toLowerCase().replace(/\s+/g, "_")
        : "academic";
      description.value = orgData.description || "";
      fbUrl.value = orgData.fb_url || "";
      logoUrl.value = orgData.logo_url || null;
      isActive.value = orgData.is_active ?? true;
    }
  }

  isLoading.value = false;
}

async function handleLogoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !orgId.value) return;

  const fileExt = file.name.split(".").pop();
  const filePath = `org-${orgId.value}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("org-logos")
    .upload(filePath, file);

  if (!uploadError) {
    const { data } = supabase.storage.from("org-logos").getPublicUrl(filePath);
    logoUrl.value = data.publicUrl;
  }
}

async function setStatus(active: boolean) {
  isActive.value = active;
  if (!orgId.value) return;
  const { error } = await supabase
    .from("orgs")
    .update({ is_active: active })
    .eq("org_id", orgId.value);
  if (error) {
    errorMessage.value = `Could not update status: ${error.message}`;
  } else {
    successMessage.value = active 
      ? "Organization is now Active and visible!" 
      : "Organization is now Archived and hidden from public view.";
  }
}

async function handleSaveChanges() {
  if (!orgId.value) return;

  if (!name.value.trim()) {
    errorMessage.value = "Organization name is required.";
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  const { error } = await supabase
    .from("orgs")
    .update({
      name: name.value.trim(),
      category: category.value,
      description: description.value.trim() || null,
      fb_url: fbUrl.value.trim() || null,
      logo_url: logoUrl.value,
      is_active: isActive.value,
    })
    .eq("org_id", orgId.value);

  if (error) {
    errorMessage.value = error.message;
  } else {
    successMessage.value = "Organization profile updated successfully!";
  }

  isSaving.value = false;
}

onMounted(() => {
  loadOrgProfile();
});
</script>

<template>
  <main class="flex-1 h-full overflow-y-auto bg-white p-8">

    <div class="flex flex-col justify-between gap-4 border-b border-[#eee] pb-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-3xl font-extrabold text-[#1a1a1a]">Edit Profile</h1>
        <p class="mt-1 text-xs text-[#777]">
          Manage the public profile for {{ name || "your organization" }} using the fields supported by your organization schema.
        </p>
      </div>

      <RouterLink
        v-if="orgId"
        :to="`/org/${orgId}`"
        target="_blank"
        class="inline-flex items-center gap-1.5 rounded-lg border border-[#d5d5d5] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#333] no-underline transition hover:bg-gray-50"
      >
        <span>↗</span> Preview public page
      </RouterLink>
    </div>

    <div v-if="successMessage" class="mt-4 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
      {{ successMessage }}
    </div>
    <div v-if="errorMessage" class="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
      {{ errorMessage }}
    </div>

    <div v-if="isLoading" class="py-12 text-center text-xs text-gray-500">
      Loading organization details...
    </div>

    <form v-else class="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-3" @submit.prevent="handleSaveChanges">

      <div class="space-y-6 lg:col-span-2">

        <div>
          <h2 class="text-sm font-bold text-[#222]">Basic information</h2>
          <label class="mt-2 block text-xs font-semibold text-[#555]">
            Organization name
            <input
              v-model="name"
              type="text"
              required
              class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-4 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
            />
          </label>
        </div>

        <div>
          <h2 class="text-sm font-bold text-[#222]">Category</h2>
          <label class="mt-2 block text-xs font-semibold text-[#555]">
            Category
            <select v-model="category" class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-4 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]">
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </label>
        </div>

        <div>
          <h2 class="text-sm font-bold text-[#222]">About the organization</h2>
          <label class="mt-2 block text-xs font-semibold text-[#555]">
            Description
            <textarea
              v-model="description"
              rows="4"
              class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] p-3 text-xs leading-relaxed text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
            ></textarea>
          </label>
          <p class="mt-1 text-[11px] text-[#888]">
            Tell students what you do, what they can learn, and why they should join.
          </p>
        </div>

        <div>
          <h2 class="text-sm font-bold text-[#222]">Social links</h2>
          <label class="mt-2 block text-xs font-semibold text-[#555]">
            Facebook URL
            <div class="mt-1.5 flex items-center rounded-lg bg-[#f1f1f1] px-3 transition focus-within:bg-white focus-within:ring-1 focus-within:ring-[#6b0207]">
              <span class="text-xs font-bold text-[#666]">f</span>
              <input
                v-model="fbUrl"
                type="text"
                placeholder="facebook.com/your-org"
                class="w-full bg-transparent px-3 py-2.5 text-xs text-[#222] outline-none"
              />
            </div>
          </label>
        </div>

      </div>

      <div class="space-y-6">

        <div class="rounded-xl border border-[#e5e5e5] bg-white p-5 text-center shadow-sm">
          <h2 class="text-xs font-bold text-[#222]">Organization logo</h2>
          
          <div class="mt-4 flex flex-col items-center gap-4">

            <img
              v-if="logoUrl"
              :src="logoUrl"
              alt="Logo preview"
              class="h-32 w-32 rounded-lg border object-cover"
            />
            <div
              v-else
              class="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-xs font-bold text-[#ffca28]"
            >
              {{ acronym }}
            </div>

            <label class="cursor-pointer rounded-lg border border-[#d5d5d5] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#333] transition hover:bg-gray-50">
              <span>⭡ Change logo</span>
              <input type="file" accept="image/*" class="hidden" @change="handleLogoUpload" />
            </label>
          </div>
          <p class="mt-3 text-center text-[10px] text-[#999]">Square JPG or PNG · Max 2 MB</p>
        </div>

        

      </div>

      <div class="border-t border-[#eee] pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 lg:col-span-3">
        <p class="text-[11px] text-[#888]">
          Changes become visible on your public organization page after saving.
        </p>

        <div class="flex items-center gap-3">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-xs font-semibold text-[#555] transition hover:bg-gray-100"
            @click="loadOrgProfile"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSaving"
            class="inline-flex items-center gap-1.5 rounded-lg bg-[#6b0207] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#520105] disabled:opacity-60"
          >
            <Check class="h-3 w-3" />
            <span>{{ isSaving ? "Saving..." : "Save changes" }}</span>
          </button>
        </div>
      </div>

    </form>
  </main>
</template>
