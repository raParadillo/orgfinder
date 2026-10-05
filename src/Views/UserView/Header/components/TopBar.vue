<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";

const props = defineProps<{
  showSearch: boolean;
}>();

const compactSearchQuery = ref("");
const isSigningIn = ref(false);
const isAuthenticated = ref(false);
const router = useRouter();
const emit = defineEmits<{
  search: [query: string]
}>();

async function signInWithGoogle() {
  isSigningIn.value = true;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    console.error("Google sign-in failed:", error.message);
    isSigningIn.value = false;
  }
}

async function signOut() {
  await supabase.auth.signOut();
  await router.replace("/");
}

let authSubscription: { unsubscribe: () => void } | undefined;

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  isAuthenticated.value = Boolean(data.session);

  const { data: authState } = supabase.auth.onAuthStateChange((_event, session) => {
    isAuthenticated.value = Boolean(session);
  });
  authSubscription = authState.subscription;
});

onBeforeUnmount(() => authSubscription?.unsubscribe());

</script>

<template>
  <nav
    class="sticky top-0 z-50 flex min-h-16 items-center justify-between gap-4 bg-[#6b0207] px-5 transition-shadow sm:min-h-18 sm:px-[5vw]"
    :class="props.showSearch ? 'shadow-lg' : ''"
  >
    <RouterLink
      class="inline-flex items-center gap-3 text-white no-underline"
      to="/"
      aria-label="OrgFinder home"
    >
      <img
        class="h-12 w-12 object-contain"
        src="@/assets/img/LDCU_logo.webp"
        alt="Liceo de Cagayan University logo"
      />
      <span
        class="text-[clamp(1.2rem,2vw,1.55rem)] font-bold tracking-[-0.04em] max-[560px]:hidden"
        >OrgFinder</span
      >
    </RouterLink>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <form
        v-if="props.showSearch"
        class="order-2 flex min-w-0 max-w-md flex-1 overflow-hidden rounded-lg border-2 border-white bg-white"
        @submit.prevent="emit('search', compactSearchQuery.trim())"
      >
        <label class="flex min-w-0 flex-1 items-center px-2 text-[#777]">
          <span class="mr-2" aria-hidden="true">⌕</span>
          <span class="sr-only">Search organizations</span>
          <input
            v-model="compactSearchQuery"
            class="min-w-0 w-full border-0 py-1.5 text-sm text-[#222] outline-0"
            type="search"
            placeholder="Search organizations..."
          />
        </label>
        <button class="bg-[#ffb31a] px-3 text-xs font-bold text-[#3b2300]" type="submit">
          Search
        </button>
      </form>
    </Transition>

    <div v-if="!isAuthenticated" class="order-3 flex items-center gap-3">
      <span class="text-[0.72rem] text-white/90 max-[560px]:hidden"
        >Admin or Officer?</span
      >
      <button
        class="rounded-full bg-[#ffb31a] px-4 py-[0.42rem] text-[0.7rem] font-bold uppercase text-[#241600] transition hover:-translate-y-px hover:bg-[#ffc64e] focus-visible:-translate-y-px focus-visible:bg-[#ffc64e] disabled:cursor-wait disabled:opacity-70"
        type="button"
        :disabled="isSigningIn"
        @click="signInWithGoogle"
      >
        {{ isSigningIn ? "Opening..." : "Login!" }}
      </button>
    </div>
    <button
      v-else
      class="order-3 rounded-full bg-[#ffb31a] px-4 py-[0.42rem] text-[0.7rem] font-bold uppercase text-[#241600] transition hover:-translate-y-px hover:bg-[#ffc64e] focus-visible:-translate-y-px focus-visible:bg-[#ffc64e]"
      type="button"
      @click="signOut"
    >
      Logout
    </button>
  </nav>
</template>
