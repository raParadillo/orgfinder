<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import { Check } from "@primeicons/vue";

const router = useRouter();
const isSubmitting = ref(false);
const errorMessage = ref("");

const name = ref("");
const category = ref("");
const description = ref("");
const fbUrl = ref("");
const logoFile = ref<File | null>(null);
const logoPreview = ref<string | null>(null);
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

function handleLogoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  errorMessage.value = "";

  if (!file.type.startsWith("image/")) {
    errorMessage.value = "Please choose an image file.";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    errorMessage.value = "The organization logo must be 2 MB or smaller.";
    return;
  }

  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value);
  logoFile.value = file;
  logoPreview.value = URL.createObjectURL(file);
}

// Submit Form to Supabase
async function handleCreateOrg() {
  if (!name.value.trim()) {
    errorMessage.value = "Organization name is required.";
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = "";

  let uploadedLogoPath = "";
  let logoUrl: string | null = null;

  if (logoFile.value) {
    const fileExtension = logoFile.value.name.split(".").pop()?.toLowerCase() || "jpg";
    uploadedLogoPath = `org-${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("org-logos")
      .upload(uploadedLogoPath, logoFile.value);

    if (uploadError) {
      errorMessage.value = uploadError.message || "Unable to upload the organization logo.";
      isSubmitting.value = false;
      return;
    }

    const { data: publicLogo } = supabase.storage
      .from("org-logos")
      .getPublicUrl(uploadedLogoPath);
    logoUrl = publicLogo.publicUrl;
  }

  const { error } = await supabase.from("orgs").insert({
    name: name.value.trim(),
    category: category.value || null,
    description: description.value.trim() || null,
    fb_url: fbUrl.value.trim() || null,
    logo_url: logoUrl,
    is_active: isActive.value,
  });

  if (error) {
    if (uploadedLogoPath) {
      await supabase.storage.from("org-logos").remove([uploadedLogoPath]);
    }
    errorMessage.value = error.message;
    isSubmitting.value = false;
  } else {
  
    await router.push("/admin");
  }
}

function handleCancel() {
  router.push("/admin");
}
</script>

<template>
  <main class="flex-1 bg-white p-8 overflow-y-auto">
 
    <div class="border-b border-[#eee] pb-4">
      <h1 class="text-3xl font-extrabold text-[#1a1a1a]">Create Organization</h1>
      <p class="mt-1 text-xs text-[#777]">
        Fill in the public profile details supported by your organization schema.
      </p>
    </div>

 
    <div v-if="errorMessage" class="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
      {{ errorMessage }}
    </div>


    <form class="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-3" @submit.prevent="handleCreateOrg">

      <div class="space-y-6 lg:col-span-2">
  <div>
    <h2 class="text-sm font-bold text-[#222]">Basic information</h2>
    <label class="mt-2 block text-xs font-semibold text-[#555]">
      Organization name
      <input
        v-model="name"
        type="text"
        placeholder="e.g. Collegiate Film & Photo"
        required
        class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-4 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
      />
    </label>
  </div>

  <div>
    <h2 class="text-sm font-bold text-[#222]">Category</h2>
    <label class="mt-2 block text-xs font-semibold text-[#555]">
      Category
      <select
        v-model="category"
        class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-4 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
      >
        <option value="">No category</option>
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
        placeholder="A community of student filmmakers and photographers..."
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

        <div class="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
          <h2 class="text-xs font-bold text-[#222]">Organization logo</h2>
          
          <div class="mt-4 flex items-center gap-4">

            <img
              v-if="logoPreview"
              :src="logoPreview"
              alt="Org logo preview"
              class="h-14 w-14 rounded-lg object-cover border"
            />
            <div
              v-else
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-xs font-bold text-[#ffca28]"
            >
              {{ acronym }}
            </div>

            <label class="cursor-pointer rounded-lg border border-[#d5d5d5] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#333] transition hover:bg-gray-50">
              <span>⭡ Upload Photo</span>
              <input type="file" accept="image/*" class="hidden" @change="handleLogoUpload" />
            </label>
          </div>
          <p class="mt-3 text-[10px] text-[#999]">Square JPG or PNG · Max 2 MB</p>
        </div>


        <div class="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
          <h2 class="text-xs font-bold text-[#222]">Organization status</h2>
          
          <div class="mt-3 grid grid-cols-2 gap-2">

            <button
              type="button"
              class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition"
              :class="isActive ? 'border-[#6b0207] bg-rose-50 text-[#6b0207]' : 'border-[#e0e0e0] text-[#777] hover:bg-gray-50'"
              @click="isActive = true"
            >
              <Check v-if="isActive" class="h-3 w-3 text-[#6b0207]" />
              <span v-else class="h-2 w-2 rounded-full border border-gray-400"></span>
              <span>Active</span>
            </button>

            <button
              type="button"
              class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition"
              :class="!isActive ? 'border-[#6b0207] bg-rose-50 text-[#6b0207]' : 'border-[#e0e0e0] text-[#777] hover:bg-gray-50'"
              @click="isActive = false"
            >
              <Check v-if="!isActive" class="h-3 w-3 text-[#6b0207]" />
              <span v-else class="h-2 w-2 rounded-full border border-gray-400"></span>
              <span>Archived</span>
            </button>
          </div>

          <p class="mt-3 text-[10px] leading-relaxed text-[#888]">
            Active organizations appear in the public directory. Archiving hides your page and pauses new applications.
          </p>
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
            @click="handleCancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="rounded-lg bg-[#6b0207] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#520105] disabled:opacity-60"
          >
            {{ isSubmitting ? "Creating..." : "Create Organization" }}
          </button>
        </div>
      </div>

    </form>
  </main>
</template>
