<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { supabase } from "@/lib/supabaseClient";
import { Search, Pencil, Inbox, Times } from "@primeicons/vue";

type Member = {
  member_id: number;
  student_id: string;
  full_name: string;
  email: string;
  role: string;
  position?: string;
  year?: string | number;
  is_active: boolean;
  joined_at?: string;
};

const orgName = ref("");
const orgId = ref<number | null>(null);
const members = ref<Member[]>([]);
const activeTab = ref<"active" | "archived">("active");
const searchQuery = ref("");
const isLoading = ref(true);

const currentPage = ref(1);
const itemsPerPage = 8;

const showEditModal = ref(false);
const editingMember = ref<Member | null>(null);
const newPosition = ref("");
const showAddStudentDrawer = ref(false);
const isAddingStudent = ref(false);
const addStudentError = ref("");
const newStudent = ref({
  studentId: "",
  fullName: "",
  email: "",
  position: "Member",
  year: new Date().getFullYear().toString(),
});

function getInitials(nameOrEmail?: string) {
  if (!nameOrEmail) return "MB";
  const part = nameOrEmail.split("@")[0] || "";
  const clean = part.replace(/[^a-zA-Z]/g, " ");
  return (clean.split(/\s+/).filter(Boolean).map((w) => w[0] || "").join("").slice(0, 2).toUpperCase() || "MB");
}

async function loadMembers() {
  isLoading.value = true;
  const { data: sessionData } = await supabase.auth.getSession();
  const email = sessionData.session?.user.email;

  if (email) {
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .ilike("email", email)
      .maybeSingle();

    if (userData?.org_id) {
      orgId.value = userData.org_id;
      const { data: orgData } = await supabase
        .from("orgs")
        .select("name")
        .eq("org_id", userData.org_id)
        .single();
      if (orgData) orgName.value = orgData.name;

      const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("org_id", userData.org_id)
      .order("email");  

      if (data) {
        members.value = data.map((m: any) => ({
          ...m,
          position: m.position || "Member",
          year: m.year || 2025,
          is_active: m.is_active ?? true,
        }));
      }

    }
  }
  isLoading.value = false;
}

function openAddStudentDrawer() {
  addStudentError.value = "";
  showAddStudentDrawer.value = true;
}

function closeAddStudentDrawer() {
  if (isAddingStudent.value) return;
  showAddStudentDrawer.value = false;
}

async function addStudent() {
  if (!orgId.value) {
    addStudentError.value = "Your organization could not be identified. Please try again.";
    return;
  }

  if (!newStudent.value.fullName.trim() || !newStudent.value.email.trim()) {
    addStudentError.value = "Full name and email are required.";
    return;
  }

  isAddingStudent.value = true;
  addStudentError.value = "";

  const { error } = await supabase.from("members").insert({
    org_id: orgId.value,
    student_id: newStudent.value.studentId.trim() || null,
    full_name: newStudent.value.fullName.trim(),
    email: newStudent.value.email.trim(),
    position: newStudent.value.position.trim() || "Member",
    year: newStudent.value.year.trim() || new Date().getFullYear().toString(),
    is_active: true,
  });

  if (error) {
    addStudentError.value = error.message || "Unable to add student. Please try again.";
    isAddingStudent.value = false;
    return;
  }

  showAddStudentDrawer.value = false;
  newStudent.value = {
    studentId: "",
    fullName: "",
    email: "",
    position: "Member",
    year: new Date().getFullYear().toString(),
  };
  await loadMembers();
  isAddingStudent.value = false;
}

const filteredMembers = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  const showActive = activeTab.value === "active";

  return members.value.filter((member) => {
    const matchesTab = member.is_active === showActive;
    const matchesSearch =
      !query ||
      member.email.toLowerCase().includes(query) ||
      (member.full_name && member.full_name.toLowerCase().includes(query)) ||
      (member.position && member.position.toLowerCase().includes(query)) ||
      String(member.year).includes(query);

    return matchesTab && matchesSearch;
  });
});

const totalPages = computed(() => Math.ceil(filteredMembers.value.length / itemsPerPage) || 1);
const paginatedMembers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredMembers.value.slice(start, start + itemsPerPage);
});

async function toggleActiveStatus(member: Member) {
  const newStatus = !member.is_active;
  const { error } = await supabase
  .from("members")
  .update({ is_active: newStatus })
  .eq("member_id", member.member_id);

  if (!error) {
    member.is_active = newStatus;
  }
}

function openEditPosition(member: Member) {
  editingMember.value = member;
  newPosition.value = member.position || "Member";
  showEditModal.value = true;
}

async function savePosition() {
  const member = editingMember.value;
   if (!member) return;
  const { error } = await supabase
    .from("members")
    .update({ position: newPosition.value }) 
    .eq("member_id", member.member_id);
  if (!error) {
    member.position = newPosition.value;
    showEditModal.value = false;
  }
}

function exportRoster() {
  if (!filteredMembers.value.length) return;

  const headers = ["Student ID", "Full Name", "Email", "Position", "Year", "Status"];
  const rows = filteredMembers.value.map((m) => [
    m.student_id || "",
    m.full_name || "",
    m.email,
    m.position || "Member",
    m.year || "",
    m.is_active ? "Active" : "Archived",
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `member_roster_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

onMounted(() => {
  loadMembers();
});
</script>

<template>
  <main class="flex-1 h-full overflow-y-auto bg-white p-8">
    
    <div class="flex flex-col justify-between gap-4 border-b border-[#eee] pb-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-3xl font-extrabold text-[#1a1a1a]">Member Roster</h1>
        <p class="mt-1 text-xs text-[#777]">
          {{ orgName || "Collegiate Film & Photo" }} · Manage member positions and active status (is_active) from the supported schema.
        </p>
      </div>

      <button
        type="button"
        @click="openAddStudentDrawer"
        class="inline-flex items-center gap-2 rounded-lg bg-[#6b0207] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#520105]"
      >
        <span class="text-sm leading-none">+</span> Add student
      </button>
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#eee] pb-4">
      <div class="flex items-center gap-6">
        <button
          type="button"
          class="pb-1 text-sm font-bold transition"
          :class="activeTab === 'active' ? 'border-b-2 border-[#1a1a1a] text-[#1a1a1a]' : 'text-[#888] hover:text-[#444]'"
          @click="activeTab = 'active'; currentPage = 1"
        >
          Active
        </button>
        <button
          type="button"
          class="pb-1 text-sm font-bold transition"
          :class="activeTab === 'archived' ? 'border-b-2 border-[#1a1a1a] text-[#1a1a1a]' : 'text-[#888] hover:text-[#444]'"
          @click="activeTab = 'archived'; currentPage = 1"
        >
          Archived
        </button>
      </div>

      <div class="relative w-80">
        <Search class="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search by email, position, or year"
          class="w-full rounded-full bg-[#f1f1f1] py-1.5 pl-9 pr-4 text-xs text-[#222] outline-none focus:ring-1 focus:ring-[#6b0207]"
        />
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between text-xs text-[#555]">
      <span class="font-bold text-[#111]">{{ filteredMembers.length }} Results</span>
      <span class="text-[11px] text-[#888]">
        {{ activeTab === 'active' ? 'Active members' : 'Archived members' }} · Showing {{ paginatedMembers.length }} of {{ filteredMembers.length }}
      </span>
    </div>

    <div v-if="isLoading" class="py-12 text-center text-xs text-gray-500">
      Loading member roster...
    </div>
    <div v-else-if="filteredMembers.length" class="mt-4 overflow-hidden rounded-xl border border-[#e5e5e5]">
      <table class="w-full text-left text-xs text-[#333]">
        <thead class="bg-[#d9d9d9] text-[11px] font-semibold text-[#333]">
          <tr>
            <th class="px-5 py-3">Email</th>
            <th class="px-4 py-3">Position</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Year</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#efefef] bg-white">
          <tr
            v-for="member in paginatedMembers"
            :key="member.member_id"
            class="transition hover:bg-gray-50"
          >
            <td class="px-5 py-3.5 font-medium text-[#222]">
              <div class="flex items-center gap-3">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#ebebeb] text-[10px] font-bold text-[#555]">
                  {{ getInitials(member.full_name || member.email) }}
                </div>
                <span>{{ member.email }}</span>
              </div>
            </td>

            <td class="px-4 py-3.5 text-[#333] font-medium">
              {{ member.position || "Member" }}
            </td>
            <td class="px-4 py-3.5">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                :class="member.is_active ? 'text-emerald-700 bg-emerald-50' : 'text-gray-600 bg-gray-100'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="member.is_active ? 'bg-emerald-500' : 'bg-gray-400'"></span>
                {{ member.is_active ? "Active" : "Archived" }}
              </span>
            </td>

            <td class="px-4 py-3.5 text-[#777]">
              {{ member.year || 2025 }}
            </td>
            <td class="px-4 py-3.5 text-right">
              <div class="inline-flex items-center gap-2">
                <button
                  type="button"
                  @click="openEditPosition(member)"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-[#d5d5d5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#444] transition hover:bg-gray-50"
                >
                  <Pencil class="h-3 w-3" />
                  <span>Edit position</span>
                </button>
                <button
                  type="button"
                  @click="toggleActiveStatus(member)"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-[#d5d5d5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#444] transition hover:bg-gray-50"
                >
                  <Inbox class="h-3 w-3" />
                  <span>{{ activeTab === "active" ? "Deactivate" : "Activate" }}</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else
      class="mt-8 rounded-xl border border-dashed border-[#ddd] p-12 text-center text-xs text-[#888]"
    >
      No {{ activeTab }} members found.
    </div>

    <div v-if="filteredMembers.length > 0" class="mt-4 flex items-center justify-between text-xs text-[#777]">
      <p>Showing 1–{{ paginatedMembers.length }} of {{ filteredMembers.length }} members</p>

      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="currentPage === 1"
          @click="currentPage--"
          class="rounded px-2.5 py-1 border text-xs font-semibold disabled:opacity-40 hover:bg-gray-50"
        >
          Previous
        </button>
        <span class="rounded bg-[#6b0207] px-2.5 py-1 text-xs font-bold text-white">
          {{ currentPage }}
        </span>
        <span class="text-xs text-[#888]">of {{ totalPages }}</span>
        <button
          type="button"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
          class="rounded px-2.5 py-1 border text-xs font-semibold disabled:opacity-40 hover:bg-gray-50"
        >
          Next >
        </button>
      </div>
    </div>

    <div class="mt-8 border-t border-[#eee] pt-4 text-[11px] text-[#888]">
      <p>ⓘ "Deactivate" sets is_active = false for the member. Their record remains available in the Archived tab and can be reactivated at any time.</p>
    </div>
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 class="text-sm font-bold text-[#222]">Edit Member Position</h2>
        <p class="mt-1 text-xs text-[#777]">{{ editingMember?.email }}</p>

        <div class="mt-4">
          <label class="block text-xs font-bold text-[#333]">
            Position Title
            <input
              v-model="newPosition"
              type="text"
              placeholder="e.g. President, Secretary, Media Coordinator"
              class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2 text-xs text-[#222] outline-none focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
            />
          </label>
        </div>

        <div class="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="showEditModal = false"
            class="rounded-lg px-4 py-2 text-xs font-semibold text-[#555] hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="savePosition"
            class="rounded-lg bg-[#6b0207] px-4 py-2 text-xs font-bold text-white hover:bg-[#520105]"
          >
            Save Position
          </button>
        </div>
      </div>
    </div>

    <Transition name="drawer">
      <aside
        v-if="showAddStudentDrawer"
        class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
        aria-label="Add student"
      >
        <div class="flex items-center justify-between border-b border-[#eee] px-6 py-5">
          <div>
            <h2 class="text-base font-bold text-[#222]">Add student</h2>
            <p class="mt-1 text-xs text-[#777]">Add a student directly to your member roster.</p>
          </div>
          <button
            type="button"
            aria-label="Close add student form"
            :disabled="isAddingStudent"
            @click="closeAddStudentDrawer"
            class="rounded-lg p-2 text-[#777] transition hover:bg-gray-100 hover:text-[#222] disabled:opacity-50"
          >
            <Times class="h-4 w-4" />
          </button>
        </div>

        <form class="flex-1 overflow-y-auto px-6 py-6" @submit.prevent="addStudent">
          <div class="space-y-4">
            <label class="block text-xs font-semibold text-[#555]">
              Student ID
              <input
                v-model="newStudent.studentId"
                type="text"
                placeholder="e.g. STU-2026-0187"
                class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
              />
            </label>

            <label class="block text-xs font-semibold text-[#555]">
              Full name <span class="text-[#6b0207]">*</span>
              <input
                v-model="newStudent.fullName"
                type="text"
                required
                placeholder="Student full name"
                class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
              />
            </label>

            <label class="block text-xs font-semibold text-[#555]">
              Email <span class="text-[#6b0207]">*</span>
              <input
                v-model="newStudent.email"
                type="email"
                required
                placeholder="student@example.com"
                class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
              />
            </label>

            <div class="grid grid-cols-2 gap-3">
              <label class="block text-xs font-semibold text-[#555]">
                Position
                <input
                  v-model="newStudent.position"
                  type="text"
                  placeholder="Member"
                  class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
                />
              </label>

              <label class="block text-xs font-semibold text-[#555]">
                Year
                <input
                  v-model="newStudent.year"
                  type="text"
                  placeholder="2026"
                  class="mt-1.5 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2.5 text-xs text-[#222] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
                />
              </label>
            </div>
          </div>

          <p v-if="addStudentError" class="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
            {{ addStudentError }}
          </p>

          <div class="mt-8 flex items-center justify-end gap-3 border-t border-[#eee] pt-4">
            <button
              type="button"
              :disabled="isAddingStudent"
              @click="closeAddStudentDrawer"
              class="rounded-lg px-4 py-2 text-xs font-semibold text-[#555] transition hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isAddingStudent"
              class="rounded-lg bg-[#6b0207] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#520105] disabled:opacity-60"
            >
              {{ isAddingStudent ? "Adding..." : "Add student" }}
            </button>
          </div>
        </form>
      </aside>
    </Transition>
    <div
      v-if="showAddStudentDrawer"
      class="fixed inset-0 z-40 bg-black/30"
      @click="closeAddStudentDrawer"
    ></div>

  </main>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
