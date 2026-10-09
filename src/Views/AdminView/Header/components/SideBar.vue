<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import {
  PlusCircle,
  Building,
  AddressBook,
  UserPlus,
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
          ORGANIZATIONS
        </p>
        <nav class="mt-2 space-y-1">
         
          <RouterLink
            to="/admin/create-org"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium no-underline transition"
            :class="route.path === '/admin/create-org' ? 'bg-[#6b0207] text-white font-semibold' : 'text-[#444] hover:bg-gray-100'"
          >
            <PlusCircle class="h-3.5 w-3.5 shrink-0" />
            <span>Creating New Org</span>
          </RouterLink>

          <RouterLink
            to="/admin"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium no-underline transition"
            :class="route.path === '/admin' ? 'bg-[#6b0207] text-white font-semibold' : 'text-[#444] hover:bg-gray-100'"
          >
            <Building class="h-3.5 w-3.5 shrink-0" />
            <span>Organizations List</span>
          </RouterLink>
        </nav>
      </div>

      <div>
        <p class="text-[10px] font-bold tracking-wider text-[#999] uppercase">
          ACCOUNTS
        </p>
        <nav class="mt-2 space-y-1">

          <RouterLink
            to="/admin/accounts"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium no-underline transition"
            :class="route.path === '/admin/accounts' ? 'bg-[#6b0207] text-white font-semibold' : 'text-[#444] hover:bg-gray-100'"
          >
            <AddressBook class="h-3.5 w-3.5 shrink-0" />
            <span>Accounts Directory</span>
          </RouterLink>

          <RouterLink
            to="/admin/add-account"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium no-underline transition"
            :class="route.path === '/admin/add-account' ? 'bg-[#6b0207] text-white font-semibold' : 'text-[#444] hover:bg-gray-100'"
          >
            <UserPlus class="h-3.5 w-3.5 shrink-0" />
            <span>Add Account</span>
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
