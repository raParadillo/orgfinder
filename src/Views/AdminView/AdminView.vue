<script setup lang="ts">
import TopBar from "@/Views/UserView/Header/components/TopBar.vue";
</script>

<template>
  <div class="min-h-screen bg-[#1f1f1f]">
    <TopBar :show-search="false" />
    <main class="mx-auto max-w-5xl px-5 py-10">
      <section class="rounded-xl bg-white p-6 shadow-lg sm:p-8">
        <p class="text-xs font-bold uppercase tracking-widest text-[#8f0c12]">Admin mockup</p>
        <h1 class="mt-2 text-2xl font-bold text-[#292929]">Admin dashboard</h1>
        <p class="mt-2 text-sm text-[#777]">You are signed in with an account registered in the users table.</p>

        <div class="mt-8 grid gap-4 sm:grid-cols-3">
          <div class="rounded-lg bg-[#f6f4f0] p-4">
            <p class="text-xs text-[#777]">Organizations</p>
            <p class="mt-2 text-2xl font-bold text-[#8f0c12]">--</p>
          </div>
          <div class="rounded-lg bg-[#f6f4f0] p-4">
            <p class="text-xs text-[#777]">Pending applications</p>
            <p class="mt-2 text-2xl font-bold text-[#8f0c12]">--</p>
          </div>
          <div class="rounded-lg bg-[#f6f4f0] p-4">
            <p class="text-xs text-[#777]">Active members</p>
            <p class="mt-2 text-2xl font-bold text-[#8f0c12]">--</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>