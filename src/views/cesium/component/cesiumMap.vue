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
  ScreenSpaceEventType,
  SkyBox,
  CesiumTerrainProvider,
  Transforms,
  HeadingPitchRoll,
  LabelStyle,
  Cartesian2,
  VerticalOrigin,
  HorizontalOrigin,
  DistanceDisplayCondition,
  GeometryInstance,
  RectangleGeometry,
  Rectangle,
  PerInstanceColorAppearance,
  ColorGeometryInstanceAttribute,
  Primitive,
  defined,
  ColorMaterialProperty,
  Material,
  EllipsoidSurfaceAppearance,
  GeoJsonDataSource,
  KmlDataSource
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { drawWater, floodAnalysis } from "./water";
import { click_draw_polygon } from "./drawPolygon";

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
    /* 添加cesium自带的DEM */
    terrain: Terrain.fromWorldTerrain({
      /* 添加光照和水文效果 */
      requestVertexNormals: true,
      requestWaterMask: true
    }),
    /* 添加DEM瓦片服务,api用不对 */
    // terrainProvider: new CesiumTerrainProvider(),
    timeline: false,
    navigationHelpButton: false,
    infoBox: false
    // skyBox: new SkyBox({})天空盒，用图片替换天空
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
      let imagery = viewer.imageryLayers.addImageryProvider(tianDiTuSpatial);
      imagery.hue = 3; // 图层色调
      imagery.contrast = -1.2; // 图层对比度
      /* 设置地图透明度 */
      viewer.imageryLayers.addImageryProvider(tianDiTuVector).alpha = 0.5;
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
    /* 两种方法都可以实现视角变换，flyto有移动效果，setview直接瞬移 */
    // viewer.camera.flyTo({
    //   destination: Cartesian3.fromDegrees(120, 30, 800),
    //   orientation: {
    //     heading: CesiumMath.toRadians(0.0),
    //     pitch: CesiumMath.toRadians(-15.0)
    //   }
    // });
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(120, 30, 800),
      orientation: {
        heading: CesiumMath.toRadians(0.0),
        pitch: CesiumMath.toRadians(-15.0)
      }
    });
  });

  /*
  添加点线面，文字，图片，模型，立体对象等,本质上都是使用entity对象，看官网样例geometry
  也可以用premitive，相比于entity，premitive更底层，用起来麻烦但可以实现更复杂的效果
  */
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

  /*
  面的材质
  ColorMaterialProperty --颜色材质，ImageMaterialProperty --图片材质
  CheckerboardMaterialProperty --棋盘纹理材质，StripeMaterialProperty --条纹纹理材质
  GridMaterialProperty --网格纹理材质
  可以自定义XXXMaterialProperty
  */
  let polygonMaterial = new ColorMaterialProperty(
    new Color(1.0, 1.0, 1.1, 1.0)
  );
  var addPolygon = viewer.entities.add({
    id: "rectangle",
    rectangle: {
      coordinates: Rectangle.fromDegrees(90, 20, 105, 30),
      height: 10,
      extrudedHeight: 20000,
      // material: Color.BLACK.withAlpha(0.8)
      material: polygonMaterial
    }
  });

  /* 可以用viewer.entities.add直接添加模型 */
  const addModel = viewer.entities.add({
    id: "Model",
    position: Cartesian3.fromDegrees(110.2, 34.5, 20000),
    // 设置方向
    orientation: Transforms.headingPitchRollQuaternion(
      Cartesian3.fromDegrees(110.2, 34.5, 20000),
      new HeadingPitchRoll(
        CesiumMath.toRadians(10),
        CesiumMath.toRadians(20),
        CesiumMath.toRadians(30)
      )
    ),
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
      distanceDisplayCondition: new DistanceDisplayCondition(0, 150000),
      // 是否显示
      show: true
    }
  });

  /* 添加标签和图片 */
  const addLable = viewer.entities.add({
    id: "lable",
    position: Cartesian3.fromDegrees(110.2, 34.5, 20000),
    label: {
      text: "飞机模型",
      font: "12px sans-serif",
      fillColor: Color.WHITE,
      outlineWidth: 5,
      style: LabelStyle.FILL_AND_OUTLINE,
      /* 标签位置偏移量，避免与模型重合 */
      pixelOffset: new Cartesian2(0, -24),
      /* 标签位置 */
      verticalOrigin: VerticalOrigin.BOTTOM,
      horizontalOrigin: HorizontalOrigin.CENTER
    },
    billboard: {
      image: "src/assets/map/fire_small.png",
      width: 25,
      height: 25,
      verticalOrigin: VerticalOrigin.TOP,
      horizontalOrigin: HorizontalOrigin.CENTER
    }
  });

  /* 使用primivite创建几何实例 */
  /* 1.创建几何体 */
  let rectGeometry = new RectangleGeometry({
    /* 矩形对角坐标 */
    rectangle: Rectangle.fromDegrees(115, 20, 135, 30),
    /* 模型离地高度 */
    height: 0,
    /* 挤出高度，就是模型的高 */
    extrudedHeight: 20000,
    /* 顶点着色，webgl内容,着色方法要与使用的外观一致 */
    // vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT
    vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT
  });
  /* 2.实例化,允许一个几何对象出现在不同位置带有不同属性 */
  let instance = new GeometryInstance({
    id: "red",
    geometry: rectGeometry,
    attributes: {
      color: ColorGeometryInstanceAttribute.fromColor(Color.RED.withAlpha(0.5))
    }
  });
  /* 3.设置材质 */
  /* 在文档里看Material，各种方法同理 */
  var colorMaterial = Material.fromType("Color", {
    color: Color.BLUE.withAlpha(0.5)
  });
  var imageMaterial = Material.fromType("Image", {
    image: "src/assets/map/fire_small.png",
    /* 用几张（x*y）图显示 */
    repeat: {
      x: 2,
      y: 2
    }
  });
  let fabricMaterial = new Material({
    fabric: {
      type: "Color",
      uniforms: {
        color: new Color(1.0, 1.0, 0.0, 1.0)
      }
    }
  });
  /* 4.设置外观（appearance）去文档里找带appearance的方法都能用，使用的外观要与几何体的着色方法vertexFormat一致  */
  /* 以实例的颜色去着色 */
  let appearance = new PerInstanceColorAppearance({
    flat: true
  });
  /* 椭圆体表面外观,假定几何体与地表平行，加快计算 */
  var appearance1 = new EllipsoidSurfaceAppearance({
    aboveGround: true,
    material: colorMaterial
    /* 手写着色器就不用写材质 */
    // fragmentShaderSource: ``
  });
  /* 5.图元，可以有多个几何体如geometryInstances: [instance, instance1],效率会比entity高 */
  let rectPrimivite = new Primitive({
    geometryInstances: instance,
    /* 材质,用PerInstanceColorAppearance做材质才能改颜色 */
    appearance: appearance
  });
  /* 6.添加图元 */
  viewer.scene.primitives.add(rectPrimivite);
  /* 颜色变换，setTimeout说在一定时间后触发(1次)，setInterval是间隔触发（多次） */
  setTimeout(() => {
    let attributes = rectPrimivite.getGeometryInstanceAttributes("red");
    attributes.color = ColorGeometryInstanceAttribute.toValue(
      // Color.RED.withAlpha(0.5)
      // 随机变化RGB
      Color.fromRandom({ red: 0.5, green: 0.1 })
    );
    console.log("时间颜色变化");
  }, 8000);

  //添加移动动画效果
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
      //VelocityOrientationProperty 是 Cesium 中的一个类，用于根据实体的速度自动计算和更新其朝向。它基于实体的运动方向来确定朝向，使得实体能够在移动时保持正确的朝向
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

  /* 长按wasdqezc控制相机,包括上下左右俯仰翻滚（twist）等 */
  document.addEventListener("keydown", e => {
    /* 获取相机高度，用来控制不同高度时相交的移动距离 */
    var height = viewer.camera.positionCartographic.height;
    var distance = height / 100;
    /* 监听键盘事件 */
    if (e.key == "w") {
      viewer.camera.moveForward(distance);
    } else if (e.key == "a") {
      viewer.camera.moveLeft(distance);
    } else if (e.key == "s") {
      viewer.camera.moveDown(distance);
    } else if (e.key == "d") {
      viewer.camera.moveRight(distance);
    } else if (e.key == "q") {
      viewer.camera.lookLeft(CesiumMath.toRadians(0.1));
    } else if (e.key == "e") {
      viewer.camera.lookRight(CesiumMath.toRadians(0.1));
    } else if (e.key == "z") {
      viewer.camera.lookUp(CesiumMath.toRadians(0.1));
    } else if (e.key == "c") {
      viewer.camera.lookDown(CesiumMath.toRadians(0.1));
    }
  });
  /* 点击互动 */
  var handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(event => {
    let pick = viewer.scene.pick(event.position); // 获取 pick 拾取对象
    /*
    判断是否获取到了 pick,pick.id._id可以获取到实体的id,pick.id获取primitive的id

    通过以下两行代码对设置实体的属性，其中Property是record12345Type类型的对象
    const pb = new PropertyBag();
    pb.addProperty("info", Property);

    通过pick.id._properties.info._value获取设置的属性
    */
    console.log(pick);
    if (pick != undefined) {
      try {
        let attributes = rectPrimivite.getGeometryInstanceAttributes(pick.id);
        attributes.color = ColorGeometryInstanceAttribute.toValue(
          // Color.RED.withAlpha(0.5)
          // 随机变化RGB
          Color.fromRandom({ red: 0.5, green: 0.1 })
        );
      } catch {
        console.log("点击对象不是entity");
      }
    }
  }, ScreenSpaceEventType.LEFT_CLICK);

  /* 加载geojson数据,前地址，后样式 */
  let geojsonData = GeoJsonDataSource.load("", {
    stroke: Color.WHEAT,
    strokeWidth: 5
  });
  geojsonData.then((data: any) => {
    viewer.dataSources.add(data);
  });

  /* 加载kml数据,kml可以自带样式 */
  let kmlData = KmlDataSource.load("");
  kmlData.then((data: any) => {
    viewer.dataSources.add(data);
  });

  drawWater(viewer);

  const positions = [75, 20, 75, 30, 85, 30, 85, 20];
  floodAnalysis(viewer, positions, 40000, 20000);
  click_draw_polygon(viewer);
}
</script>

<template>
  <div class="box">
    <el-button id="addLayer">添加图层</el-button>
    <el-button id="addAnimation">添加动画</el-button>
    <el-button id="flyto">移动到杭州</el-button>
    <el-button id="draw">绘制多边形</el-button>
    <div id="cesiumContainer" style="width: 100%; height: 100%" />
  </div>
</template>
