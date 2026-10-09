<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import {
  ThLarge,
  Building,
  Users,
  Inbox,
  FileEdit,
  SignOut,
} from "@primeicons/vue";

const route = useRoute();
const router = useRouter();

async function signOut() {
  await supabase.auth.signOut();
  await router.push("/");
}
</script>

<template>
  <aside class="flex w-60 shrink-0 flex-col justify-between border-r border-[#e5e5e5] bg-white p-5 min-h-0">
    <div class="space-y-6">

      <div>
        <p class="text-[10px] font-bold tracking-wider text-[#999] uppercase">
          OVERVIEW
        </p>
        <nav class="mt-2 space-y-1">
          <RouterLink
            to="/officer"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium no-underline transition"
            :class="route.path === '/officer' ? 'bg-[#6b0207] text-white font-semibold' : 'text-[#444] hover:bg-gray-100'"
          >
            <ThLarge class="h-3.5 w-3.5 shrink-0" />
            <span>Dashboard</span>
          </RouterLink>
        </nav>
      </div>

      <div>
        <p class="text-[10px] font-bold tracking-wider text-[#999] uppercase">
          MY ORGANIZATION
        </p>
        <nav class="mt-2 space-y-1">
          <RouterLink
            to="/officer/edit-profile"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium no-underline transition"
            :class="route.path === '/officer/edit-profile' ? 'bg-[#6b0207] text-white font-semibold' : 'text-[#444] hover:bg-gray-100'"
          >
            <Building class="h-3.5 w-3.5 shrink-0" />
            <span>Edit Org Profile</span>
          </RouterLink>
          <RouterLink
            to="/officer/members"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium no-underline transition"
            :class="route.path === '/officer/members' ? 'bg-[#6b0207] text-white font-semibold' : 'text-[#444] hover:bg-gray-100'"
          >
            <Users class="h-3.5 w-3.5 shrink-0" />
            <span>Member Roster</span>
          </RouterLink>
        </nav>
      </div>

      <div>
        <p class="text-[10px] font-bold tracking-wider text-[#999] uppercase">
          RECRUITMENT
        </p>
        <nav class="mt-2 space-y-1">
          <RouterLink
            to="/officer/applications"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium no-underline transition"
            :class="route.path === '/officer/applications' ? 'bg-[#6b0207] text-white font-semibold' : 'text-[#444] hover:bg-gray-100'"
          >
            <Inbox class="h-3.5 w-3.5 shrink-0" />
            <span>Applications</span>
          </RouterLink>
        </nav>
      </div>

      <div>
        <p class="text-[10px] font-bold tracking-wider text-[#999] uppercase">
          CONTENT
        </p>
        <nav class="mt-2 space-y-1">
          <RouterLink
            to="/officer/posts"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium no-underline transition"
            :class="route.path === '/officer/posts' ? 'bg-[#6b0207] text-white font-semibold' : 'text-[#444] hover:bg-gray-100'"
          >
            <FileEdit class="h-3.5 w-3.5 shrink-0" />
            <span>Manage Org Posts</span>
          </RouterLink>
        </nav>
      </div>
    </div>

    <button
      class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#666] transition hover:bg-red-50 hover:text-red-700"
      type="button"
      @click="signOut"
    >
      <SignOut class="h-3.5 w-3.5 shrink-0" />
      <span>Logout</span>
    </button>
  </aside>
</template>
