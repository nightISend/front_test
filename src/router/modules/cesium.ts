export default {
  path: "/cesium",
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
    }
  ]
};
