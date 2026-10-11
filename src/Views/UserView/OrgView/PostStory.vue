<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import TopBar from "../Header/components/TopBar.vue";
import FooterSection from "../Footer/FooterSection.vue";

type Organization = {
  org_id: number;
  name: string;
  logo_url: string | null;
};

type Post = {
  post_id: number;
  title: string;
  content: string;
  category: string | null;
  created_at: string;
  image_url: string | null;
};

const route = useRoute();
const organization = ref<Organization | null>(null);
const post = ref<Post | null>(null);
const isLoading = ref(true);
const errorMessage = ref("");

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

async function loadPost() {
  const organizationId = Number(route.params.id);
  const postId = Number(route.params.postId);
  const [
    { data: organizationData, error: organizationError },
    { data: postData, error: postError },
    { data: imageData },
  ] = await Promise.all([
    supabase
      .from("orgs")
      .select("org_id, name, logo_url")
      .eq("org_id", organizationId)
      .eq("is_active", true)
      .single(),
    supabase
      .from("posts")
      .select("post_id, title, content, category, created_at")
      .eq("post_id", postId)
      .eq("org_id", organizationId)
      .single(),
    supabase.from("post_images").select("post_id, img_url").eq("post_id", postId).maybeSingle(),
  ]);

  if (organizationError || postError) {
    errorMessage.value = (organizationError || postError)?.message || "Unable to load this story.";
    return;
  }

  organization.value = organizationData;
  post.value = {
    ...postData,
    image_url: imageData?.img_url ?? null,
  };
}

onMounted(async () => {
  try {
    await loadPost();
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#1f1f1f]">
    <TopBar :show-search="false" />
    <main class="flex-1 bg-white">
      <p v-if="isLoading" class="p-12 text-center text-sm text-[#777]">Loading story...</p>
      <p v-else-if="errorMessage" class="p-12 text-center text-sm text-red-700">{{ errorMessage }}</p>

      <article v-else-if="post && organization" class="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        <RouterLink
          :to="`/org/${organization.org_id}`"
          class="text-xs font-semibold text-[#8f0c12] no-underline hover:underline"
        >
          ← Back to {{ organization.name }}
        </RouterLink>
        <p class="mt-8 text-[0.65rem] font-semibold uppercase tracking-wide text-[#8f0c12]">
          {{ formatDate(post.created_at) }} · {{ post.category || "Announcement" }}
        </p>
        <h1 class="mt-3 text-3xl font-extrabold leading-tight text-[#292929] sm:text-4xl">
          {{ post.title }}
        </h1>
        <img
          v-if="post.image_url"
          :src="post.image_url"
          :alt="post.title"
          class="mt-7 max-h-[28rem] w-full rounded-xl object-cover"
        />
        <div class="mt-7 whitespace-pre-line text-sm leading-7 text-[#555]">
          {{ post.content }}
        </div>
      </article>
    </main>
    <FooterSection />
  </div>
</template>
