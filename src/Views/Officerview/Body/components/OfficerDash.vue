<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import { Users, Inbox, FileEdit, File, ArrowRight } from "@primeicons/vue";

type Org = {
  org_id: number;
  name: string;
  category: string;
  logo_url: string | null;
  is_active: boolean;
};

type PostItem = {
  post_id: number;
  title: string;
  category: string;
  created_at: string;
};

type ApplicationItem = {
  application_id: number;
  full_name: string;
  email: string;
  created_at: string;
};

const router = useRouter();
const isLoading = ref(true);

const org = ref<Org | null>(null);
const memberCount = ref(0);
const pendingCount = ref(0);
const totalPostsCount = ref(0);
const recentPosts = ref<PostItem[]>([]);
const recentApplications = ref<ApplicationItem[]>([]);

const acronym = computed(() => {
  if (!org.value?.name) return "ORG";
  return org.value.name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
});

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

async function loadOfficerDashboard() {
  isLoading.value = true;

  const { data: sessionData } = await supabase.auth.getSession();
  const email = sessionData.session?.user.email;

  if (!email) {
    console.warn("No active session found.");
    isLoading.value = false;
    return;
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .ilike("email", email)
    .maybeSingle();

  const orgId = userData?.org_id;

  if (orgId) {

    const [
      { data: orgData },
      { data: memberRows },
      { data: postsData },
      { data: appData },
    ] = await Promise.all([
      supabase.from("orgs").select("org_id, name, category, logo_url, is_active").eq("org_id", orgId).single(),
      supabase.from("org_member_counts").select("member_count").eq("org_id", orgId).maybeSingle(),
      supabase.from("posts").select("post_id, title, category, created_at").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("applications").select("application_id, full_name, email, created_at").eq("org_id", orgId).eq("status", "pending").order("created_at", { ascending: false }),    ]);

    if (orgData) org.value = orgData;
    memberCount.value = memberRows?.member_count ?? 0;
    totalPostsCount.value = postsData?.length ?? 0;
    recentPosts.value = (postsData ?? []).slice(0, 4);

    pendingCount.value = appData?.length ?? 0;
    recentApplications.value = (appData ?? []).slice(0, 3);
  }

  isLoading.value = false;
}

onMounted(() => {
  loadOfficerDashboard();
});
</script>

<template>
  <main class="flex-1 h-full overflow-y-auto bg-white p-8">
    
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-3xl font-extrabold text-[#1a1a1a]">Dashboard</h1>
        <p class="mt-1 text-xs text-[#777]">
          Monitor active members, pending applications, and total posts for your organization.
        </p>
      </div>

      <RouterLink
        to="/officer/posts"
        class="inline-flex items-center gap-2 rounded-lg bg-[#6b0207] px-4 py-2 text-xs font-bold text-white no-underline transition hover:bg-[#520105]"
      >
        <span>+</span> Create a post
      </RouterLink>
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4">
      <div class="flex items-center gap-3">
        <img
          v-if="org?.logo_url"
          :src="org.logo_url"
          @error="org.logo_url = null"
          alt="Org Logo"
          class="h-11 w-11 rounded-lg object-cover border"
        />
        <div
          v-else
          class="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1a1a1a] text-xs font-bold text-[#ffca28]"
        >
          {{ acronym }}
        </div>
        <div>
          <h2 class="text-sm font-bold text-[#1a1a1a]">{{ org?.name || "Your Organization" }}</h2>
          <p class="text-[11px] text-[#777]">{{ org?.category || "Category" }} · Liceo De Cagayan University</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
          Active
        </span>
        
      </div>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

      <div class="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between text-[#888]">
          <p class="text-xs font-medium">Active members</p>
          <Users class="h-4 w-4 text-[#888]" />
        </div>
        <p class="mt-2 text-3xl font-extrabold text-[#111]">{{ memberCount }}</p>
        <p class="mt-2 text-[10px] text-[#888]">Members with is_active status in your org</p>
      </div>

      <div class="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between text-[#888]">
          <p class="text-xs font-medium">Pending applications</p>
          <Inbox class="h-4 w-4 text-[#888]" />
        </div>
        <p class="mt-2 text-3xl font-extrabold text-[#111]">{{ pendingCount }}</p>
        <p class="mt-2 text-[10px] text-[#888]">Applications with pending status awaiting review</p>
      </div>

      <div class="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between text-[#888]">
          <p class="text-xs font-medium">Total posts</p>
          <FileEdit class="h-4 w-4 text-[#888]" />
        </div>
        <p class="mt-2 text-3xl font-extrabold text-[#111]">{{ totalPostsCount }}</p>
        <p class="mt-2 text-[10px] text-[#888]">Posts with title, content, and category in your org</p>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
      
      <div class="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm lg:col-span-8">
        <div class="flex items-center justify-between border-b border-[#eee] pb-3">
          <h2 class="text-sm font-bold text-[#1a1a1a]">Recent Posts</h2>
          <span class="text-[11px] text-[#888]">Latest posts</span>
        </div>

        <div v-if="recentPosts.length" class="mt-3 divide-y divide-[#f5f5f5]">
          <div
            v-for="post in recentPosts"
            :key="post.post_id"
            class="flex items-center justify-between py-3 transition hover:bg-gray-50 px-2 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                <File class="h-4 w-4 text-[#666]" />
              </span>
              <div>
                <p class="text-xs font-bold text-[#222]">{{ post.title }}</p>
                <p class="text-[10px] text-[#888]">{{ post.category }}</p>
              </div>
            </div>
            <span class="text-[10px] text-[#888]">{{ formatRelativeTime(post.created_at) }}</span>
          </div>
        </div>

        <div v-else class="py-8 text-center text-xs text-[#888]">
          No posts created yet.
        </div>
      </div>

      <div class="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm lg:col-span-4 flex flex-col justify-between">
        <div>
          <div class="border-b border-[#eee] pb-3">
            <h2 class="text-sm font-bold text-[#1a1a1a]">Recent Applications Today</h2>
            <p class="text-[11px] text-[#888]">Students with pending application status.</p>
          </div>

          <div v-if="recentApplications.length" class="mt-3 space-y-3">
             <div v-for="app in recentApplications" :key="app.application_id" class="flex items-center gap-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-[#8f0c12]">
                {{ getInitials(app.full_name) }}

              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-[#222] truncate">{{ app.full_name }}</p>
                <p class="text-[10px] text-[#888] truncate">{{ app.email }} · Pending</p>
              </div>
            </div>
          </div>

          <div v-else class="py-6 text-center text-xs text-[#888]">
            No pending applications today.
          </div>
        </div>

        <RouterLink
          to="/officer/applications"
          class="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#6b0207] py-2 text-xs font-bold text-white no-underline transition hover:bg-[#520105]"
        >
          <span>Review applicant roster</span>
          <ArrowRight class="h-3 w-3" />
        </RouterLink>
      </div>

    </div>

  </main>
</template>
