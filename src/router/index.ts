import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import UserView from "@/Views/UserView/UserView.vue";
import OrgView from "@/Views/UserView/OrgView/OrgView.vue";
import AdminView from "@/Views/AdminView/AdminView.vue";
import OfficerView from "@/Views/Officerview/OfficerView.vue";
import CreateOrg from "@/Views/AdminView/CreateOrg.vue";
import AccountDirectory from "@/Views/AdminView/AccountDirectory.vue";
import AddAccounts from "@/Views/AdminView/AddAccounts.vue";
import EditOrgPfp from "@/Views/Officerview/EditOrgPfp.vue";
import MemberRoster from "@/Views/Officerview/MemberRoster.vue";
import Applications from "@/Views/Officerview/Applications.vue";
import ManageOrgPosts from "@/Views/Officerview/ManageOrgPosts.vue";


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
    {
      path: "/admin/create-org",
      name: "admin-create-org",
      component: CreateOrg,
      meta: { requiresAuth: true },
    },
    {
      path: "/admin/accounts",
      name: "admin-accounts",
      component: AccountDirectory,
      meta: { requiresAuth: true },
    },
    {
      path: "/admin/add-account",
      name: "admin-add-account",
      component: AddAccounts,
      meta: { requiresAuth: true },
    },

  {
      path: "/officer",
      name: "officer-dashboard",
      component: OfficerView,
      meta: { requiresAuth: true },
    },
    {
      path: "/officer/edit-profile",
      name: "officer-edit-profile",
      component: EditOrgPfp,
      meta: { requiresAuth: true },
    },
    {
      path: "/officer/members",
      name: "officer-members",
      component: MemberRoster,
      meta: { requiresAuth: true },
    },
    {
      path: "/officer/applications",
      name: "officer-applications",
      component: Applications,
      meta: { requiresAuth: true },
    },
    {
      path: "/officer/posts",
      name: "officer-posts",
      component: ManageOrgPosts,
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
