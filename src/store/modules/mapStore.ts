import { defineStore } from "pinia";
import { ref } from "vue";

export const useMapStore = defineStore("map", () => {
  // 通过修改值触发resize
  var resizeEchart = ref(false);
  return { resizeEchart };
});
