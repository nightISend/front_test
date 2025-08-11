<template>
  <div id="main" class="mainStyle" />
</template>
<script setup lang="ts">
import * as echarts from "echarts";
import { onMounted, watch } from "vue";
import { useMapStore } from "@/store/modules/mapStore";

type EChartsOption = echarts.EChartsOption;

var option: EChartsOption;
const mapStore = useMapStore();

option = {
  xAxis: {
    type: "category",
    data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  },
  yAxis: {
    type: "value"
  },
  series: [
    {
      data: [820, 932, 901, 934, 1290, 1330, 1320],
      type: "line",
      smooth: true
    }
  ]
};
onMounted(() => {
  var chartDom = document.getElementById("main")!;
  var myChart = echarts.init(chartDom);
  option && myChart.setOption(option);
  watch(
    () => mapStore.resizeEchart,
    () => {
      myChart.resize();
    }
  );
});
</script>
<style>
.mainStyle {
  width: 100%;
  height: 100%;
}
</style>
