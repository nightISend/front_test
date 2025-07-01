<template>
  <div style="position: relative; width: 100%; height: 100%">
    <!-- <div class="box">盒子</div>
    <div class="box1">盒子下</div> -->

    <!-- <div class="fixe-style">
      <div style="background-color: red">1</div>
      <div style="background-color: blue">1</div>
      <div style="background-color: yellow">1</div>
    </div> -->

    <iframe src="https://www.bilibili.com/" style="width: 100%; height: 100%" />
  </div>
</template>
<script setup lang="ts">
defineOptions({
  name: "practiceCSS"
});
</script>

<style>
.box {
  width: 100px;
  height: 100px;

  /* margin: 100px; */
  background-color: rgb(156 239 21);
}

.box1 {
  width: 100px;
  height: 100px;
  background-color: rgb(67 81 28);

  /* padding: 10px; */
}

.fixe-style {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 600px;
  height: 400px;
  background-color: beige;
}

/* fixe-style样式下的所有div的样式 */
.fixe-style div {
  width: 40px;
  height: 40px;
}
</style>
