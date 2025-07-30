<script setup lang="ts">
defineOptions({
  name: "supermapRouter"
});
import { onMounted } from "vue";
import webglmap from "./component/webglmap.vue";
function outSideLoad(SuperMap3D) {
  SuperMap3D.loadJson("src/assets/map/钱塘江流域边界范围_4490.json").then(
    (jsonData: any) => {
      jsonData.features.forEach((item: any) => {
        const positions = [];
        if (item.geometry.type === "Polygon") {
          // 只加载第一个面，其它面是多余的
          const coordinates = item.geometry.coordinates[0];
          for (let i = 0; i < coordinates.length; i++) {
            positions.push(coordinates[i][0], coordinates[i][1]);
          }
          // 遮罩,面挖洞
          window.viewer.entities.add({
            polygon: {
              hierarchy: {
                positions: SuperMap3D.Cartesian3.fromDegreesArray([
                  72, 2, 73, 58, 135, 58, 135, 3
                ]),
                holes: [
                  {
                    positions: SuperMap3D.Cartesian3.fromDegreesArray(positions)
                  }
                ]
              },
              material: new SuperMap3D.Color(2 / 255, 26 / 255, 79 / 255, 0.38),
              classificationType: SuperMap3D.ClassificationType.BOTH
            }
          });
          // 流域边界，线
          window.viewer.entities.add({
            polyline: {
              show: true,
              positions: SuperMap3D.Cartesian3.fromDegreesArray(positions),
              width: 6,
              clampToGround: true,
              material: new SuperMap3D.Color.fromCssColorString("#6495ED")
            }
          });
        }
      });
    }
  );
}

onMounted(() => {
  outSideLoad(SuperMap3D);
});
</script>

<template>
  <div>
    <!-- 能传的 -->
    <webglmap />
  </div>
</template>
