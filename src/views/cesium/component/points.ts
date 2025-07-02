import { Color, Cartesian3, PointPrimitiveCollection } from "cesium";
/* 在api文档里查Collection找各种集合 */
let coors = [
  [90, 24, 1000],
  [95, 23, 2000],
  [100, 30, 1500],
  [111, 22, 8000],
  [107, 30, 10000],
  [120, 40, 9000]
];
export function addPoints(viewer) {
  let pointPrimitives = viewer.scene.primitives.add(
    new PointPrimitiveCollection()
  );
  for (let i = 1; i < coors.length; i++) {
    let position = Cartesian3.fromDegrees(
      coors[i][0],
      coors[i][1],
      coors[i][2]
    );
    pointPrimitives.add({
      position: position,
      color: Color.BURLYWOOD,
      pixelSize: 5
    });
  }
}
