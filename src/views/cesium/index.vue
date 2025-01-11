<script setup lang="ts">
defineOptions({
  name: "cesiumRouter"
});

import cesiumMap from "./component/cesiumMap.vue";
</script>

<template>
  <div>
    <!-- 能传的 -->
    <cesiumMap />
  </div>
</template>
