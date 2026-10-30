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

    // 默认参数(与 jsonRiverWater.js 保持一致的参数命名)
    this.params = {
      showMeteor: true, // 是否显示
      meteorLength: 150.0, // 粒子长度(米)
      meteorWidth: 30, // 粒子宽度(米)
      flowSpeed: 1.5, // 全局粒子滚动速度基数
      tailLength: 0.99, // 粒子拖尾长度(0~1，越大拖尾越长)
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

    // 【核心 1】：预分配 TypedArray，精准分配固定内存，防止垃圾回收(GC)卡顿
    const posArray = new Float64Array(count * 4 * 3); // 每个点一个片元(四边形),片元的四个顶点有XYZ坐标
    const stArray = new Float32Array(count * 4 * 2); // 每个片元的4个顶点的东和北分量(用于确定角度)
    const colArray = new Uint8Array(count * 4 * 4); // 每个片元的4个顶点颜色 (RGBA，A存随机相位)
    const speedArray = new Float32Array(count * 4); // 每个片元的4个顶点的流速
    const idxArray = new Uint32Array(count * 6); // 组成片元的两个三角形的坐标的索引(每个三角形三个顶点)

    // 游标
    let vIdx = 0; // 已经处理好的片元顶点的数量
    let iIdx = 0;

    // 提取全局参数,片元的长宽,以及相对地面的高度
    const L = this.params.meteorLength;
    const W = this.params.meteorWidth;
    const H = this.params.height;

    // 【核心 2】：提取临时对象到循环体外，全局复用，避免高频 new 导致内存抖动
    const localPoints = [
      new Cesium.Cartesian3(),
      new Cesium.Cartesian3(),
      new Cesium.Cartesian3(),
      new Cesium.Cartesian3()
    ]; // 片元四角坐标(笛卡尔坐标系)
    const worldPoint = new Cesium.Cartesian3();
    const scratchCartesian = new Cesium.Cartesian3(); //中心坐标(笛卡尔坐标系)
    const enuMat = new Cesium.Matrix4(); //中心坐标的旋转矩阵(用于东北天坐标系(局部平面坐标系)和世界坐标系相互转换)
    const scratchColor = new Cesium.Color(); //片元的颜色

    // 遍历外部传入的矢量点数据
    this.pointsData.forEach(pt => {
      // 数据格式要求：pt 包含 { lon, lat, dirX, dirY, speed, colorHex }

      // 1. 构建局部 ENU(东北天)矩阵
      // 注意：如果你的数据是弧度，请改用 Cesium.Cartesian3.fromRadians
      // 先转世界坐标系(即以地心为原点的笛卡尔坐标系(就是在地心建了个XYZ坐标系))
      Cesium.Cartesian3.fromDegrees(
        pt.lon,
        pt.lat,
        H,
        Cesium.Ellipsoid.WGS84,
        scratchCartesian
      );
      // 然后生成以给出的世界坐标为原点的东北天坐标系(局部平面坐标系)的旋转矩阵
      Cesium.Transforms.eastNorthUpToFixedFrame(
        scratchCartesian,
        Cesium.Ellipsoid.WGS84,
        enuMat
      );

      // 2. 计算矩形的四个角在局部平面的位置
      const dirX = pt.dirX || 1.0;
      const dirY = pt.dirY || 0.0;
      // 把流向向量逆时针旋转 90 度，得到一个垂直于流向的向量,从而确定片元四角的坐标.
      // 局部平面坐标系是固定的,但片元相对于是流向的外接矩形,矩形的一条轴与流向保持一直,因此其方向并不与坐标轴一致，需要进行偏移
      const localRightX = -dirY;
      const localRightY = dirX;

      // 以中心点为基准，前后延伸
      const tailX = (-dirX * L) / 2,
        tailY = (-dirY * L) / 2;
      const headX = (dirX * L) / 2,
        headY = (dirY * L) / 2;

      // 顶点 0,1 为尾部两侧，2,3 为头部两侧.注意局部坐标系的XY轴方向是东和北,片元的四个顶点会跟随流向进行旋转,因此需要定位
      // 注意得到的是局部平面坐标系(即东北天坐标系)的坐标
      localPoints[0].x = tailX - (localRightX * W) / 2;
      localPoints[0].y = tailY - (localRightY * W) / 2;
      localPoints[1].x = tailX + (localRightX * W) / 2;
      localPoints[1].y = tailY + (localRightY * W) / 2;
      localPoints[2].x = headX - (localRightX * W) / 2;
      localPoints[2].y = headY - (localRightY * W) / 2;
      localPoints[3].x = headX + (localRightX * W) / 2;
      localPoints[3].y = headY + (localRightY * W) / 2;

      // 3. 解析颜色
      Cesium.Color.fromCssColorString(pt.colorHex || "#00ff78", scratchColor); //通过HEX代码生成cesium的颜色对象给scratchColor
      const cR = Math.round(scratchColor.red * 255);
      const cG = Math.round(scratchColor.green * 255);
      const cB = Math.round(scratchColor.blue * 255);

      // 【核心 3】：随机相位(0~255)，让每个粒子错开，避免同步闪烁
      const randomPhase = Math.floor(Math.random() * 256);

      const baseV = vIdx;

      // 4. 写入 TypedArray
      for (let i = 0; i < 4; i++) {
        localPoints[i].z = 0.0; // ENU 平面上的 Z 轴(不需要抬升，因为 ENU 原点已经抬升了 H)

        // 局部平面坐标 -> 世界坐标,通过矩阵把东北天坐标转换成笛卡尔坐标系坐标(即世界坐标系)
        Cesium.Matrix4.multiplyByPoint(enuMat, localPoints[i], worldPoint);

        // position (3个分量)
        const pIdx = vIdx * 3;
        posArray[pIdx] = worldPoint.x;
        posArray[pIdx + 1] = worldPoint.y;
        posArray[pIdx + 2] = worldPoint.z;

        // st用来判断这是粒子头部还是尾部、左边还是右边(2个分量：U=流向 0尾/1头，V=侧向 0/1 左/右)
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

      // 索引 (两个三角形顶点坐标在posarray中的索引(注意索引表述的顶点的顺序,一个索引对应posarray中3个元素(xyz))
      idxArray[iIdx++] = baseV + 0;
      idxArray[iIdx++] = baseV + 1;
      idxArray[iIdx++] = baseV + 2;
      idxArray[iIdx++] = baseV + 1;
      idxArray[iIdx++] = baseV + 3;
      idxArray[iIdx++] = baseV + 2;
    });

    // ---- 组装 Geometry ----
    this._boundingSphere = Cesium.BoundingSphere.fromVertices(
      Array.from(posArray) //浮点数组转number数组
    ); // 生成外接球体,可以作为对象缩放
    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: posArray //片元顶点的XZY坐标,一维数组
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
      indices: idxArray, // position数组里构成primitive的顶点的索引
      primitiveType: Cesium.PrimitiveType.TRIANGLES, // 设置primitive的类型为三角形
      // 这里的包围球可以用所有点来计算，也可以传一个较大的球体
      boundingSphere: this._boundingSphere
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
        // 顶点着色器,每个顶点一次(约 4×N 次),把 CPU 算好的世界坐标转成屏幕坐标，并把 st、color、speed 这些每个顶点独有的数据传给片元着色器
        vertexShaderSource: `

                    //输入变量
                    in vec3 position3DHigh; //高精度坐标
                    in vec3 position3DLow; //低精度坐标,避免 GPU float 精度不够导致抖动
                    in vec2 st; //Geometry 的 st 属性,当前顶点的 UV st.x = 0(尾) / 1(头),st.y = 0(左) / 1(右)
                    in vec4 color; //颜色
                    in float speed; //速度
                    in float batchId; // Cesium 内部需要

                    // 输出结果
                    out vec2 v_st;
                    out vec4 v_color;
                    out float v_speed;

                    void main() {
                        // Cesium 内置函数，等价于 czm_translateRelativeToEye(position3DHigh, position3DLow)
                        // 它把高/低精度两段拼成一个相对相机的坐标（不是绝对 ECEF，而是“相对眼睛”），这样远距离也不会抖
                        vec4 p = czm_computePosition();
                        // czm_modelViewProjectionRelativeToEye 是 Cesium 注入的 MVP 矩阵（相对眼睛版）。乘完得到裁剪空间坐标，GPU 据此把顶点画到屏幕上。
                        gl_Position = czm_modelViewProjectionRelativeToEye * p;
                        
                        //把顶点属性透传给片元。注意 v_color 是 vec4,A 通道就是随机相位,把随机数藏在颜色里，省一个 attribute 的显存。
                        v_st = st;
                        v_color = color;
                        v_speed = speed;
                    }
                `,
        fragmentShaderSource: `
                    // 顶点着色器的输出作为输入
                    in vec2 v_st;
                    in vec4 v_color;
                    in float v_speed;

                    void main() {
                        vec3 baseCol = v_color.rgb; // 取颜色
                        float phase = v_color.a; // A通道(透明度)就是随机相位

                        // 计算“图案坐标” x(最关键的一行)
                        // czm_frameNumber是帧号,0.015是每帧的推荐量60fps下约等于 0.9/秒。
                        // *v_speed,流速越大移动得越快, phase相位(初始位置)
                        // - v_st.x 减去顶点在矩形内的纵向位置。这一步把“整个矩形”变成“一个移动的坐标系”。
                        // fract取小数部分,结果永远在 [0, 1)，实现无限循环。
                        float x = fract(float(czm_frameNumber) * 0.015 * v_speed + phase - v_st.x);
                        // v_st.y 从 0 到 1（左到右），映射到 -1 ~ +1，这样矩形中心线是 y=0，方便后面用 abs(y) 算“离中心线有多远”。
                        float y = (v_st.y - 0.5) * 2.0; // 横向 [-1, 1]

                        // 形状参数
                        // x < headOffset：头部圆
                        // headOffset < x < headOffset + tailLen：拖尾
                        // 其余：空白（什么都不画）
                        float headOffset = 0.06;  // 头部圆形占图案的 6%
                        float tailLen = ${this.params.tailLength.toFixed(2)}; // 拖尾长度(构建时写入)

                        float dx = x - headOffset; // 相对头部的坐标
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
      duration: 2.0, // 飞行时间(秒)
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(0), // 朝向
        Cesium.Math.toRadians(-45), // 俯仰角
        this._boundingSphere.radius * 3.0 // 距离系数
      )
    });
  }

  /**
   * 更新运行时参数(无需重建几何体)
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
