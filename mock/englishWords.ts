import { defineFakeRoute } from "vite-plugin-fake-server/client";

export default defineFakeRoute([
  {
    url: "/englishWord/getAll",
    method: "get",
    response: () => {
      return {
        success: true,
        condition: "获取mock数据",
        count: 1,
        data: [
          {
            name: "frustrations",
            count: 1,
            translation: "(1):挫折"
          },
          {
            name: "backlash",
            count: 1,
            translation: "(1):强烈反对"
          },
          {
            name: "abate",
            count: 1,
            translation: "(1):减弱"
          }
        ]
      };
    }
  }
]);
