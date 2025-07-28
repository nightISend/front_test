<script setup lang="ts">
defineOptions({
  name: "supermapRouter"
});

import webglmap from "./component/webglmap.vue";
</script>

<template>
  <div>
    <!-- 能传的 -->
    <webglmap />
  </div>
</template>
