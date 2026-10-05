<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";

const showScrollTop = ref(false);
const router = useRouter();

async function routeSignedInUser(email: string) {
  const { data, error } = await supabase
    .from("users")
    .select("user_id, role")
    .ilike("email", email)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    await supabase.auth.signOut();
    if (router.currentRoute.value.path !== "/") {
      await router.replace("/");
    }
    return;
  }

  await router.replace(String(data.role).toLowerCase() === "officer" ? "/officer" : "/admin");
}

function updateScrollState() {
  showScrollTop.value = window.scrollY > 200;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let authSubscription: { unsubscribe: () => void } | undefined;

onMounted(async () => {
  window.addEventListener("scroll", updateScrollState, { passive: true });

  const { data } = await supabase.auth.getSession();
  if (data.session?.user.email) {
    await routeSignedInUser(data.session.user.email);
  }

  const { data: authState } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user.email) {
      void routeSignedInUser(session.user.email);
    }
  });
  authSubscription = authState.subscription;
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", updateScrollState);
  authSubscription?.unsubscribe();
});
</script>

<template>
  <RouterView />
  <button
    v-if="showScrollTop"
    class="fixed bottom-5 right-5 z-[60] flex size-11 items-center justify-center rounded-full bg-[#8f0c12] text-xl font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#6f080d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f0c12]"
    type="button"
    aria-label="Scroll to top"
    title="Scroll to top"
    @click="scrollToTop"
  >
    ↑
  </button>
</template>
