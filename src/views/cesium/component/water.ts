import {
  Rectangle,
  RectangleGeometry,
  EllipsoidSurfaceAppearance,
  GeometryInstance,
  ColorGeometryInstanceAttribute,
  Color,
  Material,
  Primitive,
  Cartesian3,
  CallbackProperty
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
/* 水面特效 */
export function drawWater(viewer) {
  viewer.scene.globe.depthTestAgainstTerrain = false;
  let rectGeometry = new RectangleGeometry({
    /* 矩形对角坐标 */
    rectangle: Rectangle.fromDegrees(45, 20, 55, 30),
    /* 模型离地高度 */
    height: 0,
    /* 挤出高度，就是模型的高 */
    extrudedHeight: 0.1,
    /* 顶点着色，webgl内容,着色方法要与使用的外观一致 */
    // vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT
    vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT
  });
  let instance = new GeometryInstance({
    id: "red",
    geometry: rectGeometry,
    attributes: {
      color: ColorGeometryInstanceAttribute.fromColor(Color.RED.withAlpha(0.5))
    }
  });
  let waterMaterial = new Material({
    strict: false,
    fabric: {
      type: "Water",
      uniforms: {
        baseWaterColor: new Color(0.0, 0.0, 1.0, 0.5),
        blendColor: new Color(0.0, 0.0, 1.0, 0.5),
        //specularMap: 'gray.jpg',
        //normalMap: '../assets/waterNormals.jpg',
        normalMap: "src/assets/map/waterNormals.jpg",
        frequency: 1000.0,
        animationSpeed: 0.01,
        amplitude: 10.0
      }
    }
  });
  var appearance1 = new EllipsoidSurfaceAppearance({
    // aboveGround: true,
    material: waterMaterial
    /* 手写着色器就不用写材质 */
    // fragmentShaderSource: ``
  });
  let rectPrimivite = new Primitive({
    geometryInstances: instance,
    /* 材质 */
    appearance: appearance1
  });
  viewer.scene.primitives.add(rectPrimivite);
}
/*
  淹没效果，positions为限定区域端点坐标数组，targetWaterHeight为洪水上涨限定高度，waterHeight为洪水起始高度。
  多边形是平面，导致其中间的高程低于对应位置地表椭球的高程，所有淹没一般从外向内。
   */
export function floodAnalysis(
  viewer,
  positions,
  targertWaterHeight,
  waterHeight
) {
  viewer.entities.add({
    polygon: {
      hierarchy: Cartesian3.fromDegreesArray(positions),
      /* 回调函数用来实现水位上升的效果 */
      extrudedHeight: new CallbackProperty(function () {
        waterHeight += 0.5;
        if (waterHeight > targertWaterHeight) {
          waterHeight = targertWaterHeight;
        }
        return waterHeight;
      }, false),
      material: Color.fromBytes(64, 157, 253, 150),
      perPositionHeight: true
    }
  });
}
