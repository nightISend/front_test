import { defineStore } from "pinia";
import { http } from "@/utils/http";
import { baseUrlApi } from "@/api/utils";
import { ref } from "vue";

export type mapEntity = {
  id: number;
  textid: string;
  address: string;
  longitude: number;
  latitude: number;
  geom: string;
};

export type mapEntityResponed = {
  success: boolean;
  condition: string;
  count: number;
  data: mapEntity[];
};
export const useMapEntityStore = defineStore("mapEntity", () => {
  var data = ref<mapEntity[]>([]);

  // 需要用async异步调用才能成功返回值,不用这个方法
  async function getEntitys(): Promise<mapEntity[]> {
    var result: mapEntity[];
    await http
      .request("get", baseUrlApi("/map/getAll"))
      .then((res: mapEntityResponed) => {
        // 后端返回正常
        data.value = res.data;
        result = res.data;
      });
    //没有async时写在外面return比获取数据先执行
    return result;
  }
  return { getEntitys, data };
});
