<script setup lang="ts">
defineOptions({
  name: "EnglishWords"
});

import { ElTable } from "element-plus";
import { ref, watch, nextTick } from "vue";
import { Word, requestWords } from "@/views/englishWord/utils/entity";
import { useEnglishWordsStore } from "@/store/modules/englishWords";

//用于记录传递给后端的条件
var request = ref<requestWords>({
  name: "",
  translation: "",
  upBorder: 0,
  lowBorder: 0,
  page: 0
});
//获取类型为ElTable的对象
const multipleTableRef = ref<InstanceType<typeof ElTable>>();
//呈现的数据
var tableData = ref<Word[]>([]);
const store = useEnglishWordsStore();
//当前页码
var currentPage = ref(1);

//初始化页面
if (store.data.length === 0) {
  store.getData(0);
  store.lastAction = "all";
}

//监听pinia里重后端读取的数据是否变换
watch(
  () => store.data,
  () => {
    tableData.value = store.data;

    //要先监听，确定数据已经更改在恢复选择
    nextTick(() => {
      if (store.selectData[currentPage.value - 1]) {
        tableData.value.forEach(row => {
          for (let item of store.selectData[currentPage.value - 1]) {
            if (item.name === row.name) {
              multipleTableRef.value!.toggleRowSelection(row, true);
            }
          }
          //includes方法失效，原因未知
          // if (store.selectData[currentPage.value - 1].includes(row)) {
          //   multipleTableRef.value!.toggleRowSelection(row, true);
          //   console.log("选中")
          // }
        });
      }
    });
  }
);

//存储选中数据
function select(val: Word[]) {
  store.selectData[currentPage.value - 1] = val;
}

//获取分页数据
function pageChange() {
  switch (store.lastAction) {
    case "all":
      store.getData(currentPage.value - 1);
      break;
    case "Select":
      store.getBySelect(request.value, currentPage.value - 1);
      break;
  }
}
//获取筛选数据
function Filter(request: requestWords, pageNumber: number) {
  store.getBySelect(request, pageNumber);
  store.lastAction = "Select";
}
</script>

<template>
  <div>
    <div>
      <el-container>
        <el-header height="55">
          <el-button type="primary" @click="Filter(request, 0)">
            查询
          </el-button>
        </el-header>
      </el-container>
    </div>
    <div>
      <el-table
        ref="multipleTableRef"
        :data="tableData"
        style="width: 100%"
        @select="select"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column property="name" label="Name" width="120">
          <template #default="scope">{{ scope.row.name }}</template>
        </el-table-column>
        <el-table-column property="count" label="Count" width="120" />
        <el-table-column property="translation" label="Translation" />
      </el-table>
      <div class="example-pagination-block">
        <el-pagination
          v-model:current-page="currentPage"
          layout="prev, pager, next"
          :total="store.totalPage * 10"
          @current-change="pageChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.example-pagination-block + .example-pagination-block {
  margin-top: 10px;
}

.example-pagination-block .example-demonstration {
  margin-bottom: 16px;
}
</style>
