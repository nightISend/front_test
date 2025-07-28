<template>
  <div
    id="SuperMap3DContainer"
    style="position: absolute; width: 97%; height: 95%"
  />
</template>

<script setup lang="ts">
import { onMounted } from "vue";

onMounted(() => {
  onLoad(SuperMap3D);
});

function onLoad(SuperMap3D) {
  var viewer = new SuperMap3D.Viewer("SuperMap3DContainer", {});
}
</script>
