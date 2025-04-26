/* 加载geojson数据,前地址，后样式 */
import {
  Color,
  GeoJsonDataSource,
  KmlDataSource,
  PolylineOutlineMaterialProperty
} from "cesium";
/* arcgis的转json格式有问题，在https://mapshaper.org网站把shp转geojson */
export function addGeojson(viewer, path) {
  let geojsonData = GeoJsonDataSource.load(path, {
    clampToGround: true
  });
  geojsonData.then((data: any) => {
    data.entities._entities._array.forEach(element => {
      element.polyline.material = new PolylineOutlineMaterialProperty({
        color: Color.ORANGE,
        outlineWidth: 2,
        outlineColor: Color.BLACK
      });
    });
    viewer.dataSources.add(data);
  });
}

/* 加载kml数据,kml可以自带样式 */
export function addKml(viewer, path) {
  let kmlData = KmlDataSource.load(path);
  kmlData.then((data: any) => {
    viewer.dataSources.add(data);
  });
}
