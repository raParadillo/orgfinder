import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import UserView from "@/Views/UserView/UserView.vue";
import OrgView from "@/Views/UserView/OrgView/OrgView.vue";
import AdminView from "@/Views/AdminView/AdminView.vue";
import OfficerView from "@/Views/Officerview/OfficerView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "user-home",
      component: UserView,
    },
    {
      path: "/login",
      name: "login",
      component: UserView,
    },
    {
      path: "/org/:id",
      name: "organization-detail",
      component: OrgView,
    },
    {
      path: "/admin",
      name: "admin",
      component: AdminView,
      meta: { requiresAuth: true },
    },
    {
      path: "/officer",
      name: "officer",
      component: OfficerView,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true;

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    return { name: "user-home" };
  }

  return true;
});

export default router;
