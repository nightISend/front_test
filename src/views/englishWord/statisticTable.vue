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

//呈现的数据
var tableData = ref<Word[]>([]);
const store = useEnglishWordsStore();
//当前页码
var currentPage = ref(0);

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

    store.selectData.forEach(row => {
      for (let element of tableData.value) {
        if (row.name == element.name) {
          temporarySlect.value.push(row);
        }
      }
    });
    isChangePage.value = false;
  }
);

//判断是否执行分页
var isChangePage = ref(false);
//暂存当前分页选择的记录
var temporarySlect = ref<Word[]>([]);
//监听当前页面选择的数据是否变化,并向selectData添加或删除对应的数据
watch(
  () => temporarySlect.value,
  (newVal, oldVal) => {
    if (!isChangePage.value) {
      //取消选择
      if (oldVal.length > newVal.length) {
        oldVal.forEach(row => {
          if (!newVal.includes(row)) {
            var index = store.selectData.indexOf(row);
            store.selectData.splice(index, 1);
          }
        });
      } else {
        //增加选择
        newVal.forEach(row => {
          if (!oldVal.includes(row)) {
            store.selectData.push(row);
          }
        });
      }
    }
  }
);
//暂存选中数据
function select(val: Word[]) {
  temporarySlect.value = val;
}

//获取分页数据
function pageChange() {
  //换页就将temporarySlect清空，防止新老页面选择数据干扰,并给标记是换页操作
  isChangePage.value = true;
  temporarySlect.value = [];
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

const multipleTableRef = ref<InstanceType<typeof ElTable>>(); //获取类型为ElTable的对象
const multipleSelection = ref<Word[]>([]); //Word类型的ref数组

//设置选择或清除选择的方法
//以Word类型的数组为输入，如果数组存在则遍历数组，给数组里对于的数据的状态改为选中
const toggleSelection = (rows?: Word[]) => {
  if (rows) {
    rows.forEach(row => {
      multipleTableRef.value!.toggleRowSelection(row, true); //！是断言，指虽然前面的对象可能为空但一定有toggleRowSelection()
    });
  } else {
    multipleTableRef.value!.clearSelection();
  }
};
const handleSelectionChange = (val: Word[]) => {
  multipleSelection.value = val;
};
</script>

<template>
  <div>
    <div>
      <el-container>
        <el-header height="55">
          <el-button type="primary" @click="Filter(request, 0)">
            查询
          </el-button>
          <el-button type="primary" @click="toggleSelection(temporarySlect)">
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
