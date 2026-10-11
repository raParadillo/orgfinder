<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { supabase } from "@/lib/supabaseClient";
import { convertImageToWebp } from "@/lib/imageUpload";
import { PlusCircle, FileEdit, Times, Trash } from "@primeicons/vue";

type Post = {
  post_id: number;
  org_id: number;
  title: string;
  content: string;
  category?: string;
  image_url?: string | null;
  created_at: string;
};

const posts = ref<Post[]>([]);
const isLoading = ref(true);
const orgId = ref<number | null>(null);
const orgName = ref("");

const showCreateModal = ref(false);
const isSaving = ref(false);
const postTitle = ref("");
const postCategory = ref("announcement");
const postContent = ref("");
const postImageFile = ref<File | null>(null);
const postImagePreview = ref("");
const formError = ref("");
const loadError = ref("");
const deleteError = ref("");

function getPostImagePath(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const bucketMarker = "/post-images/";
    const markerIndex = url.pathname.indexOf(bucketMarker);
    if (markerIndex === -1) return null;

    const path = decodeURIComponent(url.pathname.slice(markerIndex + bucketMarker.length));
    return path || null;
  } catch {
    return null;
  }
}

async function loadPosts() {
  isLoading.value = true;
  loadError.value = "";
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
        { data: imagesData, error: imagesError },
      ] = await Promise.all([
        supabase
          .from("posts")
          .select("*")
          .eq("org_id", userData.org_id)
          .order("created_at", { ascending: false }),
        supabase.from("post_images").select("post_id, img_url"),
      ]);

      if (postsError || imagesError) {
        loadError.value = (postsError || imagesError)?.message || "Unable to load posts.";
      } else if (postsData) {
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
  formError.value = "";

  let uploadedImagePath = "";
  let imageUrl = "";

  if (postImageFile.value) {
    let webpImage: File;
    try {
      webpImage = await convertImageToWebp(postImageFile.value);
    } catch (conversionError) {
      formError.value = conversionError instanceof Error
        ? conversionError.message
        : "Unable to convert the post image to WebP.";
      isSaving.value = false;
      return;
    }

    uploadedImagePath = `org-${orgId.value}/${Date.now()}-${crypto.randomUUID()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(uploadedImagePath, webpImage, { contentType: "image/webp" });

    if (uploadError) {
      formError.value = uploadError.message || "Unable to upload the post image.";
      isSaving.value = false;
      return;
    }

    const { data: publicImage } = supabase.storage
      .from("post-images")
      .getPublicUrl(uploadedImagePath);
    imageUrl = publicImage.publicUrl;
  }

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
    if (imageUrl) {
      const { error: imageError } = await supabase.from("post_images").insert([
        {
          post_id: newPost.post_id,
          img_url: imageUrl,
        },
      ]);

      if (imageError) {
        await supabase.from("posts").delete().eq("post_id", newPost.post_id);
        await supabase.storage.from("post-images").remove([uploadedImagePath]);
        formError.value = imageError.message || "Unable to save the post image.";
        isSaving.value = false;
        return;
      } else {
        newPost.image_url = imageUrl;
      }
    }

    posts.value.unshift(newPost);
    showCreateModal.value = false;
    postTitle.value = "";
    postContent.value = "";
    postImageFile.value = null;
    postImagePreview.value = "";
    postCategory.value = "announcement";
  } else if (postError) {
    if (uploadedImagePath) {
      await supabase.storage.from("post-images").remove([uploadedImagePath]);
    }
    formError.value = postError.message || "Unable to create the post.";
  }

  isSaving.value = false;
}

function handlePostImageUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  formError.value = "";
  if (!file.type.startsWith("image/")) {
    formError.value = "Please select an image file.";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    formError.value = "The image must be 5 MB or smaller.";
    return;
  }

  postImageFile.value = file;
  postImagePreview.value = URL.createObjectURL(file);
}

function clearPostImage() {
  postImageFile.value = null;
  postImagePreview.value = "";
}


async function deletePost(postId: number) {
  if (!confirm("Are you sure you want to delete this post?")) return;

  deleteError.value = "";
  const post = posts.value.find((item) => item.post_id === postId);
  const { data: imageRecord, error: imageLookupError } = await supabase
    .from("post_images")
    .select("img_url")
    .eq("post_id", postId)
    .maybeSingle();

  if (imageLookupError) {
    deleteError.value = `Could not find the post image: ${imageLookupError.message}`;
    return;
  }

  const imagePath = getPostImagePath(imageRecord?.img_url || post?.image_url);
  const imageUrl = imageRecord?.img_url || post?.image_url;

  if (imageUrl && !imagePath) {
    deleteError.value = "The post image URL does not point to the post-images bucket.";
    return;
  }

  if (imagePath) {
    const { error: imageError } = await supabase.storage
      .from("post-images")
      .remove([imagePath]);

    if (imageError) {
      deleteError.value = `Could not delete the post image: ${imageError.message}`;
      return;
    }

    const lastSlash = imagePath.lastIndexOf("/");
    const imageFolder = lastSlash === -1 ? "" : imagePath.slice(0, lastSlash);
    const imageName = lastSlash === -1 ? imagePath : imagePath.slice(lastSlash + 1);
    const { data: remainingFiles, error: verifyError } = await supabase.storage
      .from("post-images")
      .list(imageFolder, { search: imageName, limit: 10 });

    if (verifyError) {
      deleteError.value = `Post image deletion could not be verified: ${verifyError.message}`;
      return;
    }

    if (remainingFiles?.some((file) => file.name === imageName)) {
      deleteError.value = "Supabase did not remove the post image. Check the scoped Storage policies.";
      return;
    }
  }

  const { error: imageRecordError } = await supabase
    .from("post_images")
    .delete()
    .eq("post_id", postId);

  if (imageRecordError) {
    deleteError.value = `Could not delete the post image record: ${imageRecordError.message}`;
    return;
  }

  const { error: postError } = await supabase.from("posts").delete().eq("post_id", postId);
  if (postError) {
    deleteError.value = postError.message || "Unable to delete the post.";
    return;
  }

  posts.value = posts.value.filter((item) => item.post_id !== postId);
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

    <div v-if="isLoading" class="py-16 text-center text-xs text-gray-500">
      Loading posts...
    </div>
    <div v-else-if="loadError" class="mt-6 rounded-lg bg-red-50 p-4 text-xs font-semibold text-red-700">
      {{ loadError }}
    </div>
    <div v-if="deleteError" class="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
      {{ deleteError }}
    </div>
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

        <RouterLink
          v-if="orgId"
          :to="`/org/${orgId}/post/${post.post_id}`"
          class="mt-4 inline-block text-xs font-bold text-[#6b0207] no-underline hover:underline"
        >
          Read full story →
        </RouterLink>

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
            <label class="block text-xs font-bold text-[#333]">Post image (Optional)</label>
            <div class="mt-1 rounded-lg border border-dashed border-[#d5d5d5] p-3">
              <div v-if="postImagePreview" class="mb-3 flex items-center gap-3">
                <img
                  :src="postImagePreview"
                  alt="Selected post preview"
                  class="h-16 w-16 rounded-lg object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-semibold text-[#333]">{{ postImageFile?.name }}</p>
                  <button
                    type="button"
                    class="mt-1 text-[11px] font-semibold text-[#6b0207] hover:underline"
                    @click="clearPostImage"
                  >
                    Remove image
                  </button>
                </div>
              </div>
              <label class="inline-flex cursor-pointer items-center rounded-lg border border-[#d5d5d5] bg-white px-3.5 py-2 text-xs font-semibold text-[#333] transition hover:bg-gray-50">
                <span>{{ postImageFile ? "Choose another image" : "Upload image" }}</span>
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handlePostImageUpload"
                />
              </label>
              <p class="mt-2 text-[10px] text-[#999]">JPG, PNG, or GIF · Max 5 MB</p>
            </div>
          </div>

          <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {{ formError }}
          </p>

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
