import { defineStore } from "pinia";
import type {
  Word,
  responseWords,
  requestWords
} from "@/views/englishWord/utils/entity";
import { http } from "@/utils/http";
import { baseUrlApi } from "@/api/utils";

export const useEnglishWordsStore = defineStore("English", {
  state: () => {
    return {
      //用于存放数据
      data: [] as Word[],
      //用于存放显示的数据的页数
      totalPage: 100,
      //用于记录上一次执行了什么对后端的操作[all(获取所有数据),Select(获取筛选数据)]
      lastAction: "",
      //用于存放表格选择的数据，一维代表页码，二维是选择的数据
      selectData: [] as Word[][]
    };
  },
  actions: {
    getData(pageNumber) {
      http
        .request(
          "get",
          baseUrlApi("englishWord/getAll?pageNumber=" + pageNumber)
        )
        .then((data: responseWords) => {
          this.data = data.data;
          this.totalPage = data.totalPage;
        });
    },
    getBySelect(request: requestWords, pageNumber: number) {
      var url =
        "englishWord/getBySelect?pageNumber=" +
        pageNumber +
        "&lowBorder=" +
        request.lowBorder +
        "&upBorder=" +
        request.upBorder +
        "&name=" +
        request.name +
        "&translation=" +
        request.translation;
      http.request("get", baseUrlApi(url)).then((data: responseWords) => {
        this.data = data.data;
        this.totalPage = data.totalPage;
      });
    }
  }
});
