export default {
  path: "/cesium",
  meta: {
    title: "webgl"
  },
  children: [
    {
      path: "/webgl/index.vue",
      name: "Webgl",
      component: () => import("@/views/webgl/index.vue"),
      meta: {
        title: "webgl练习",
        showParent: true
      }
    }
  ]
};
