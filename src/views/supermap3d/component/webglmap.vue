<template>
  <!-- 不能设置位置 -->
  <div id="SuperMap3DContainer" class="supermap3d-container" />
</template>

<script setup lang="ts">
import layers from "./layers";
import { onMounted } from "vue";

var tiandituToken = "e2c4a8d8f10bd9aeec58f4dd88bb9bf2";

/* 声明全局变量,允许其它组件可直接操作地图要素 */
declare global {
  interface Window {
    viewer: any;
    scene: any;
  }
}

onMounted(() => {
  /* 忽略该报错 */
  loadMap(SuperMap3D);
});

function loadMap(SuperMap3D) {
  var viewer = new SuperMap3D.Viewer("SuperMap3DContainer", {
    contextOptions: {
      contextType: 2 // Webgl2:2 ; WebGPU:3
    }
  });
  window.viewer = viewer;
  window.scene = viewer.scene;

  /* 添加天地图影像 */
  viewer.imageryLayers.addImageryProvider(
    new SuperMap3D.TiandituImageryProvider({
      // 通过修改mapStyle修改服务类型
      mapStyle: SuperMap3D.TiandituMapsStyle.IMG_C,
      token: tiandituToken
    })
  );
  var imageryLayers = viewer.imageryLayers;

  var imageType = "";
  var provider;
  var restLayer;
  switch (imageType) {
    /* 超图工作空间rest地图服务,正常加载 */
    case "rest": {
      // 影像提供者，类似于数据源
      provider = new SuperMap3D.SuperMapImageryProvider({
        url: "http://10.33.13.206:30121/iserver/services/map-QTJshp/rest/maps/T50km2new%40QTJshp"
      });
      // model.ancestorMaximumLevel = 2;
      restLayer = viewer.imageryLayers.addImageryProvider(provider); // 保存引用
      // restLayer.ancestorMaximumLevel = 2;

      // flyTo 直接缩放到图层
      viewer.flyTo(restLayer);
      break;
    }
    // 三维瓦片服务，发布成三维rest服务,正常加载
    case "s3m": {
      // addS3MTilesLayerByScp通过读取.scp（配置文件）来加载影像
      const promise = viewer.scene.addS3MTilesLayerByScp(
        "http://10.33.13.206:30121/iserver/services/lanjiangdifangqx3/rest/realspace/datas/Combine/config",
        {
          name: "北支江水面"
        }
      );
      promise.then(layer => {
        console.log(layer);
        viewer.flyTo(layer);
      });
      break;
    }
    // 地形服务，发布成三维rest服务,正常加载
    case "terrain": {
      const terrainProvider = new SuperMap3D.SuperMapTerrainProvider({
        url: "http://10.33.13.206:30121/iserver/services/zjdem0723/rest/realspace/datas/%E6%B5%99%E6%B1%9F%E7%9C%81DOM",
        // requestWaterMask: true,
        // requestVertexNormals: true,
        isSct: true
        // invisibility: true
      });
      viewer.terrainProvider = terrainProvider;
      break;
    }
    // 矢量瓦片服务，发服务选则mvt矢量服务，除了切成瓦片后发布，也可以数据源选工作空间，服务类型选矢量瓦片
    case "mvt": {
      // 不可flyto
      var layer = viewer.scene.addVectorTilesMap({
        url: "http://10.33.13.208:8090/iserver/services/map-stations/restjsr/v1/vectortile/maps/stations",
        canvasWidth: 512,
        name: "站点注记",
        viewer: viewer
      });
      break;
    }
    // 场景，工作空间发三维服务
    case "scene": {
      const promise = viewer.scene.open(
        "http://10.33.13.206:30121/iserver/services/yanshi/rest/realspace",
        undefined,
        {
          autoSetView: true
        }
      );
      promise.then(layer => {
        console.log(layer);
      });
      break;
    }
  }
}
</script>
<style>
.supermap3d-container {
  width: 100%;
  height: 100%;
}
</style>
