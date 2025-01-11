<script setup lang="ts">
defineOptions({
  name: "cesiumRouter"
});

import { onMounted, watch, ref } from "vue";

onMounted(() => {
  loadMap();
});
// The URL on your server where CesiumJS"s static files are hosted.
(window as any).CESIUM_BASE_URL = "node_modules/cesium/Build/Cesium";

import {
  Cartesian3,
  ClockRange,
  Ion,
  Math as CesiumMath,
  Terrain,
  Viewer,
  WebMapTileServiceImageryProvider,
  Color,
  SampledPositionProperty,
  JulianDate,
  VelocityOrientationProperty,
  PolylineGlowMaterialProperty,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

//允许echart显示在地图上，但typescript似乎不适用
import EchartsLayer from "@naivemap/mapbox-gl-echarts-layer";
// import { STYLE } from "../../../utils/constant";

import { http } from "@/utils/http";
import { baseUrlApi } from "@/api/utils";

Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkNWZkODE2Ny02ZmEzLTQ2NzYtOTI3Ny03NjU4ZGQ0OGNjZTIiLCJpZCI6MjQxOTQ5LCJpYXQiOjE3MjY0OTMxMjZ9.VczJoKbH4q7J4qNvR8nKzB-ea4wAFXIerWmr9dJYbgY";

function loadMap() {
  var tk = "e2c4a8d8f10bd9aeec58f4dd88bb9bf2";

  //天地图矢量底图
  var tianDiTuVector = new WebMapTileServiceImageryProvider({
    url:
      "http://t0.tianditu.com/vec_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=vec&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=" +
      tk,
    layer: "tdtVecBasicLayer",
    style: "default",
    format: "image/jpeg",
    tileMatrixSetID: "GoogleMapsCompatible"
  });

  //天地图矢量注记
  var tianDiTuVectorAnnotation = new WebMapTileServiceImageryProvider({
    url:
      "http://t0.tianditu.com/cva_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=cva&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default.jpg&tk=" +
      tk,
    layer: "tdtAnnoLayer",
    style: "default",
    format: "image/jpeg",
    tileMatrixSetID: "GoogleMapsCompatible"
  });

  //天地图影像底图
  var tianDiTuSpatial = new WebMapTileServiceImageryProvider({
    url:
      "http://t0.tianditu.com/img_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=" +
      tk,
    layer: "tdtBasicLayer",
    style: "default",
    format: "image/jpeg",
    tileMatrixSetID: "GoogleMapsCompatible"
  });

  //天地图影像注记
  const tianDiTuSpatialAnnotation = new WebMapTileServiceImageryProvider({
    url:
      "http://t0.tianditu.com/cia_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=cia&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default.jpg&tk=" +
      tk,
    layer: "tdtAnnoLayer",
    style: "default",
    format: "image/jpeg",
    tileMatrixSetID: "GoogleMapsCompatible"
  });

  // Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
  const viewer = new Viewer("cesiumContainer", {
    terrain: Terrain.fromWorldTerrain(),
    timeline: false,
    navigationHelpButton: false,
    infoBox: false
  });
  var scene = viewer.scene;
  // 初始化摄影机位置
  // viewer.camera.flyTo({
  //   destination: Cartesian3.fromDegrees(120, 30, 800),
  //   orientation: {
  //     heading: CesiumMath.toRadians(0.0),
  //     pitch: CesiumMath.toRadians(-15.0)
  //   }
  // });
  // 添加图层
  var ifAddLayer = true;
  document.getElementById("addLayer").addEventListener("click", function () {
    if (ifAddLayer == true) {
      viewer.imageryLayers.addImageryProvider(tianDiTuSpatialAnnotation);
      console.log("添加地图");
      ifAddLayer = false;
    } else {
      //WebMapTileServiceImageryProvider类型的图层不能直接移除
      var firstLayer = viewer.imageryLayers.get(1);
      viewer.imageryLayers.remove(firstLayer, false);
      ifAddLayer = true;
    }
  });
  //前往杭州
  document.getElementById("flyto").addEventListener("click", () => {
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(120, 30, 800),
      orientation: {
        heading: CesiumMath.toRadians(0.0),
        pitch: CesiumMath.toRadians(-15.0)
      }
    });
  });

  //添加点线面，文字，图片，模型等,本质上都是使用entity对象
  const addPoint = viewer.entities.add({
    id: "point",
    // fromDegrees（经度，纬度，高度，椭球，结果）从以度为单位的经度和纬度值返回Cartesian3位置
    position: Cartesian3.fromDegrees(120, 30, 100),
    point: {
      // 点的大小（像素）
      pixelSize: 5,
      // 点位颜色，fromCssColorString 可以直接使用CSS颜色
      color: Color.fromCssColorString("#ee0000"),
      // 边框颜色
      outlineColor: Color.fromCssColorString("#fff"),
      // 边框宽度(像素)
      outlineWidth: 2,
      // 显示在距相机的距离处的属性，多少区间内是可以显示的
      // distanceDisplayCondition: new DistanceDisplayCondition(0, 1500),
      // 是否显示
      show: true
    }
  });

  const addPolyline = viewer.entities.add({
    id: "Polyline",
    polyline: {
      //fromDegreesArray不读取高程值用于贴地，fromDegreesArrayHeights读取高程值
      positions: Cartesian3.fromDegreesArrayHeights([
        120.9, 30.7, 20000, 110.2, 34.5, 20000
      ]),
      // 宽度
      width: 2,
      // 线的颜色
      material: Color.WHITE,
      // 线的顺序,仅当`clampToGround`为true并且支持地形上的折线时才有效。
      // zIndex: 10,
      // 显示在距相机的距离处的属性，多少区间内是可以显示的
      // distanceDisplayCondition: new DistanceDisplayCondition(0, 1500),
      // 是否显示
      show: true,
      //线是否贴地
      clampToGround: false
    }
  });

  //添加动画效果
  function addAnimation() {
    const startTime = JulianDate.fromDate(new Date(2024, 5, 20, 17));
    // const startTime = JulianDate.now();
    const stopTime = JulianDate.addSeconds(startTime, 360, new JulianDate());
    //设置时间轴，注意时间不对会看不到模型
    viewer.clock.startTime = startTime.clone();
    viewer.clock.stopTime = stopTime.clone();
    viewer.clock.currentTime = startTime.clone();
    viewer.clock.multiplier = 2; //将时间流逝速度设为正常的 20 倍
    viewer.clock.clockRange = ClockRange.LOOP_STOP;
    //用来定义时间和位置的关系
    let positionProperty = new SampledPositionProperty();
    const pathData = [
      { longitude: 120.9, latitude: 30.7, height: 20000 },
      { longitude: 110.2, latitude: 34.5, height: 20000 }
    ];
    for (let i = 0; i < pathData.length; i++) {
      const time = JulianDate.addSeconds(startTime, i * 72, new JulianDate());
      const position = Cartesian3.fromDegrees(
        pathData[i].longitude,
        pathData[i].latitude,
        pathData[i].height
      );
      //添加模型该在哪个时间出现在哪个节点位置
      positionProperty.addSample(time, position);
    }
    //添加外部模型
    const addModel = viewer.entities.add({
      id: "Model",
      position: positionProperty,
      // 设置方向
      //Cesium.VelocityOrientationProperty 是 Cesium 中的一个类，用于根据实体的速度自动计算和更新其朝向。它基于实体的运动方向来确定朝向，使得实体能够在移动时保持正确的朝向
      orientation: new VelocityOrientationProperty(positionProperty),
      model: {
        // 引入模型
        uri: "src/assets/model/Airplane.glb",
        // 模型的近似最小像素大小，而不考虑缩放。这可以用来确保即使观看者缩小也可以看到模型。如果为0.0，则不强制使用最小大小
        minimumPixelSize: 1280,
        // 模型的颜色（与模型的渲染颜色混合的属性）
        color: Color.WHITE.withAlpha(1),
        // 模型的最大比例大小
        maximumScale: 20000,
        // 设置模型轮廓（边框）颜色
        silhouetteColor: Color.WHITE,
        // 设置模型轮廓（边框）大小
        silhouetteSize: 2,
        // 是否执行模型动画
        runAnimations: true,
        // 应用于图像的统一比例。比例大于会1.0放大标签，而比例小于会1.0缩小标签。
        scale: 10,
        // 显示在距相机的距离处的属性，多少区间内是可以显示的
        // distanceDisplayCondition: new DistanceDisplayCondition(0, 1500),
        // 是否显示
        show: true
      },
      // 显示移动的路径，不显示？
      path: {
        resolution: 1,
        width: 15,
        material: new PolylineGlowMaterialProperty({
          //一个数字属性，指定光晕的强度，以总线宽度的百分比表示
          glowPower: 0.1,
          color: Color.YELLOW
          //一个数字属性，指定渐缩效果的强度，以总线长的百分比表示。如果为 1.0 或更高，则不使用渐缩效果
          //taperPower:0.5
        })
      }
    });
    viewer.zoomTo(addModel);
    // viewer.trackedEntity = addModel;
  }
  document
    .getElementById("addAnimation")
    .addEventListener("click", addAnimation);

  //echart部分,看超图的示例，2D地图也可以使用echart，看Mapbox GL JS Cookbook的插件示例
  //拼接数据
  const convertData = function (data, geoCoordMap) {
    const res = [];
    for (let i = 0; i < data.length; i++) {
      const geoCoord = geoCoordMap[data[i].name];
      if (geoCoord) {
        res.push({
          name: data[i].name,
          value: geoCoord.concat(data[i].value)
        });
      }
    }
    return res;
  };
  //存放数据
  var location = [];
  var data = [];
  const options = {
    animation: !1,
    // backgroundColor: "#404a59",
    title: {
      text: "Echarts之全国主要城市空气质量",
      subtext: "",
      sublink: "",
      left: "center",
      textStyle: {
        color: "#fff"
      }
    },
    tooltip: {
      trigger: "item"
    },
    legend: {
      orient: "vertical",
      y: "bottom",
      x: "left",
      data: ["pm2.5"],
      textStyle: {
        color: "#fff"
      }
    },
    GLMap: {},
    series: [
      {
        name: "城市",
        type: "scatter",
        coordinateSystem: "GLMap",
        data: convertData(data, location),
        symbolSize: function (val) {
          return val[2] / 20;
        },
        label: {
          normal: {
            formatter: "{b}",
            position: "right",
            show: false
          },
          emphasis: {
            show: true
          }
        },
        itemStyle: {
          normal: {
            color: "#ddb926"
          }
        }
      },
      {
        name: "前5",
        type: "effectScatter",
        coordinateSystem: "GLMap",
        data: convertData(
          data
            .sort(function (a, b) {
              return b.value - a.value;
            })
            .slice(0, 6),
          location
        ),
        symbolSize: function (val) {
          return val[2] / 20;
        },
        showEffectOn: "render",
        rippleEffect: {
          brushType: "stroke"
        },
        hoverAnimation: true,
        label: {
          normal: {
            formatter: "{b}",
            position: "right",
            show: true
          }
        },
        itemStyle: {
          normal: {
            color: "#f4e925",
            shadowBlur: 10,
            shadowColor: "#333"
          }
        },
        zlevel: 1
      }
    ]
  };
  function setEchart() {
    //获取数据,拼接一个这样的数据{"name": "上海","value": [121.48,31.22,19780]}
    async function getData() {
      await http.get(baseUrlApi("/echarts")).then((res: any) => {
        location = res.location;
        data = res.data;
        var concatData = convertData(res.data, res.location);
        options.series[0].data = convertData(res.data, res.location);
        options.series[1].data = convertData(
          data
            .sort(function (a, b) {
              return b.value - a.value;
            })
            .slice(0, 6),
          location
        );
        // var echartsLayer = new EchartsLayer(viewer);
        // echartsLayer.chart.setOption(options);

        // let handler = new ScreenSpaceEventHandler(scene.canvas);
        // handler.setInputAction(function (e) {
        //   let pos = scene.pickPosition(e.position);
        //   console.log(pos);
        // }, ScreenSpaceEventType.LEFT_CLICK);
        // (window as any).camera = scene.camera;
        // // $('#loadingbar').remove();
      });
    }
    getData();
  }
  // setEchart();
}
</script>

<template>
  <div class="box">
    <el-button id="addLayer">添加图层</el-button>
    <el-button id="addAnimation">添加动画</el-button>
    <el-button id="flyto">移动到杭州</el-button>
    <div id="cesiumContainer" style="width: 100%; height: 100%" />
  </div>
</template>
