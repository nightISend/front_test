import * as Cesium from "cesium";

export default class FlowParticles {
  /**
   * @param {Cesium.Viewer} viewer Cesium场景
   * @param {Array} pointsData 数据点数组，格式见下方示例
   * @param {Object} options 可选参数覆盖
   */
  // ✨ 在类体最上方，显式声明所有用到的成员变量及其类型
  public viewer: Cesium.Viewer;
  public pointsData: any[]; // 建议替换为你实际的数据接口类型
  public primitive: Cesium.Primitive | null;
  public params: any; // 如果你定义了 params 的接口，可以替换成具体类型
  private _boundingSphere?: Cesium.BoundingSphere;
  private _updateTimer?: number | NodeJS.Timeout;

  constructor(viewer, pointsData, options = {}) {
    this.viewer = viewer;
    this.pointsData = pointsData;
    this.primitive = null;

    // 默认参数（与 jsonRiverWater.js 保持一致的参数命名）
    this.params = {
      showMeteor: true, // 是否显示
      meteorLength: 150.0, // 粒子长度（米）
      meteorWidth: 30, // 粒子宽度（米）
      flowSpeed: 1.5, // 全局粒子滚动速度基数
      tailLength: 0.99, // 粒子拖尾长度（0~1，越大拖尾越长）
      meteorAlpha: 0.8, // 粒子透明度
      height: 0.5 // 抬高高度，防止与地表 Z-Fighting
    };

    Object.assign(this.params, options);

    this._init();
  }

  /**
   * 初始化粒子几何体与材质
   */
  _init() {
    if (!this.pointsData || this.pointsData.length === 0) {
      console.warn("FlowParticles: 没有提供数据点。");
      return;
    }

    const count = this.pointsData.length;

    // 【核心 1】：预分配 TypedArray，精准分配固定内存，防止垃圾回收（GC）卡顿
    const posArray = new Float64Array(count * 4 * 3); // 4 个顶点/点，3 个分量/顶点 (XYZ)
    const stArray = new Float32Array(count * 4 * 2); // 2 个分量/顶点 (U, V)
    const colArray = new Uint8Array(count * 4 * 4); // 4 个分量/顶点 (RGBA，A存随机相位)
    const speedArray = new Float32Array(count * 4); // 1 个分量/顶点 (流速)
    const idxArray = new Uint32Array(count * 6); // 6 个索引/点 (2个三角形)

    // 游标
    let vIdx = 0;
    let iIdx = 0;

    // 提取全局参数
    const L = this.params.meteorLength;
    const W = this.params.meteorWidth;
    const H = this.params.height;

    // 【核心 2】：提取临时对象到循环体外，全局复用，避免高频 new 导致内存抖动
    const localPoints = [
      new Cesium.Cartesian3(),
      new Cesium.Cartesian3(),
      new Cesium.Cartesian3(),
      new Cesium.Cartesian3()
    ];
    const worldPoint = new Cesium.Cartesian3();
    const scratchCartesian = new Cesium.Cartesian3();
    const enuMat = new Cesium.Matrix4();
    const scratchColor = new Cesium.Color();

    // 遍历外部传入的矢量点数据
    this.pointsData.forEach(pt => {
      // 数据格式要求：pt 包含 { lon, lat, dirX, dirY, speed, colorHex }

      // 1. 构建局部 ENU（东北天）矩阵
      // 注意：如果你的数据是弧度，请改用 Cesium.Cartesian3.fromRadians
      Cesium.Cartesian3.fromDegrees(
        pt.lon,
        pt.lat,
        H,
        Cesium.Ellipsoid.WGS84,
        scratchCartesian
      );
      Cesium.Transforms.eastNorthUpToFixedFrame(
        scratchCartesian,
        Cesium.Ellipsoid.WGS84,
        enuMat
      );

      // 2. 计算矩形的四个角在局部平面的位置
      const dirX = pt.dirX || 1.0;
      const dirY = pt.dirY || 0.0;
      // 垂直流向的方向
      const localRightX = -dirY;
      const localRightY = dirX;

      // 以中心点为基准，前后延伸
      const tailX = (-dirX * L) / 2,
        tailY = (-dirY * L) / 2;
      const headX = (dirX * L) / 2,
        headY = (dirY * L) / 2;

      // 顶点 0,1 为尾部两侧，2,3 为头部两侧
      localPoints[0].x = tailX - (localRightX * W) / 2;
      localPoints[0].y = tailY - (localRightY * W) / 2;
      localPoints[1].x = tailX + (localRightX * W) / 2;
      localPoints[1].y = tailY + (localRightY * W) / 2;
      localPoints[2].x = headX - (localRightX * W) / 2;
      localPoints[2].y = headY - (localRightY * W) / 2;
      localPoints[3].x = headX + (localRightX * W) / 2;
      localPoints[3].y = headY + (localRightY * W) / 2;

      // 3. 解析颜色
      Cesium.Color.fromCssColorString(pt.colorHex || "#00ff78", scratchColor);
      const cR = Math.round(scratchColor.red * 255);
      const cG = Math.round(scratchColor.green * 255);
      const cB = Math.round(scratchColor.blue * 255);

      // 【核心 3】：随机相位（0~255），让每个粒子错开，避免同步闪烁
      const randomPhase = Math.floor(Math.random() * 256);

      const baseV = vIdx;

      // 4. 写入 TypedArray
      for (let i = 0; i < 4; i++) {
        localPoints[i].z = 0.0; // ENU 平面上的 Z 轴（不需要抬升，因为 ENU 原点已经抬升了 H）

        // 局部坐标 -> 世界坐标
        Cesium.Matrix4.multiplyByPoint(enuMat, localPoints[i], worldPoint);

        // position (3个分量)
        const pIdx = vIdx * 3;
        posArray[pIdx] = worldPoint.x;
        posArray[pIdx + 1] = worldPoint.y;
        posArray[pIdx + 2] = worldPoint.z;

        // st (2个分量：U=流向 0尾/1头，V=侧向 0/1)
        const sIdx = vIdx * 2;
        stArray[sIdx] = i < 2 ? 0.0 : 1.0;
        stArray[sIdx + 1] = i % 2 === 0 ? 0.0 : 1.0;

        // color + phase (4个分量：R, G, B, A=随机相位)
        const colIdx = vIdx * 4;
        colArray[colIdx] = cR;
        colArray[colIdx + 1] = cG;
        colArray[colIdx + 2] = cB;
        colArray[colIdx + 3] = randomPhase;

        // speed (1个分量)
        speedArray[vIdx] = pt.speed || 1.0;

        vIdx++;
      }

      // 索引 (两个三角形)
      idxArray[iIdx++] = baseV + 0;
      idxArray[iIdx++] = baseV + 1;
      idxArray[iIdx++] = baseV + 2;
      idxArray[iIdx++] = baseV + 1;
      idxArray[iIdx++] = baseV + 3;
      idxArray[iIdx++] = baseV + 2;
    });

    // ---- 组装 Geometry ----
    this._boundingSphere = Cesium.BoundingSphere.fromVertices(posArray);
    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: posArray
        }),
        st: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: stArray
        }),
        // 注意：UNSIGNED_BYTE 类型，需要开启 normalize，这样Shader里收到的就是 0.0~1.0
        color: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.UNSIGNED_BYTE,
          componentsPerAttribute: 4,
          values: colArray,
          normalize: true
        }),
        speed: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 1,
          values: speedArray
        })
      },
      indices: idxArray,
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      // 这里的包围球可以用所有点来计算，也可以传一个较大的球体
      boundingSphere: Cesium.BoundingSphere.fromVertices(Array.from(posArray))
    });

    // ---- 组装 Primitive 和 Shader ----
    this.primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({ geometry }),
      appearance: new Cesium.Appearance({
        renderState: {
          blending: Cesium.BlendingState.ALPHA_BLEND,
          depthTest: { enabled: true },
          cull: { enabled: false }
        },
        vertexShaderSource: `
                    in vec3 position3DHigh;
                    in vec3 position3DLow;
                    in vec2 st;
                    in vec4 color;
                    in float speed;
                    in float batchId; // ✨ 补上这一行，消除报错

                    out vec2 v_st;
                    out vec4 v_color;
                    out float v_speed;

                    void main() {
                        // 高/低精度世界坐标还原，防抖动
                        vec4 p = czm_computePosition();
                        gl_Position = czm_modelViewProjectionRelativeToEye * p;
                        v_st = st;
                        v_color = color;
                        v_speed = speed;
                    }
                `,
        fragmentShaderSource: `
                    in vec2 v_st;
                    in vec4 v_color;
                    in float v_speed;

                    void main() {
                        vec3 baseCol = v_color.rgb;
                        float phase = v_color.a; // A通道就是随机相位

                        // 时间控制：0.015 是每帧推进量
                        float x = fract(float(czm_frameNumber) * 0.015 * v_speed + phase - v_st.x);
                        float y = (v_st.y - 0.5) * 2.0; // 横向 [-1, 1]

                        // 形状参数
                        float headOffset = 0.06;  // 头部圆半径
                        float tailLen = ${this.params.tailLength.toFixed(2)}; // 拖尾长度（构建时写入）

                        float dx = x - headOffset;
                        float shape = 0.0;
                        float core = 0.0;

                        if (dx <= 0.0) {
                            // 头部
                            float r = length(vec2(dx / headOffset, y));
                            shape = smoothstep(1.0, 0.2, r);
                            core = smoothstep(0.5, 0.0, r);
                        } else if (dx < tailLen) {
                            // 尾部
                            float tFront = dx / tailLen;
                            float widthCurve = pow(1.0 - tFront, 1.0); 
                            float r = abs(y) / (widthCurve + 0.001);
                            float fadeOut = pow(1.0 - tFront, 1.2);
                            shape = smoothstep(1.0, 0.2, r) * fadeOut;
                            core = smoothstep(0.5, 0.0, r) * fadeOut;
                        }

                        // 头部提亮
                        vec3 finalColor = baseCol * (1.0 + core * 0.8);
                        float alpha = shape * ${this.params.meteorAlpha.toFixed(2)};

                        if (alpha < 0.05) discard;
                        out_FragColor = vec4(finalColor, alpha);
                    }
                `
      }),
      show: this.params.showMeteor,
      asynchronous: false
    });

    this.viewer.scene.primitives.add(this.primitive);
    this.viewer.camera.flyToBoundingSphere(this._boundingSphere, {
      duration: 2.0, // 飞行时间（秒）
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(0), // 朝向
        Cesium.Math.toRadians(-45), // 俯仰角
        this._boundingSphere.radius * 3.0 // 距离系数
      )
    });
  }

  /**
   * 更新运行时参数（无需重建几何体）
   */
  updateParams(newParams) {
    if (newParams.showMeteor !== undefined && this.primitive) {
      this.primitive.show = newParams.showMeteor;
      this.params.showMeteor = newParams.showMeteor;
    }
    // 注意：如果要改长度、宽度、流速、透明度，必须重建 Primitive，因为已经烘焙进 Shader 或几何体了
    // 这里只保留最基础的显隐控制
  }

  /**
   * 销毁清理
   */
  destroy() {
    if (this.viewer && this.primitive) {
      this.viewer.scene.primitives.remove(this.primitive);
      this.primitive = null;
    }
    this.pointsData = null;
  }
}
