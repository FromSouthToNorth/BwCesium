export const IndexRoute = {
  path: '/',
  name: 'Index',
  component: () => import('@/layouts/default/index.vue'),
  redirect: '/groupAndCompany',
  meta: {
    title: 'Index',
  },
  children: [
    {
      path: '/groupAndCompany',
      name: 'map',
      component: () => import('@/views/groupAndCompany.vue'),
      meta: {
        title: '一张图',
      },
    },
  ],
}

export const basicRoutes = [
  IndexRoute,
]
