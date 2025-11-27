import { createRouter, createWebHistory } from 'vue-router';

const Home = () => import('./views/Home.vue');
const Admin = () => import('./views/Admin.vue');
const BookmarkManager = () => import('./views/BookmarkManager.vue');

const routes = [
  { path: '/', component: Home },
  { path: '/admin', component: Admin },
  { path: '/bookmarks', component: BookmarkManager }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router; 