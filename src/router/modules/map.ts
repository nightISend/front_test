export default {
  path: "/",
  meta: {
    title: "地图"
  },
  children: [
    {
      path: "/cesium/index.vue",
      name: "cesiumRouter",
      component: () => import("@/views/cesium/index.vue"),
      meta: {
        title: "cesium3D地图",
        showParent: true
      }
    },
    {
      path: "/ol/index.vue",
      name: "olRouter",
      component: () => import("@/views/ol/index.vue"),
      meta: {
        title: "openlayers2D地图",
        showParent: true
      }
    },
    {
      path: "/supermap3d/index.vue",
      name: "supermapRouter",
      component: () => import("@/views/supermap3d/index.vue"),
      meta: {
        title: "supermap3d地图",
        showParent: true
      }
    }
  ]
};
