<script setup lang="ts">
import { ref } from "vue";
import { supabase } from "@/lib/supabaseClient";

const searchQuery = ref("");
const emit = defineEmits<{
  search: [query: string]
}>();

function submitSearch() {
  emit("search", searchQuery.value.trim());
}

async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
}

</script>

<template>
  <header class="bg-[#6b0207] text-white">
    <div class="flex w-full flex-col items-center px-5 pb-8 pt-5 text-center">
      <h1
        class="mb-4 text-[clamp(1.35rem,3vw,2rem)] font-bold tracking-[-0.04em]"
      >
        Find Your Guild, Join Your Crew.
      </h1>
      <form
        class="mx-auto flex w-full max-w-145 items-stretch overflow-hidden rounded-[0.6rem] border-[3px] border-white bg-white shadow-[0_5px_12px_rgba(45,0,0,0.2)] max-[520px]:block"
        @submit.prevent="submitSearch"
      >
        <label
          class="flex min-w-0 flex-1 items-center gap-2 px-3 text-[#9b9b9b] max-[520px]:border-b max-[520px]:border-[#eee]"
        >
          <span class="text-xl leading-none" aria-hidden="true">⌕</span>
          <span class="sr-only">Search organizations</span>
          <input
            class="min-w-0 w-full border-0 py-[0.65rem] text-[#2b2b2b] outline-0"
            v-model="searchQuery"
            type="search"
            placeholder="Search organizations..."
          />
        </label>
        <button
          class="whitespace-nowrap bg-[#ffb31a] px-4 text-xs font-bold text-[#3b2300] transition hover:bg-[#ffc64e] focus-visible:bg-[#ffc64e] max-[520px]:min-h-10 max-[520px]:w-full"
          type="submit"
        >
          Explore Guilds <span aria-hidden="true">→</span>
        </button>
      </form>
      <p
        class="mx-auto mt-4 w-full max-w-2xl text-center leading-relaxed text-white/80"
      >
        Discover and join student organizations at Liceo de Cagayan University.
        Browse campus groups, stay updated on events, and apply online.
        <button class="font-bold text-[#ffcc50]" type="button" @click="signInWithGoogle">Sign in</button>
        with your @liceo.edu.ph account to manage your organization as an
        Officer or Admin.
      </p>
    </div>
  </header>
</template>
