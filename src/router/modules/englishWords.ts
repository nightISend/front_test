// 最简代码，也就是这些字段必须有
export default {
  path: "/fighting",
  meta: {
    title: "英语单词"
  },
  children: [
    {
      path: "/englishWord/statisticTable",
      name: "EnglishWords",
      component: () => import("@/views/englishWord/statisticTable.vue"),
      meta: {
        title: "英语单词统计表",
        showParent: true
      }
    }
  ]
};
