<script setup lang="ts">
import TopBar from "./Header/components/TopBar.vue";
import SideBar from "./Header/components/SideBar.vue";
import EditProfile from "./Body/components/EditProfile.vue";
</script>

<template>
  <div class="h-screen overflow-hidden bg-[#fafafa] flex flex-col font-sans">
    <TopBar />
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <SideBar />
      <EditProfile />
    </div>
  </div>
</template>
