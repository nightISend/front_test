<script setup lang="ts">
defineOptions({
  name: "cesiumRouter"
});

import cesiumMap from "./component/cesiumMap.vue";
import superForCesium from "./component/superForCesium.vue";
</script>

<template>
  <div>
    <!-- 能传的 -->
    <!-- <cesiumMap /> -->
    <superForCesium />
  </div>
</template>
