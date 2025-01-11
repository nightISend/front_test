<script setup lang="ts">
import View from "ol/View.js"; //新建视图
import Select from "ol/interaction/Select.js";
import { Draw, Modify, Snap } from "ol/interaction.js";
import XYZ from "ol/source/XYZ.js"; //新建图层，通过对图层的添加和移除实现图层切换
import Map from "ol/Map.js";
import { useMapEntityStore } from "@/store/modules/mapEntity";
import { onMounted, watch, ref } from "vue";
import WKT from "ol/format/WKT.js";
import { GeoJSON } from "ol/format";
import { Vector as VectorSource } from "ol/source.js";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer.js";
import { http } from "@/utils/http";
import { baseUrlApi } from "@/api/utils";
import { mapEntityResponed } from "@/store/modules/mapEntity";
import { Style, Fill, Stroke, Circle } from "ol/style";
import Feature from "ol/Feature";
//可以在地图上显示图表
import EChartsLayer from "ol-echarts";

import { buffer } from "@turf/buffer";

onMounted(() => {
  loadMap();
});

var tk = "e2c4a8d8f10bd9aeec58f4dd88bb9bf2";

var store = useMapEntityStore();
var getFeature: Feature; //暂存获取的要素用于做缓冲区

function loadMap() {
  console.log("加载地图");
  var diTu = new TileLayer({
    source: new XYZ({
      url:
        "http://t0.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=" +
        tk
    })
  });
  var view = new View({
    projection: "EPSG:4326", //对view规定坐标系为4326后就不用坐标系转换了
    center: [120.19, 30.26], //定位到杭州
    zoom: 7
  });
  const map = new Map({
    target: "map",
    layers: [diTu],
    view: view
  });

  //加载后端数据实现
  const format = new WKT();
  const formatGeo = new GeoJSON();
  //显示数据的矢量源和图层
  var vectorShow = new VectorSource();
  var layerShow = new VectorLayer();
  const styles = {
    Point: new Style({
      image: new Circle({
        radius: 50,
        fill: new Fill({
          color: "green"
        })
      }),
      stroke: new Stroke({
        width: 4,
        color: "blue"
      })
    }),
    LineString: new Style({
      stroke: new Stroke({
        color: "green",
        width: 100
      })
    }),
    Polygon: new Style({
      stroke: new Stroke({
        color: "blue",
        lineDash: [4],
        width: 3
      }),
      fill: new Fill({
        color: "rgba(0, 0, 255, 0.1)"
      })
    })
  };

  const styleFunction = function (feature) {
    console.log(styles["Polygon"]);
    return styles[feature.getGeometry().getType()];
  };

  async function getEntitys() {
    await http
      .request("get", baseUrlApi("/map/getAll"))
      .then((res: mapEntityResponed) => {
        store.data = res.data;
        res.data.forEach(identity => {
          var feature = format.readFeature(identity.geom);
          feature.set("address", identity.address);
          var type = feature.getGeometry();
          console.log(type);
          vectorShow.addFeature(feature);
        });
        console.log("添加完成");
      });
    layerShow.setSource(vectorShow);
    map.addLayer(layerShow);
    console.log("加载矢量数据");
  }
  var button_getdata = document.getElementById("addLayer");
  button_getdata.addEventListener("click", getEntitys);

  // //点击获取要素信息,与下面的selectSingleClick方法都可以实现点击获取要素,但这里获取的feature不能设置样式
  // map.on("click", e => {
  //   let coordinate = e.coordinate;
  //   let pixel = map.getEventPixel(e.originalEvent);
  //   map.forEachFeatureAtPixel(pixel, (feature, layer) => {
  //     // console.log(feature.getGeometry());
  //     console.log("地图点击事件+" + feature.get("address"));
  //   });
  // });

  //点击获取要素
  var selectSingleClick = new Select({});
  map.addInteraction(selectSingleClick);
  selectSingleClick.on("select", function (event) {
    const selectedObject = event.selected[0]; //这个是获取到的要素
    const type = typeof selectedObject;
    //获取要素时可能会获取空对象
    if (type != "undefined") {
      getFeature = selectedObject;
    }
  });

  // 画和编辑要素
  const drawSource = new VectorSource();
  const drawVector = new VectorLayer({
    source: drawSource,
    style: {
      "fill-color": "rgba(255, 255, 255, 0.2)",
      "stroke-color": "#ffcc33",
      "stroke-width": 2,
      "circle-radius": 7,
      "circle-fill-color": "#ffcc33"
    }
  });
  map.addLayer(drawVector);
  const modify = new Modify({ source: drawSource });
  const typeSelect = document.getElementById("type") as HTMLInputElement;
  let draw, snap; // global so we can remove them later
  function addInteractions() {
    var type: any = typeSelect.value; //string类型不能给type？？？
    draw = new Draw({
      source: drawSource,
      type: type //设置所画要素的类型
    });
    map.addInteraction(draw);
    snap = new Snap({ source: drawSource });
    map.addInteraction(snap);
  }
  typeSelect.addEventListener("change", () => {
    console.log("切换要素");
    map.removeInteraction(draw);
    map.removeInteraction(snap);
    addInteractions();
  });
  //启用画线
  const isDraw = document.getElementById("ifDraw");
  var isStart = false; //是否开启了编辑按钮
  isDraw.addEventListener("click", () => {
    isStart = !isStart;
    if (isStart == true) {
      isDraw.innerHTML = "停止";
      map.addInteraction(modify);
      addInteractions();
    } else {
      isDraw.innerHTML = "编辑";
      map.removeInteraction(draw);
      map.removeInteraction(snap);
      map.removeInteraction(modify);
    }
  });

  //turf缓冲区生成
  const setBuffer = document.getElementById("setBuffer");
  var bufferSource = new VectorSource();
  const bufferedLayer = new VectorLayer({
    source: bufferSource,
    style: styleFunction
  });
  // 记得把图层添加到地图
  map.addLayer(bufferedLayer);
  setBuffer.addEventListener("click", () => {
    //ol要素转geojson
    var feature = formatGeo.writeFeatureObject(getFeature);
    //使用geojson做分析，生成geojson
    var buffered = buffer(feature, 500);
    //geojson转要素
    var olBuffer = formatGeo.readFeatures(buffered);
    bufferedLayer.getSource().clear();
    bufferedLayer.getSource().addFeatures(olBuffer);
  });
}
</script>

<template>
  <div>
    <div>
      <el-button id="addLayer">添加数据</el-button>
      <label>选择绘图要素：</label>
      <select id="type">
        <option value="Point">Point</option>
        <option value="LineString">LineString</option>
        <option value="Polygon">Polygon</option>
        <option value="Circle">Circle</option>
      </select>
      <el-button id="ifDraw">编辑</el-button>
      <el-button id="setBuffer">缓冲区</el-button>
    </div>
    <div id="map" style="width: 1000px; height: 500px" />
  </div>
</template>
