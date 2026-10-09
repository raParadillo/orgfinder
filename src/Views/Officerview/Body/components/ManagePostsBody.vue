<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { supabase } from "@/lib/supabaseClient";
import { PlusCircle, FileEdit, Times, Trash } from "@primeicons/vue";

type Post = {
  post_id: number;
  org_id: number;
  title: string;
  content: string;
  category?: string;
  image_url?: string;
  created_at: string;
};

const posts = ref<Post[]>([]);
const isLoading = ref(true);
const orgId = ref<number | null>(null);
const orgName = ref("");

// Modal states
const showCreateModal = ref(false);
const isSaving = ref(false);
const postTitle = ref("");
const postCategory = ref("announcement");
const postContent = ref("");
const postImageUrl = ref("");

async function loadPosts() {
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

      const [
        { data: postsData, error: postsError },
        { data: imagesData }
      ] = await Promise.all([
        supabase
          .from("posts")
          .select("*")
          .eq("org_id", userData.org_id)
          .order("created_at", { ascending: false }),
        supabase.from("posts_images").select("post_id, img_url"),
      ]);

      if (postsData && !postsError) {
        const imageByPost = new Map((imagesData ?? []).map((img) => [img.post_id, img.img_url]));
        posts.value = postsData.map((p) => ({
          ...p,
          image_url: imageByPost.get(p.post_id) || undefined,
        }));
      }
    }
  }
  isLoading.value = false;
}


async function createPost() {
  if (!postTitle.value.trim() || !orgId.value) return;

  isSaving.value = true;

  // 1. Insert into posts table
  const { data: newPost, error: postError } = await supabase
    .from("posts")
    .insert([
      {
        org_id: orgId.value,
        title: postTitle.value.trim(),
        content: postContent.value.trim(),
        category: postCategory.value,
      },
    ])
    .select()
    .single();

  if (newPost && !postError) {
    const imgUrl = postImageUrl.value.trim();

    // 2. If image URL was provided, insert into posts_images
    if (imgUrl) {
      await supabase.from("posts_images").insert([
        {
          post_id: newPost.post_id,
          img_url: imgUrl,
        },
      ]);
      newPost.image_url = imgUrl;
    }

    posts.value.unshift(newPost);
    showCreateModal.value = false;
    postTitle.value = "";
    postContent.value = "";
    postImageUrl.value = "";
    postCategory.value = "Announcement";
  } else if (postError) {
    console.error("Error creating post:", postError.message);
  }

  isSaving.value = false;
}


async function deletePost(postId: number) {
  if (!confirm("Are you sure you want to delete this post?")) return;

  const { error } = await supabase.from("posts").delete().eq("post_id", postId);
  if (!error) {
    posts.value = posts.value.filter((p) => p.post_id !== postId);
  }
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

onMounted(() => {
  loadPosts();
});
</script>

<template>
  <main class="flex-1 h-full overflow-y-auto bg-white p-8 font-sans">
    <!-- Header Row -->
    <div class="flex flex-col justify-between gap-4 border-b border-[#eee] pb-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-3xl font-extrabold text-[#1a1a1a]">Manage Posts</h1>
        <p class="mt-1 text-xs text-[#777]">
          {{ orgName || "Collegiate Film & Photo" }} · Publish announcements, event schedules, and recruitment updates.
        </p>
      </div>

      <button
        type="button"
        @click="showCreateModal = true"
        class="inline-flex items-center gap-2 rounded-lg bg-[#6b0207] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#520105] shadow-sm"
      >
        <PlusCircle class="h-3.5 w-3.5" />
        <span>Create New Post</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-16 text-center text-xs text-gray-500">
      Loading posts...
    </div>

    <!-- Posts Grid -->
    <div v-else-if="posts.length > 0" class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="post in posts"
        :key="post.post_id"
        class="flex flex-col rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-xs transition hover:shadow-md"
      >
        <div class="flex items-center justify-between text-xs text-[#888]">
          <span class="rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-[10px] font-bold text-[#555]">
            {{ post.category || "Announcement" }}
          </span>
          <span>{{ formatDate(post.created_at) }}</span>
        </div>

        <h3 class="mt-3 text-base font-bold text-[#111] line-clamp-2">{{ post.title }}</h3>
        <p class="mt-2 text-xs text-[#666] line-clamp-3 flex-1 leading-relaxed">{{ post.content }}</p>

        <div v-if="post.image_url" class="mt-3 h-32 w-full overflow-hidden rounded-lg bg-gray-100">
          <img :src="post.image_url" alt="Post attachment" class="h-full w-full object-cover" />
        </div>

        <div class="mt-4 pt-3 border-t border-[#f0f0f0] flex items-center justify-end gap-2">
          <button
            type="button"
            @click="deletePost(post.post_id)"
            class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
          >
            <Trash class="h-3 w-3" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="mt-12 rounded-2xl border border-dashed border-[#ddd] p-16 text-center"
    >
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f5f5] text-gray-400">
        <FileEdit class="h-6 w-6" />
      </div>
      <h3 class="mt-4 text-sm font-bold text-[#222]">No posts published yet</h3>
      <p class="mt-1 text-xs text-[#888]">Create your first post to announce events and engage student members.</p>
      <button
        type="button"
        @click="showCreateModal = true"
        class="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#6b0207] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#520105]"
      >
        <PlusCircle class="h-3.5 w-3.5" />
        <span>Create New Post</span>
      </button>
    </div>

    <!-- Create Post Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div class="flex items-center justify-between border-b border-[#eee] pb-3">
          <h2 class="text-base font-bold text-[#222]">Create New Announcement / Post</h2>
          <button
            type="button"
            @click="showCreateModal = false"
            class="flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            <Times class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="createPost" class="mt-4 space-y-4">
          <div>
            <label class="block text-xs font-bold text-[#333]">Post Title *</label>
            <input
              v-model="postTitle"
              type="text"
              required
              placeholder="e.g. General Assembly & Workshop Schedule"
              class="mt-1 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2 text-xs text-[#222] outline-none focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-[#333]">Category</label>
            <select v-model="postCategory"
            class="mt-1 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2 text-xs text-[#222] outline-none focus:bg-white focus:ring-1 focus:ring-[#6b0207]">
              <option value="announcement">Announcement</option>
              <option value="event">Event</option>
              <option value="workshop">Workshop</option>
              <option value="recruitment">Recruitment</option>
              <option value="general">General</option>
            </select>

          </div>

          <div>
            <label class="block text-xs font-bold text-[#333]">Content</label>
            <textarea
              v-model="postContent"
              rows="4"
              placeholder="Write your post content here..."
              class="mt-1 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2 text-xs text-[#222] outline-none focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
            ></textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-[#333]">Image URL (Optional)</label>
            <input
              v-model="postImageUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              class="mt-1 w-full rounded-lg bg-[#f1f1f1] px-3.5 py-2 text-xs text-[#222] outline-none focus:bg-white focus:ring-1 focus:ring-[#6b0207]"
            />
          </div>

          <div class="mt-6 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              @click="showCreateModal = false"
              class="rounded-lg px-4 py-2 text-xs font-semibold text-[#555] hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSaving || !postTitle.trim()"
              class="rounded-lg bg-[#6b0207] px-4 py-2 text-xs font-bold text-white hover:bg-[#520105] disabled:opacity-50"
            >
              {{ isSaving ? "Publishing..." : "Publish Post" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>
