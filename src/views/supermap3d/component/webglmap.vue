<template>
  <!-- 不能设置位置 -->
  <div id="SuperMap3DContainer" class="supermap3d-container" />
</template>

<script setup lang="ts">
import layers from "./layers";
import { onMounted, ref } from "vue";
declare const SuperMap3D: any; //避免找不到名称“SuperMap3D”报错
import { getLayertree } from "@/api/supermap3dApi";

var tiandituToken = "e2c4a8d8f10bd9aeec58f4dd88bb9bf2";

/* 声明全局变量,允许其它组件可直接操作地图要素 */
declare global {
  interface Window {
    viewer: any;
    scene: any;
  }
}

onMounted(() => {
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
  var tianDiTuImageProvider = new SuperMap3D.TiandituImageryProvider({
    // 通过修改mapStyle修改服务类型
    mapStyle: SuperMap3D.TiandituMapsStyle.IMG_C,
    token: tiandituToken
  });
  var tianDiTuZjProvider = new SuperMap3D.TiandituImageryProvider({
    mapStyle: SuperMap3D.TiandituMapsStyle.CIA_C,
    token: tiandituToken
  });
  viewer.imageryLayers.addImageryProvider(tianDiTuImageProvider);
  // viewer.imageryLayers.addImageryProvider(tianDiTuZjProvider);
  var imageryLayers = viewer.imageryLayers;

  /* 修改图层样式 */
  var viewModel = ref({
    brightness: 1,
    contrast: 1,
    hue: 1,
    saturation: 1,
    gamma: 1,
    alpha: 1
  });
  function subscribeLayerParameter() {
    var layer;
    if (imageryLayers.length > 1) {
      // 使用get方法获取图层
      layer = imageryLayers.get(1);
      console.log("获得1级图层");
    } else {
      layer = imageryLayers.get(0);
      console.log("获得0级图层");
    }
    // 设置图层样式
    layer.brightness = viewModel.value.brightness;
    layer.contrast = viewModel.value.contrast;
    layer.hue = viewModel.value.hue;
    layer.saturation = viewModel.value.saturation;
    layer.gamma = viewModel.value.gamma;
    layer.alpha = viewModel.value.alpha;
  }
  subscribeLayerParameter();

  var imageType = "s3m";
  var provider;
  var restLayer;
  var s3mPromise;
  switch (imageType) {
    /* 超图工作空间rest地图服务,正常加载 */
    case "rest": {
      // 影像提供者，类似于数据源
      provider = new SuperMap3D.SuperMapImageryProvider({
        url: "http://10.33.13.206:30121/iserver/services/map-QTJshp/rest/maps/T50km2new%40QTJshp",
        name: "50平方公里河流"
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
      // addS3MTilesLayerByScp通过读取.scp（配置文件）来加载影像，返回的是promise
      s3mPromise = viewer.scene.addS3MTilesLayerByScp(
        "http://10.33.13.206:30121/iserver/services/lanjiangdifangqx3/rest/realspace/datas/Combine/config",
        {
          name: "北支江水面"
        }
      );
      SuperMap3D.when(s3mPromise, function (layer) {
        viewer.flyTo(layer);
        viewer.scene.multiViewportMode = SuperMap3D.MultiViewportMode.VERTICAL;
        console.log("完成分屏");
        // 仅包含场景中三维瓦片的几何
        var beizhijiang = viewer.scene.layers.find("北支江水面");
        beizhijiang.setVisibleInViewport(1, false);
      });
      break;
    }
    // 地形服务，发布成三维rest服务,正常加载
    case "terrain": {
      const terrainProvider = new SuperMap3D.SuperMapTerrainProvider({
        Name: "地形",
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
      // 不可flyto,返回的不是promise
      var layer = viewer.scene.addVectorTilesMap({
        url: "http://10.33.13.208:8090/iserver/services/map-mvt-T1000km2/restjsr/v1/vectortile/maps/T1000km2",
        canvasWidth: 512,
        name: "1000平方米河流",
        viewer: viewer
      });
      // 图层为异步加载，直接获取图层属性值为空值
      var promise = layer.readyPromise;
      SuperMap3D.when(promise, data => {
        var bounds = layer.rectangle;
        viewer.scene.camera.setView({
          destination: new SuperMap3D.Cartesian3.fromRadians(
            (bounds.east + bounds.west) * 0.5,
            (bounds.north + bounds.south) * 0.5,
            1000000
          ),
          orientation: {
            heading: 0,
            roll: 0
          }
        });
      });

      // 读取矢量瓦片属性，仅矢量瓦片有效
      viewer.selectedEntityChanged.addEventListener(entity => {
        console.log(entity.pickResult);
      });
      break;
    }
    // 打开三维场景，工作空间发三维服务
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
