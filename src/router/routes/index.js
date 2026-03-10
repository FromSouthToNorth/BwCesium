export const RootRoute = {
  path: '/',
  name: 'Root',
  redirect: '/groupAndCompany',
  meta: {
    title: 'Root',
  },
}

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
    {
      path: '/three',
      name: 'Three',
      component: () => import('@/views/Three.vue'),
      meta: {
        title: 'Three',
      },
    },
  ],
}

export const basicRoutes = [
  RootRoute,
  IndexRoute,
]
