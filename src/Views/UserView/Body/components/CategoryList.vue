<script setup lang="ts">
import { ref } from "vue";

const categories = [
  "ALL",
  "Academic",
  "Sports",
  "Cultural",
  "Special Interest",
  "Other",
];

const emit = defineEmits<{
  select: [category: string]
}>();

const selectedCategory = ref("ALL");
</script>

<template>
  <nav
    class="flex flex-wrap items-center justify-center gap-2"
    aria-label="Organization categories"
  >
    <button
      v-for="category in categories"
      :key="category"
      class="rounded-full px-4 py-2 text-[0.65rem] font-normal uppercase transition-all duration-150 hover:-translate-y-0.5  focus-visible:-translate-y-0.5 focus-visible:font-extrabold! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f0c12]"
      :class="selectedCategory === category ? 'bg-[#8f0c12] text-white' : 'bg-[#e9e9e9] text-[#272727] hover:bg-[#464646] hover:text-white focus-visible:bg-[#8f0c12] focus-visible:text-white'"
      type="button"
      @click="selectedCategory = category; emit('select', category)"
    >
      {{ category }}
    </button>
  </nav>
</template>
