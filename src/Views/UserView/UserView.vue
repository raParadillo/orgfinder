<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import HeaderSection from "./Header/HeaderSection.vue";
import TopBar from "./Header/components/TopBar.vue";
import BodySection from "./Body/BodySection.vue";
import FooterSection from "./Footer/FooterSection.vue";

const searchQuery = ref("");
const isScrolled = ref(false);

function updateScrollState() {
  isScrolled.value = window.scrollY > 80;
}

onMounted(() => window.addEventListener("scroll", updateScrollState, { passive: true }));
onBeforeUnmount(() => window.removeEventListener("scroll", updateScrollState));
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#1f1f1f]">
    <div class="sticky top-0 z-50">
      <TopBar :show-search="isScrolled" @search="searchQuery = $event" />
    </div>
    <HeaderSection @search="searchQuery = $event" />
    <BodySection class="flex-1" :search-query="searchQuery" />
    <FooterSection />
  </div>
</template>
