<script setup lang="ts">
import TopBar from "@/Views/UserView/Header/components/TopBar.vue";
</script>

<template>
  <div class="min-h-screen bg-[#1f1f1f]">
    <TopBar :show-search="false" />

    <main class="mx-auto max-w-5xl px-5 py-8">
      <section class="rounded-xl bg-white p-6 shadow-lg sm:p-8">
        <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-[#8f0c12]">Officer mockup</p>
            <h1 class="mt-2 text-2xl font-bold text-[#292929]">Officer dashboard</h1>
            <p class="mt-2 text-sm text-[#777]">Manage your organization, posts, and membership applications.</p>
          </div>
          <button class="rounded bg-[#8f0c12] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#6f080d]" type="button">
            Edit organization
          </button>
        </div>

        <div class="mt-8 grid gap-4 sm:grid-cols-3">
          <div class="rounded-lg bg-[#f6f4f0] p-4">
            <p class="text-xs text-[#777]">Pending applications</p>
            <p class="mt-2 text-2xl font-bold text-[#8f0c12]">--</p>
          </div>
          <div class="rounded-lg bg-[#f6f4f0] p-4">
            <p class="text-xs text-[#777]">Active members</p>
            <p class="mt-2 text-2xl font-bold text-[#8f0c12]">--</p>
          </div>
          <div class="rounded-lg bg-[#f6f4f0] p-4">
            <p class="text-xs text-[#777]">Published posts</p>
            <p class="mt-2 text-2xl font-bold text-[#8f0c12]">--</p>
          </div>
        </div>

        <div class="mt-8 grid gap-4 sm:grid-cols-2">
          <button class="rounded-lg border border-[#e4e4e4] p-5 text-left transition hover:border-[#8f0c12] hover:bg-rose-50" type="button">
            <h2 class="font-bold text-[#292929]">Review applications</h2>
            <p class="mt-1 text-xs text-[#777]">Approve or reject students who want to join.</p>
          </button>
          <button class="rounded-lg border border-[#e4e4e4] p-5 text-left transition hover:border-[#8f0c12] hover:bg-rose-50" type="button">
            <h2 class="font-bold text-[#292929]">Create a post</h2>
            <p class="mt-1 text-xs text-[#777]">Share announcements and organization updates.</p>
          </button>
        </div>
      </section>
    </main>
  </div>
</template>