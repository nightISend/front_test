import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

/* 使用primivite创建几何实例 */
export function createPrimitive(viewer) {
  // ==========================================
  // 第 1 步：定义四边形的地理位置和尺寸
  // ==========================================

  // 四边形中心点的经度（单位：度）
  const centerLon = 116.391;

  // 四边形中心点的纬度（单位：度）
  const centerLat = 39.907;

  // 四边形的东西方向长度（单位：米）
  const quadWidth = 1200.0;

  // 四边形的南北方向宽度（单位：米）
  const quadHeight = 600.0;

  // 四边形距离 WGS84 参考椭球面的高度（单位：米）
  // 设置一个很小的正值，避免与椭球表面发生深度冲突
  const surfaceHeight = 2000.0;

  // ==========================================
  // 第 2 步：建立局部 ENU 坐标系
  // ==========================================

  // 将四边形中心点的经纬度转换成 ECEF 三维坐标
  // 第三个参数 0.0 表示 WGS84 椭球高程为 0 米
  const centerPosition = Cesium.Cartesian3.fromDegrees(
    centerLon,
    centerLat,
    0.0
  );

  // 建立以中心点为原点的 ENU 局部坐标系
  //
  // 返回一个 Matrix4 矩阵
  // 这个矩阵可以把局部 ENU 坐标转换为 ECEF 世界坐标
  const enuMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(centerPosition);

  // ==========================================
  // 第 2.1 步：编写局部坐标转地球表面坐标的函数
  // ==========================================
  /**
   *
   * @param east 局部东距离(距离原点,单位米)
   * @param north 局部北距离(距离原点,单位米)
   * @returns 局部坐标系下点的经纬度
   */
  function localToSurface(east, north) {
    // 创建一个局部 ENU 坐标点,虽然写的是用cesium的笛卡尔坐标系但表示的是ENU坐标
    //
    // east：向东的距离，单位米
    // north：向北的距离，单位米
    // up：这里设为 0，表示位于局部切平面上
    const localPoint = new Cesium.Cartesian3(east, north, 0.0);

    // 将 ENU 局部坐标转换为 ECEF 世界坐标
    const tangentPoint = Cesium.Matrix4.multiplyByPoint(
      enuMatrix,
      localPoint,
      new Cesium.Cartesian3()
    );

    // 将 ECEF 世界坐标重新转换为地理坐标
    const cartographic =
      Cesium.Ellipsoid.WGS84.cartesianToCartographic(tangentPoint);

    // 将刚才得到的经纬度重新转换为 ECEF 坐标
    //
    // 这里统一设置为 surfaceHeight，
    // 使四个顶点都位于 WGS84 椭球面上方指定高度
    const surfacePoint = Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      surfaceHeight,
      Cesium.Ellipsoid.WGS84
    );

    // 返回最终的三维世界坐标
    return surfacePoint;
  }

  // ==========================================
  // 第 3 步：计算四边形的四个顶点(得到的都是经纬度)
  // ==========================================

  // 计算四边形东西方向的一半长度
  const halfWidth = quadWidth / 2.0;

  // 计算四边形南北方向的一半长度
  const halfHeight = quadHeight / 2.0;

  // P0：西南角
  // 向西 600 米，向南 300 米
  const p0 = localToSurface(-halfWidth, -halfHeight);

  // P1：东南角
  // 向东 600 米，向南 300 米
  const p1 = localToSurface(halfWidth, -halfHeight);

  // P2：西北角
  // 向西 600 米，向北 300 米
  const p2 = localToSurface(-halfWidth, halfHeight);

  // P3：东北角
  // 向东 600 米，向北 300 米
  const p3 = localToSurface(halfWidth, halfHeight);

  // ==========================================
  // 第 4 步：创建顶点位置数组(这里放的是构成三角形(两个三角形构成一个矩形只需要四个顶点)的顶点的经纬度坐标)
  // ==========================================

  // Float64Array 用于保存双精度三维坐标
  //
  // 每个顶点需要三个数值：X、Y、Z
  //
  // 四个顶点一共需要 4 × 3 = 12 个数值

  const positionValues = new Float64Array([
    // P0：西南角
    p0.x,
    p0.y,
    p0.z,

    // P1：东南角
    p1.x,
    p1.y,
    p1.z,

    // P2：西北角
    p2.x,
    p2.y,
    p2.z,

    // P3：东北角
    p3.x,
    p3.y,
    p3.z
  ]);

  // ==========================================
  // 第 4.1 步：创建 st 局部坐标数组
  // ==========================================

  // st 用来描述每个顶点在四边形内部的相对位置(这个值是人为规定的,相对于在矩形的两条边构建一个坐标系,坐标系不一定与东西南北平行)
  //
  // 每个顶点具有两个分量：st.x 和 st.y
  //
  // st.x：东西方向的位置
  // st.y：南北方向的位置
  //
  // 注意：st 不是经纬度，也不是 ECEF 坐标
  //
  // 我们人为规定：
  // 0 表示该方向的起点
  // 1 表示该方向的终点

  const stValues = new Float32Array([
    // P0：西南角
    0.0, 0.0,

    // P1：东南角
    1.0, 0.0,

    // P2：西北角
    0.0, 1.0,

    // P3：东北角
    1.0, 1.0
  ]);

  // ==========================================
  // 第 4.2 步：创建三角形索引数组
  // ==========================================

  // 每个三角形需要三个顶点索引
  //
  // 第一个三角形：P0、P1、P2
  // 第二个三角形：P1、P3、P2
  //
  // 总共需要 6 个索引

  const indices = new Uint16Array([
    // 第一个三角形
    0, 1, 2,

    // 第二个三角形
    1, 3, 2
  ]);

  // ==========================================
  // 第 5 步：创建 Geometry
  // ==========================================

  const geometry = new Cesium.Geometry({
    // attributes 用于定义每个顶点具有哪些属性
    attributes: {
      // ----------------------------------
      // position：顶点空间位置
      // ----------------------------------

      position: new Cesium.GeometryAttribute({
        // 数据类型：双精度浮点数
        componentDatatype: Cesium.ComponentDatatype.DOUBLE,

        // 每个顶点包含三个分量
        // 分别对应 X、Y、Z
        componentsPerAttribute: 3,

        // 传入刚才创建的位置数组
        values: positionValues
      }),

      // ----------------------------------
      // st：顶点局部坐标
      // ----------------------------------

      st: new Cesium.GeometryAttribute({
        // 数据类型：单精度浮点数
        componentDatatype: Cesium.ComponentDatatype.FLOAT,

        // 每个顶点包含两个分量
        // 分别对应 st.x 和 st.y
        componentsPerAttribute: 2,

        // 传入局部坐标数组
        values: stValues
      })
    },

    // indices：定义顶点如何组成三角形
    indices: indices,

    // 告诉 Cesium：我们使用三角形进行绘制
    primitiveType: Cesium.PrimitiveType.TRIANGLES,

    // 创建包围球，用于 Cesium 的空间范围判断和裁剪
    boundingSphere: Cesium.BoundingSphere.fromVertices(positionValues)
  });

  // ==========================================
  // 第 6 步：编写 Vertex Shader
  // (顶点的坐标会自行传输,需要手动传输st(即矩形内相对位置),给到片元着色器的是插值后的结果(每个片元的位置),不是)
  // ==========================================

  const vertexShaderSource = `

    in float batchId; // Cesium 内部需要(必须有)

    // --------------------------------------
    // 1. 接收 Cesium 处理后的高精度位置属性
    // --------------------------------------

    // position3DHigh：位置的高精度部分
    in vec3 position3DHigh;

    // position3DLow：位置的低精度部分
    in vec3 position3DLow;


    // --------------------------------------
    // 2. 接收 JavaScript 传入的 st 属性
    // --------------------------------------

    // 每个顶点都有自己的 st 坐标
    in vec2 st;


    // --------------------------------------
    // 3. 定义输出变量
    // --------------------------------------

    // v_st 将被传递给 Fragment Shader
    // 注意：这是顶点着色器的输出变量
    out vec2 v_st;


    // --------------------------------------
    // 4. 顶点着色器主函数
    // --------------------------------------

    void main() {

        // 使用 Cesium 内置函数计算相对相机位置
        //
        // czm_computePosition() 会结合 Cesium 的
        // 高精度位置属性和当前场景模式进行处理
        vec4 positionRelativeToEye = czm_computePosition();


        // 将顶点从相对相机坐标转换到裁剪坐标
        //
        // gl_Position 是 GLSL 内置输出变量
        // GPU 根据它确定顶点在屏幕中的位置
        gl_Position =
            czm_modelViewProjectionRelativeToEye
            * positionRelativeToEye;


        // 将当前顶点的 st 坐标传递给片元着色器
        //
        // GPU 会在三角形内部对 v_st 进行插值
        v_st = st;

    }`;

  // ==========================================
  // 第 7 步：编写 Fragment Shader(本质是通过像元的位置(可能好会有时间)判断要表现什么颜色)
  // ==========================================

  const fragmentShaderSource = `

    // --------------------------------------
    // 1. 接收 Vertex Shader 传递过来的数据
    // --------------------------------------

    // 接收每个片元对应的局部坐标
    //
    // 注意：
    // 这里的 v_st 已经不是简单的四个顶点数据
    // GPU 会对三角形内部的 v_st 进行插值
    in vec2 v_st;


    // --------------------------------------
    // 2. 片元着色器主函数
    // --------------------------------------

    void main() {

        // ----------------------------------
        // 2.1 获取当前片元在东西方向的位置
        // ----------------------------------

        // v_st.x 的范围为 0.0 ~ 1.0
        //
        // 0.0：四边形西侧
        // 0.5：四边形中间
        // 1.0：四边形东侧

        float t = clamp(v_st.y, 0.0, 1.0);


        // ----------------------------------
        // 2.2 定义起始颜色：蓝色
        // ----------------------------------

        // vec3 分别表示 RGB
        //
        // R = 0.0
        // G = 0.0
        // B = 1.0

        vec3 blueColor = vec3(
            0.0,
            0.0,
            1.0
        );


        // ----------------------------------
        // 2.3 定义结束颜色：红色
        // ----------------------------------

        // R = 1.0
        // G = 0.0
        // B = 0.0

        vec3 redColor = vec3(
            1.0,
            0.0,
            0.0
        );


        // ----------------------------------
        // 2.4 计算颜色渐变
        // ----------------------------------

        // mix(A, B, t) 表示在 A 和 B 之间进行插值
        //
        // t = 0.0 → 完全为蓝色
        // t = 0.5 → 蓝色与红色的中间颜色
        // t = 1.0 → 完全为红色

        // t是线性变化的,所以颜色也是线性变化的
        // vec3 finalColor = mix(
        //     blueColor,
        //     redColor,
        //     t
        // );

        // 非线性但更自然的过度
        float smoothT = smoothstep(0.0, 1.0, t);

        vec3 finalColor = mix(
            blueColor,
            redColor,
            smoothT
        );

        // ----------------------------------
        // 2.5 输出最终颜色
        // ----------------------------------

        // vec4 的四个分量分别是：
        // R、G、B、A
        //
        // A = 1.0 表示完全不透明

        out_FragColor = vec4(
            finalColor,
            1.0
        );

    }

`;

  // ==========================================
  // 第 8 步：创建 Appearance
  // ==========================================

  const appearance = new Cesium.Appearance({
    // 指定我们刚刚编写的顶点着色器
    vertexShaderSource: vertexShaderSource,

    // 指定我们刚刚编写的片元着色器
    fragmentShaderSource: fragmentShaderSource,

    // 当前四边形完全不透明
    // 因此不需要开启 Alpha 混合
    translucent: false,

    // 四边形不是封闭的三维实体
    closed: false,

    // 设置 GPU 渲染状态
    renderState: {
      // 开启深度测试
      // 使四边形能够正确参与场景深度遮挡
      depthTest: {
        enabled: true
      },

      // 关闭背面剔除
      // 避免因为三角形朝向导致四边形不可见
      cull: {
        enabled: false
      }
    }
  });

  // ==========================================
  // 第 9 步：创建 GeometryInstance
  // ==========================================

  // GeometryInstance 将 Geometry 包装为场景中的一个几何实例
  const geometryInstance = new Cesium.GeometryInstance({
    // 指定我们刚刚创建的四边形几何体
    geometry: geometry
  });

  // ==========================================
  // 第 10 步：创建 Primitive
  // ==========================================

  const quadPrimitive = new Cesium.Primitive({
    // 将几何实例交给 Primitive
    geometryInstances: geometryInstance,

    // 指定刚才创建的 Appearance
    // 也就是我们的 GLSL 着色器和渲染状态
    appearance: appearance,

    // 同步创建几何体
    // 方便初学阶段观察创建过程
    asynchronous: false
  });

  // ==========================================
  // 第 11 步：将 Primitive 添加到 Cesium 场景
  // ==========================================

  viewer.scene.primitives.add(quadPrimitive);

  // ==========================================
  // 第 12 步：调整相机视角
  // ==========================================

  // 根据四边形的包围球调整相机
  viewer.camera.flyToBoundingSphere(geometry.boundingSphere, {
    offset: new Cesium.HeadingPitchRange(
      // 相机朝向
      Cesium.Math.toRadians(0),

      // 相机俯仰角
      Cesium.Math.toRadians(-35),

      // 相机与四边形中心的距离
      2200
    ),

    // 相机飞行时间
    duration: 1.5
  });

  // 如果启用了按需渲染，主动请求一次画面更新
  viewer.scene.requestRender();
}
