import {
  Color,
  GeometryInstance,
  RectangleGeometry,
  Rectangle,
  PerInstanceColorAppearance,
  ColorGeometryInstanceAttribute,
  Primitive,
  Material,
  EllipsoidSurfaceAppearance
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

/* 使用primivite创建几何实例 */
export function createPrimitive(viewer) {
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
  // eslint-disable-next-line
  var imageMaterial = Material.fromType("Image", {
    image: "src/assets/map/fire_small.png",
    /* 用几张（x*y）图显示 */
    repeat: {
      x: 2,
      y: 2
    }
  });
  // eslint-disable-next-line
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
  // eslint-disable-next-line
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
}
