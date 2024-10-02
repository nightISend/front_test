import { defineFakeRoute } from "vite-plugin-fake-server/client";

export default defineFakeRoute([
  {
    url: "/map/getAll",
    method: "get",
    response: () => {
      return {
        success: true,
        condition: "获取mock数据",
        count: 2,
        data: [
          {
            id: 1,
            textid: "点",
            address: "浙江省嘉兴市海宁市水月亭东路175号中心菜场3层",
            longitude: 120.778,
            latitude: 30.4199,
            geom: "POINT(120.777852 30.419949)"
          },
          {
            id: 2,
            textid: "线",
            address: "海宁市晶科能源有限公司",
            longitude: 120.776,
            latitude: 30.4285,
            geom: "LINESTRING(120 30,120.3 30.3,120.7 30.2)"
          },
          {
            id: 3,
            textid: "面",
            address: "海宁市晶科能源有限公司",
            longitude: 120.776,
            latitude: 30.4285,
            geom: "POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))"
          }
        ]
      };
    }
  }
]);
