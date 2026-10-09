<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import TopBar from "../Header/components/TopBar.vue";
import FooterSection from "../Footer/FooterSection.vue";

type Organization = {
  org_id: number;
  name: string;
  category: string;
  description: string | null;
  logo_url: string | null;
  fb_url: string | null;
};

type OrganizationPost = {
  post_id: number;
  title: string;
  content: string;
  category: string;
  created_at: string;
  image_url: string | null;
};

const route = useRoute();
const organization = ref<Organization | null>(null);
const posts = ref<OrganizationPost[]>([]);
const isLoading = ref(true);
const errorMessage = ref("");
const showApplicationForm = ref(false);
const isSubmittingApplication = ref(false);
const applicationSuccess = ref(false);
const applicationError = ref("");
const application = ref({
  studentId: "",
  fullName: "",
  email: "",
  fbUrl: "",
  contactNumber: "",
  notes: "",
});

function getAcronym(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

async function loadOrganization() {
  const organizationId = Number(route.params.id);
  const [
    { data: organizationData, error: organizationError },
    { data: postData, error: postError },
    { data: imageData },
  ] = await Promise.all([
    supabase
      .from("orgs")
      .select("org_id, name, category, description, logo_url, fb_url")
      .eq("org_id", organizationId)
      .eq("is_active", true)
      .single(),
    supabase
      .from("posts")
      .select("post_id, title, content, category, created_at")
      .eq("org_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase.from("post_images").select("post_id, img_url"),
  ]);

  if (organizationError || postError) {
    errorMessage.value = (organizationError || postError)?.message || "Unable to load organization.";
    return;
  }

  const imageByPost = new Map(
    (imageData ?? []).map((image) => [image.post_id, image.img_url]),
  );

  organization.value = organizationData;
  posts.value = (postData ?? []).map((post) => ({
    ...post,
    image_url: imageByPost.get(post.post_id) ?? null,
  }));
}

async function submitApplication() {
  if (!organization.value) return;

  isSubmittingApplication.value = true;
  applicationError.value = "";
  applicationSuccess.value = false;

  const { error } = await supabase.from("applications").insert({
    org_id: organization.value.org_id,
    student_id: application.value.studentId,
    full_name: application.value.fullName,
    email: application.value.email,
    fb_url: application.value.fbUrl,
    contact_no: application.value.contactNumber,
    custom_notes: application.value.notes || null,
  });

  if (error) {
    applicationError.value = error.message;
  } else {
    applicationSuccess.value = true;
    application.value = {
      studentId: "",
      fullName: "",
      email: "",
      fbUrl: "",
      contactNumber: "",
      notes: "",
    };
  }

  isSubmittingApplication.value = false;
}

onMounted(async () => {
  try {
    await loadOrganization();
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#1f1f1f]">
    <TopBar :show-search="false" />

    <main class="flex-1 bg-white">
      <p v-if="isLoading" class="p-12 text-center text-sm text-[#777]">Loading organization...</p>
      <p v-else-if="errorMessage" class="p-12 text-center text-sm text-red-700">{{ errorMessage }}</p>

      <template v-else-if="organization">
        <section class="flex w-full flex-col items-center bg-[#6b0207] px-5 py-6 text-white sm:py-8">
          <div class="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div class="flex flex-col items-center gap-3 text-center">
              <img
                v-if="organization.logo_url"
                class="size-20 max-h-20 max-w-20 shrink-0 rounded-lg border-2 border-white object-contain"
                :src="organization.logo_url"
                @error="organization.logo_url = null"
                :alt="`${organization.name} logo`"
              />
              <div v-else class="flex size-10 max-h-10 max-w-10 shrink-0 items-center justify-center rounded-lg border-2 border-white bg-[#1d1d1d] text-sm font-bold text-[#ffca28]">
                {{ getAcronym(organization.name) }}
              </div>
              <div class="text-center">
                <h1 class="text-xl font-bold">{{ organization.name }}</h1>
                <p class="mt-1 text-[0.65rem] font-semibold uppercase text-white/80">{{ organization.category }}</p>
              </div>
            </div>
            <p class="mt-4 max-w-xl text-xs leading-relaxed text-white/85">{{ organization.description }}</p>
            <a
              v-if="organization.fb_url"
              class="mt-4 rounded bg-[#ffb31a] px-5 py-2 text-[0.65rem] font-bold text-[#3b2300] no-underline transition hover:bg-[#ffc64e]"
              :href="organization.fb_url"
              target="_blank"
              rel="noreferrer"
            >
              Visit Page
            </a>
            <button
              class="mt-3 rounded bg-[#ffb31a] px-5 py-2 text-[0.65rem] font-bold text-[#3b2300] transition hover:bg-[#ffc64e]"
              type="button"
              @click="showApplicationForm = !showApplicationForm"
            >
              {{ showApplicationForm ? "Close Application" : "Join Organization" }}
            </button>
          </div>
        </section>

        <section v-if="showApplicationForm" class="bg-[#888] px-5 py-6">
          <form class="mx-auto max-w-3xl rounded-2xl bg-[#f8f5ef] p-5 sm:p-7" @submit.prevent="submitApplication">
            <div class="mb-5">
              <h2 class="text-lg font-bold text-[#292929]">Application form</h2>
              <p class="mt-1 text-xs text-[#777]">Apply to join {{ organization.name }}.</p>
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
              <label class="text-xs font-semibold text-[#292929]">
                Student ID <span class="text-[#8f0c12]">Required</span>
                <input v-model="application.studentId" class="mt-2 w-full rounded border border-[#d8d8d8] bg-white px-3 py-2 text-sm font-normal outline-0 focus:border-[#8f0c12]" required type="text" />
              </label>
              <label class="text-xs font-semibold text-[#292929]">
                Full name <span class="text-[#8f0c12]">Required</span>
                <input v-model="application.fullName" class="mt-2 w-full rounded border border-[#d8d8d8] bg-white px-3 py-2 text-sm font-normal outline-0 focus:border-[#8f0c12]" required type="text" />
              </label>
              <label class="text-xs font-semibold text-[#292929] sm:col-span-2">
                University email <span class="text-[#8f0c12]">Required</span>
                <input v-model="application.email" class="mt-2 w-full rounded border border-[#d8d8d8] bg-white px-3 py-2 text-sm font-normal outline-0 focus:border-[#8f0c12]" required type="email" />
              </label>
              <label class="text-xs font-semibold text-[#292929]">
                Facebook profile URL <span class="text-[#8f0c12]">Required</span>
                <input v-model="application.fbUrl" class="mt-2 w-full rounded border border-[#d8d8d8] bg-white px-3 py-2 text-sm font-normal outline-0 focus:border-[#8f0c12]" required type="url" />
              </label>
              <label class="text-xs font-semibold text-[#292929]">
                Contact number <span class="text-[#8f0c12]">Required</span>
                <input v-model="application.contactNumber" class="mt-2 w-full rounded border border-[#d8d8d8] bg-white px-3 py-2 text-sm font-normal outline-0 focus:border-[#8f0c12]" required type="tel" />
              </label>
              <label class="text-xs font-semibold text-[#292929] sm:col-span-2">
                Optional notes
                <textarea v-model="application.notes" class="mt-2 min-h-28 w-full resize-y rounded border border-[#d8d8d8] bg-white px-3 py-2 text-sm font-normal outline-0 focus:border-[#8f0c12]" maxlength="500"></textarea>
              </label>
            </div>

            <p v-if="applicationError" class="mt-4 text-xs text-red-700">{{ applicationError }}</p>
            <p v-if="applicationSuccess" class="mt-4 text-xs font-semibold text-emerald-700">Application submitted successfully.</p>

            <div class="mt-5 flex justify-end">
              <button class="rounded-full bg-[#8f0c12] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#6f080d] disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSubmittingApplication" type="submit">
                {{ isSubmittingApplication ? "Submitting..." : "Submit application →" }}
              </button>
            </div>
          </form>
        </section>

        <section class="mx-auto max-w-3xl px-5 py-5">
          <div class="mb-3 rounded-lg border border-[#e4e4e4] px-3 py-2 text-xs font-semibold text-[#333]">
            Posts
          </div>
          <div v-if="posts.length" class="space-y-4">
            <article v-for="post in posts" :key="post.post_id" class="overflow-hidden rounded-lg border border-[#e4e4e4] bg-white">
              <img
                v-if="post.image_url"
                class="h-28 w-full object-cover sm:h-40"
                :src="post.image_url"
                :alt="post.title"
              />
              <div v-else class="h-28 bg-[#e9e9e9] sm:h-40"></div>
              <div class="p-4">
                <p class="text-[0.6rem] font-semibold uppercase text-[#8f0c12]">{{ formatDate(post.created_at) }} · {{ post.category }}</p>
                <h2 class="mt-2 text-sm font-bold text-[#292929]">{{ post.title }}</h2>
                <p class="mt-2 text-xs leading-relaxed text-[#666]">{{ post.content }}</p>
                <button class="mt-3 text-[0.65rem] font-bold text-[#8f0c12]" type="button">Read full story →</button>
              </div>
            </article>
          </div>
          <p v-else class="rounded-lg border border-dashed border-[#d8d8d8] p-8 text-center text-sm text-[#777]">No posts yet.</p>
        </section>
      </template>
    </main>

    <FooterSection />
  </div>
</template>