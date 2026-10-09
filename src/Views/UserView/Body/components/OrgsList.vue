<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"

type Organization = {
	id: string
	acronym: string
	name: string
	category: string
	description: string
	logo_url: string | null
	members?: number
}

const props = withDefaults(
	defineProps<{
		title?: string
		organizations: Organization[]
		showArchive?: boolean
	}>(),
	{
		title: "Explore Guilds",
		showArchive: false,
	},
)



const visibleCount = ref(12)
const loadMoreTrigger = ref<HTMLElement | null>(null)
const visibleOrganizations = computed(() => props.organizations.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < props.organizations.length)

function loadMore() {
	visibleCount.value = Math.min(visibleCount.value + 6, props.organizations.length)
}

const observer = new IntersectionObserver(
	(entries) => {
		if (entries[0]?.isIntersecting && hasMore.value) loadMore()
	},
	{ rootMargin: "160px" },
)

watch(
	() => props.organizations,
	() => {
		visibleCount.value = 6
	},
)

const emit = defineEmits<{
	view: [organization: Organization]
	archive: [organization: Organization]
}>()

watch(loadMoreTrigger, (element) => {
	if (element) observer.observe(element)
}, { flush: "post" })

onBeforeUnmount(() => observer.disconnect())
</script>

<template>
	<section class="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-2" aria-labelledby="organization-list-title">
		<div class="mb-2 flex w-full items-center gap-2 rounded-lg border border-[#e4e4e4] bg-white px-3 py-2 shadow-sm">
			<h2 id="organization-list-title" class="text-xs font-semibold text-[#333]">{{ title }}</h2>
		</div>

		<div v-if="organizations.length" class="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<article
				v-for="organization in visibleOrganizations"
				:key="organization.id"
				class="group flex min-h-44 flex-col rounded-lg border border-[#e4e4e4] bg-white p-3 transition duration-200 ease-out hover:-translate-y-1 hover:bg-rose-50 hover:shadow-md"
			>
				<div class="flex items-start gap-2">
					<img
						v-if="organization.logo_url"
						class="size-8 shrink-0 rounded object-cover"
						:src="organization.logo_url"
						@error="organization.logo_url = null"
						:alt="`${organization.name} logo`"
					/>
					<span v-else class="rounded bg-[#1d1d1d] px-1.5 py-1 text-[0.6rem] font-bold text-[#ffca28]">
						{{ organization.acronym }}
					</span>
					<h3 class="pt-0.5 text-[0.68rem] font-bold leading-tight text-[#292929]">
						{{ organization.name }}
					</h3>
					<p class="mt-2 w-fit rounded-full bg-[#f1f1f1]  p-1.5 py-0.5 text-[0.55rem] font-semibold uppercase text-[#777]">
					{{ organization.category }}
				</p>
				</div>
				

				<p class="mt-2 flex-1 text-[0.62rem] leading-relaxed text-[#777]">
					{{ organization.description }}
				</p>

				<p v-if="organization.members !== undefined" class="mb-2 text-[0.6rem] font-semibold text-emerald-600">
					{{ organization.members }} members
				</p>

				<div class="flex items-center justify-center gap-2">
					<button
						class="rounded bg-[#f1f1f1] px-2 py-1.5 text-[0.6rem] font-semibold text-[#555] transition hover:bg-[#dedede]"
						type="button"
						@click="emit('view', organization)"
					>
						View
					</button>

					<button v-if="showArchive"
						class="rounded bg-rose-100 px-2 py-1.5 text-[0.6rem] font-semibold text-[#8f0c12] transition hover:bg-rose-200"
						type="button"
						@click="emit('archive', organization)"
					>
						Archive
					</button>
			
				</div>
			</article>
		</div>

		<div v-if="hasMore" ref="loadMoreTrigger" class="py-4 text-center text-xs text-[#777]">
			Loading more organizations...
		</div>

		<p v-if="!organizations.length" class="w-full rounded-lg border border-dashed border-[#d8d8d8] bg-white p-8 text-center text-sm text-[#777]">
			No organizations found.
		</p>
	</section>
</template>
