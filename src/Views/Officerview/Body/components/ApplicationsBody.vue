<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { supabase } from "@/lib/supabaseClient";
import { File, Clock, Check, Times, Search, Save } from "@primeicons/vue";

export type Application = {
  application_id?: number; 
  app_id: number;
  org_id: number;
  student_id: string;
  full_name: string;
  email: string;
  fb_url?: string;
  contact_no?: string;
  status: "pending" | "approved" | "declined";
  custom_notes?: string | null;
  created_at: string;
  updated_at?: string;
};


const orgName = ref("Collegiate Film & Photo");
const orgId = ref<number | null>(null);
const applications = ref<Application[]>([]);
const selectedApp = ref<Application | null>(null);
const activeTab = ref<"all" | "pending" | "approved" | "declined">("all");
const searchQuery = ref("");
const isLoading = ref(true);
const isSaving = ref(false);
const loadError = ref("");

const draftStatus = ref<"pending" | "approved" | "declined">("pending");
const draftNotes = ref("");

const currentPage = ref(1);
const itemsPerPage = 5;

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AP"
  );
}

// Date formatter
function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(new Date(dateStr));
}

async function loadApplications() {
  isLoading.value = true;
  loadError.value = "";
  applications.value = [];
  selectedApp.value = null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    loadError.value = sessionError.message;
    isLoading.value = false;
    return;
  }

  const email = sessionData.session?.user?.email;

  if (!email) {
    loadError.value = "You must be signed in to view applications.";
    isLoading.value = false;
    return;
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .ilike("email", email)
    .maybeSingle();

  if (userError || !userData?.org_id) {
    loadError.value = userError?.message || "Your account is not linked to an organization.";
    isLoading.value = false;
    return;
  }

  orgId.value = userData.org_id;

  const [{ data: orgData }, { data, error: applicationsError }] = await Promise.all([
    supabase
      .from("orgs")
      .select("name")
      .eq("org_id", userData.org_id)
      .single(),
    supabase
      .from("applications")
      .select("*")
      .eq("org_id", userData.org_id)
      .order("created_at", { ascending: false }),
  ]);

  if (orgData) orgName.value = orgData.name;
  if (applicationsError) {
    loadError.value = applicationsError.message;
  } else {
    applications.value = (data ?? []).map((application: any) => ({
      ...application,
      app_id: application.application_id,
      application_id: application.application_id,
      status: application.status === "rejected" ? "declined" : application.status,
    }));
    if (applications.value[0]) selectApplication(applications.value[0]);
  }

  isLoading.value = false;
}

function selectApplication(app: Application) {
  selectedApp.value = app;
  draftStatus.value = app.status;
  draftNotes.value = app.custom_notes || "";
}

const totalCount = computed(() => applications.value.length);
const pendingCount = computed(() => applications.value.filter((a) => a.status === "pending").length);
const approvedCount = computed(() => applications.value.filter((a) => a.status === "approved").length);
const declinedCount = computed(() => applications.value.filter((a) => a.status === "declined").length);

const filteredApplications = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  return applications.value.filter((app) => {
    const matchesTab = activeTab.value === "all" || app.status === activeTab.value;
    const matchesSearch =
      !query ||
      app.full_name.toLowerCase().includes(query) ||
      app.email.toLowerCase().includes(query) ||
      app.student_id.toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });
});

const totalPages = computed(() => Math.ceil(filteredApplications.value.length / itemsPerPage) || 1);
const paginatedApplications = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredApplications.value.slice(start, start + itemsPerPage);
});

async function saveStatusAndNotes() {
  if (!selectedApp.value) return;

  isSaving.value = true;
  const targetId = selectedApp.value.application_id || selectedApp.value.app_id;

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("applications")
    .update({
      status: draftStatus.value,
      custom_notes: draftNotes.value.trim() || null,
      updated_at: now,
  })
  .eq("application_id", targetId); 

     if (!error) {
    selectedApp.value.status = draftStatus.value;
    selectedApp.value.custom_notes = draftNotes.value.trim() || null;
    selectedApp.value.updated_at = now;

    if (draftStatus.value === "approved" && selectedApp.value.org_id) {
      const { data: existingMember } = await supabase
        .from("members")
        .select("member_id")
        .eq("org_id", selectedApp.value.org_id)
        .ilike("email", selectedApp.value.email)
        .maybeSingle();

          if (!existingMember) {
        await supabase.from("members").insert({
          org_id: selectedApp.value.org_id,
          email: selectedApp.value.email,
          position: "Member",
          year: new Date().getFullYear().toString(),
          is_active: true,
        });
      }
    }
  }

  isSaving.value = false;
}

function quickUpdate(newStatus: "approved" | "declined") {
  draftStatus.value = newStatus;
  saveStatusAndNotes();
}

function exportApplications() {
  if (applications.value.length === 0) return;
  const headers = ["ID", "Student ID", "Full Name", "Email", "Contact", "Status", "Created At"];
  const rows = applications.value.map((a) => [
    a.app_id,
    a.student_id,
    a.full_name,
    a.email,
    a.contact_no || "",
    a.status,
    a.created_at,
  ]);
  const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csv));
  link.setAttribute("download", `applications_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

onMounted(() => {
  loadApplications();
});
</script>

<template>
  <main class="flex-1 h-full overflow-y-auto bg-white p-8 font-sans">
    <div class="flex flex-col justify-between gap-4 border-b border-[#eee] pb-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-3xl font-extrabold text-[#1a1a1a]">Applications</h1>
        <p class="mt-1 text-xs text-[#777]">
          {{ orgName }} · Review student applications, update status, and maintain officer notes.
        </p>
      </div>

      
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-2xs">
        <div class="flex items-center justify-between text-xs text-[#777]">
          <span>Total applications</span>
          <File class="h-4 w-4 text-rose-700" />
        </div>
        <div class="mt-2 text-2xl font-black text-[#111]">{{ totalCount }}</div>
        <p class="mt-1 text-[11px] text-[#888]">All application records</p>
      </div>

      <div class="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-2xs">
        <div class="flex items-center justify-between text-xs text-[#777]">
          <span>Pending review</span>
          <Clock class="h-4 w-4 text-amber-600" />
        </div>
        <div class="mt-2 text-2xl font-black text-[#111]">{{ pendingCount }}</div>
        <p class="mt-1 text-[11px] text-[#888]">Awaiting an officer decision</p>
      </div>

      <div class="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-2xs">
        <div class="flex items-center justify-between text-xs text-[#777]">
          <span>Approved</span>
          <Check class="h-4 w-4 text-emerald-600" />
        </div>
        <div class="mt-2 text-2xl font-black text-[#111]">{{ approvedCount }}</div>
        <p class="mt-1 text-[11px] text-[#888]">Status set to approved</p>
      </div>

      <div class="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-2xs">
        <div class="flex items-center justify-between text-xs text-[#777]">
          <span>Declined</span>
          <Times class="h-4 w-4 text-rose-600" />
        </div>
        <div class="mt-2 text-2xl font-black text-[#111]">{{ declinedCount }}</div>
        <p class="mt-1 text-[11px] text-[#888]">Status set to declined</p>
      </div>
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="activeTab = 'all'; currentPage = 1"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
          :class="activeTab === 'all' ? 'bg-[#6b0207] text-white shadow-xs' : 'bg-white text-[#555] border border-[#e0e0e0] hover:bg-gray-50'"
        >
          <span>All</span>
          <span class="rounded px-1.5 py-0.2 text-[10px]" :class="activeTab === 'all' ? 'bg-black/25 text-white' : 'bg-gray-100 text-gray-700'">{{ totalCount }}</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'pending'; currentPage = 1"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
          :class="activeTab === 'pending' ? 'bg-[#6b0207] text-white shadow-xs' : 'bg-white text-[#555] border border-[#e0e0e0] hover:bg-gray-50'"
        >
          <span>Pending</span>
          <span class="rounded px-1.5 py-0.2 text-[10px]" :class="activeTab === 'pending' ? 'bg-black/25 text-white' : 'bg-gray-100 text-gray-700'">{{ pendingCount }}</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'approved'; currentPage = 1"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
          :class="activeTab === 'approved' ? 'bg-[#6b0207] text-white shadow-xs' : 'bg-white text-[#555] border border-[#e0e0e0] hover:bg-gray-50'"
        >
          <span>Approved</span>
          <span class="rounded px-1.5 py-0.2 text-[10px]" :class="activeTab === 'approved' ? 'bg-black/25 text-white' : 'bg-gray-100 text-gray-700'">{{ approvedCount }}</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'declined'; currentPage = 1"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
          :class="activeTab === 'declined' ? 'bg-[#6b0207] text-white shadow-xs' : 'bg-white text-[#555] border border-[#e0e0e0] hover:bg-gray-50'"
        >
          <span>Declined</span>
          <span class="rounded px-1.5 py-0.2 text-[10px]" :class="activeTab === 'declined' ? 'bg-black/25 text-white' : 'bg-gray-100 text-gray-700'">{{ declinedCount }}</span>
        </button>
      </div>

      <div class="relative w-72">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search by full name or email"
          class="w-full rounded-full bg-[#f1f1f1] py-1.5 pl-8 pr-4 text-xs text-[#222] outline-none focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
        />
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between text-xs text-[#555]">
      <span class="font-bold text-[#111]">{{ filteredApplications.length }} Results</span>
      <span class="text-[11px] text-[#888]">
        {{ activeTab === 'all' ? 'All statuses' : activeTab }} · Showing {{ paginatedApplications.length }} of {{ filteredApplications.length }}
      </span>
    </div>

    <div v-if="isLoading" class="mt-8 rounded-xl border border-dashed border-[#ddd] p-12 text-center text-xs text-[#888]">
      Loading applications...
    </div>

    <div v-else-if="loadError" class="mt-8 rounded-xl border border-red-100 bg-red-50 p-4 text-xs text-red-700">
      {{ loadError }}
    </div>

    <div v-else-if="!filteredApplications.length" class="mt-8 rounded-xl border border-dashed border-[#ddd] p-12 text-center text-xs text-[#888]">
      No applications found.
    </div>

    <div v-else class="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">  
      <div class="lg:col-span-7 overflow-hidden rounded-xl border border-[#e5e5e5] bg-white">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#f0f0f0] text-[11px] font-semibold text-[#444]">
            <tr>
              <th class="px-4 py-3">Applicant</th>
              <th class="px-3 py-3">Status</th>
              <th class="px-3 py-3">Created at</th>
              <th class="px-3 py-3">Updated at</th>
              <th class="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#efefef]">
            <tr
              v-for="app in paginatedApplications"
              :key="app.app_id"
              @click="selectApplication(app)"
              class="cursor-pointer transition hover:bg-gray-50"
              :class="selectedApp?.app_id === app.app_id ? 'bg-rose-50/60 font-semibold' : ''"
            >
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#ebebeb] text-[10px] font-bold text-[#555]">
                    {{ getInitials(app.full_name) }}
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-[#111]">{{ app.full_name }}</div>
                    <div class="text-[10px] text-[#777] font-normal">{{ app.email }}</div>
                  </div>
                </div>
              </td>

              <td class="px-3 py-3.5">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                  :class="{
                    'bg-amber-50 text-amber-700': app.status === 'pending',
                    'bg-emerald-50 text-emerald-700': app.status === 'approved',
                    'bg-rose-50 text-rose-700': app.status === 'declined',
                  }"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :class="{
                      'bg-amber-500': app.status === 'pending',
                      'bg-emerald-500': app.status === 'approved',
                      'bg-rose-500': app.status === 'declined',
                    }"
                  ></span>
                  {{ app.status }}
                </span>
              </td>

              <td class="px-3 py-3.5 text-[11px] text-[#666]">
                {{ formatDate(app.created_at) }}
              </td>

              <td class="px-3 py-3.5 text-[11px] text-[#666]">
                {{ formatDate(app.updated_at || app.created_at) }}
              </td>

              <td class="px-3 py-3.5 text-right text-xs text-[#aaa]">
                ›
              </td>
            </tr>
          </tbody>
        </table>

        <div class="border-t border-[#eee] p-3 flex items-center justify-between text-xs text-[#777]">
          <span>Showing 1–{{ paginatedApplications.length }} of {{ filteredApplications.length }} applications</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="currentPage === 1"
              @click="currentPage--"
              class="rounded px-2 py-1 border text-xs font-semibold disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span class="rounded bg-[#6b0207] px-2 py-0.5 text-xs font-bold text-white">{{ currentPage }}</span>
            <span class="text-xs text-[#888]">of {{ totalPages }}</span>
            <button
              type="button"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
              class="rounded px-2 py-1 border text-xs font-semibold disabled:opacity-40 hover:bg-gray-50"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div v-if="selectedApp" class="lg:col-span-5 rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-xs space-y-6">

        <div class="flex items-start justify-between border-b border-[#eee] pb-4">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-rose-700">SELECTED APPLICATION</p>
            <h2 class="mt-1 text-xl font-extrabold text-[#111]">{{ selectedApp.full_name }}</h2>
            <p class="text-[11px] text-[#888]">application_id: {{ selectedApp.app_id }} · org_id: {{ selectedApp.org_id }}</p>
          </div>

          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
            :class="{
              'bg-amber-50 text-amber-700': selectedApp.status === 'pending',
              'bg-emerald-50 text-emerald-700': selectedApp.status === 'approved',
              'bg-rose-50 text-rose-700': selectedApp.status === 'declined',
            }"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="{
                'bg-amber-500': selectedApp.status === 'pending',
                'bg-emerald-500': selectedApp.status === 'approved',
                'bg-rose-500': selectedApp.status === 'declined',
              }"
            ></span>
            {{ selectedApp.status }}
          </span>
        </div>

        <div>
          <h3 class="text-xs font-bold text-[#111]">Applicant information</h3>
          <div class="mt-3 grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
            <div>
              <p class="text-[10px] font-semibold text-[#888] uppercase">FULL NAME</p>
              <p class="mt-0.5 font-medium text-[#222]">{{ selectedApp.full_name }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold text-[#888] uppercase">EMAIL</p>
              <p class="mt-0.5 font-medium text-[#222] break-all">{{ selectedApp.email }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold text-[#888] uppercase">CONTACT NO.</p>
              <p class="mt-0.5 font-medium text-[#222]">{{ selectedApp.contact_no || "+63 917 842 1630" }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold text-[#888] uppercase">FB_URL</p>
              <a
                v-if="selectedApp.fb_url"
                :href="'https://' + selectedApp.fb_url.replace('https://', '')"
                target="_blank"
                class="mt-0.5 block font-semibold text-rose-700 underline truncate"
              >
                {{ selectedApp.fb_url }}
              </a>
              <span v-else class="text-[#888]">—</span>
            </div>
          </div>
        </div>

        <div class="border-t border-[#eee] pt-4">
          <h3 class="text-xs font-bold text-[#111]">Application record</h3>
          <div class="mt-3 grid grid-cols-3 gap-3 text-xs">
            <div>
              <p class="text-[10px] font-semibold text-[#888] uppercase">APPLICATION_ID</p>
              <p class="mt-0.5 font-medium text-[#222]">{{ selectedApp.app_id }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold text-[#888] uppercase">STUDENT_ID</p>
              <p class="mt-0.5 font-medium text-[#222]">{{ selectedApp.student_id }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold text-[#888] uppercase">ORG</p>
              <p class="mt-0.5 font-medium text-[#222] truncate">{{ orgName }}</p>
            </div>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p class="text-[10px] font-semibold text-[#888] uppercase">CREATED AT</p>
              <p class="mt-0.5 text-[#333]">{{ formatDateTime(selectedApp.created_at) }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold text-[#888] uppercase">UPDATED AT</p>
              <p class="mt-0.5 text-[#333]">{{ formatDateTime(selectedApp.updated_at || selectedApp.created_at) }}</p>
            </div>
          </div>
        </div>

        <div class="border-t border-[#eee] pt-4">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-[#111]">Update status</span>
            <span class="text-[11px] text-[#888]">Current: <strong class="capitalize">{{ selectedApp.status }}</strong></span>
          </div>

          <div class="mt-2.5 grid grid-cols-3 gap-2">
            <button
              type="button"
              @click="draftStatus = 'pending'"
              class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition"
              :class="draftStatus === 'pending' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-[#e0e0e0] bg-white text-[#666] hover:bg-gray-50'"
            >
              <Clock class="h-3.5 w-3.5" />
              <span>Pending</span>
            </button>
            <button
              type="button"
              @click="draftStatus = 'approved'"
              class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition"
              :class="draftStatus === 'approved' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-[#e0e0e0] bg-white text-[#666] hover:bg-gray-50'"
            >
              <Check class="h-3.5 w-3.5" />
              <span>Approved</span>
            </button>
            <button
              type="button"
              @click="draftStatus = 'declined'"
              class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition"
              :class="draftStatus === 'declined' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-[#e0e0e0] bg-white text-[#666] hover:bg-gray-50'"
            >
              <Times class="h-3.5 w-3.5" />
              <span>Declined</span>
            </button>
          </div>
        </div>

        <div class="border-t border-[#eee] pt-4">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-[#111]">Officer notes</span>
            <span class="text-[10px] text-[#888]">custom_notes</span>
          </div>
          <textarea
            v-model="draftNotes"
            rows="3"
            placeholder="Portfolio link received through Facebook. Review during next officer meeting."
            class="mt-2 w-full rounded-lg bg-[#f1f1f1] p-3 text-xs leading-relaxed text-[#222] outline-none focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
          ></textarea>
          <p class="mt-1 text-[10px] text-[#888]">These notes are for officers and are saved with this application record.</p>
        </div>

        <div class="border-t border-[#eee] pt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            @click="quickUpdate('declined')"
            class="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Times class="h-3.5 w-3.5" />
            <span>Decline</span>
          </button>
          <button
            type="button"
            @click="quickUpdate('approved')"
            class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            <Check class="h-3.5 w-3.5" />
            <span>Approve</span>
          </button>
          <button
            type="button"
            :disabled="isSaving"
            @click="saveStatusAndNotes"
            class="inline-flex items-center gap-1.5 rounded-lg bg-[#6b0207] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#520105] disabled:opacity-60 shadow-xs"
          >
            <Save class="h-3.5 w-3.5" />
            <span>{{ isSaving ? "Saving..." : "Save status & notes" }}</span>
          </button>
        </div>

      </div>
    </div>
  </main>
</template>
