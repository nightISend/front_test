import { featureCollection, geojsonRbush, point, tin } from "@turf/turf";
import {
  Cartographic,
  CustomHeightmapTerrainProvider,
  Ellipsoid,
  GeographicTilingScheme,
  HeightmapTerrainData,
  Math as CesiumMath,
  Rectangle,
  TileAvailability,
  type Request
} from "cesium";

/** WGS84 经度、纬度（度）和相对参考椭球的高程（米）。 */
export type TerrainVertex = readonly [
  longitude: number,
  latitude: number,
  height: number
];

export interface GeoJSONTerrainProviderOptions {
  /** 每张瓦片每边的采样数，默认 64。 */
  tileSize?: number;
  /** 地形可请求的最高层级。省略时按测点密度估算。 */
  maxLevel?: number;
  /** 三角网之外的背景高程，默认 0 米。 */
  outsideHeight?: number;
}

export interface GeoJSONTerrainImportOptions
  extends GeoJSONTerrainProviderOptions {
  /** 显式指定高程属性。默认依次读取坐标 Z、Elevation、POINT_Z。 */
  heightProperty?: string;
}

// 从 Turf 的返回类型提取单个三角形的几何类型，供后面的空间索引使用。
type TriangleGeometry = ReturnType<typeof tin>["features"][number]["geometry"];
const MAX_LEVEL = 24;
// 局部平面坐标用米表示。小范围内用 WGS84 赤道半径近似换算弧度距离。
const METERS_PER_RADIAN = Ellipsoid.WGS84.maximumRadius;
// 搜索容差的单位是米，重心权重容差没有单位，两者分别处理边界上的浮点误差。
const SEARCH_TOLERANCE = 1e-6;
const WEIGHT_TOLERANCE = 1e-12;

// 缩小外部 JSON 的类型，排除 null 后才能安全读取对象字段。
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/**
 * 将一个 GeoJSON 要素转换成 [经度, 纬度, 高程]。
 * 对外部数据先检查结构，再读取坐标和值；构造函数会进一步校验数值范围。
 */
function readVertex(
  feature: unknown,
  index: number,
  heightProperty?: string
): TerrainVertex {
  if (
    !isRecord(feature) ||
    feature.type !== "Feature" ||
    !isRecord(feature.geometry) ||
    feature.geometry.type !== "Point" ||
    !Array.isArray(feature.geometry.coordinates)
  ) {
    throw new Error(`第 ${index + 1} 个要素必须是 GeoJSON Point`);
  }

  const [longitude, latitude, z] = feature.geometry.coordinates;
  const properties = isRecord(feature.properties) ? feature.properties : {};
  // 显式字段优先。使用 ?? 可以保留有效的 0 米高程，只在缺失时继续查找。
  const height =
    heightProperty === undefined
      ? z ?? properties.Elevation ?? properties.POINT_Z
      : properties[heightProperty];
  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    typeof height !== "number"
  ) {
    throw new Error(`第 ${index + 1} 个要素必须包含数字经纬度和高程`);
  }
  return [longitude, latitude, height];
}

/**
 * 用离散测高点为 Cesium 提供局部地形。
 *
 * 1. 初始化时校验并去重测点，计算范围，将经纬度投影到局部米制平面。
 * 2. 用 Turf 生成一次 Delaunay 三角网，将每个三角形加入 R 树空间索引。
 * 3. Cesium 请求某张地形瓦片时，从同一张三角网上采样规则网格，再由 Cesium
 *    根据 HeightmapTerrainData 创建最后用于渲染的三维网格。
 */
export default class GeoJSONTerrainProvider extends CustomHeightmapTerrainProvider {
  /** 当前测区实际提供的最高瓦片层级。 */
  readonly maxLevel: number;
  /** 索引容量覆盖支持的层级，实际可用的瓦片范围在构造末尾登记。 */
  override readonly availability = new TileAvailability(
    this.tilingScheme,
    MAX_LEVEL + 1
  );

  private readonly surveyRectangle: Rectangle; // 测点包围矩形，边界使用弧度。
  private readonly surveyPositions: readonly Cartographic[];
  private readonly tileSize: number;
  private readonly firstSurfaceLevel: number; // 首次使用实测表面的层级，更粗的层级使用背景。
  private readonly outsideHeight: number;
  private readonly flatBuffer: Float32Array; // 无需插值的瓦片共用同一个恒定高程缓冲区。
  private readonly centralLongitude: number;
  private readonly longitudeScale: number;
  // 根据三角形的包围盒检索候选项，避免每个网格采样点扫描所有三角形。
  private readonly triangles = geojsonRbush<TriangleGeometry>();

  constructor(
    vertices: readonly TerrainVertex[],
    options: GeoJSONTerrainProviderOptions = {}
  ) {
    const tileSize = options.tileSize ?? 64;
    const outsideHeight = options.outsideHeight ?? 0;
    if (!Number.isInteger(tileSize) || tileSize < 2 || tileSize > 256) {
      throw new RangeError("tileSize 必须是 2 到 256 之间的整数");
    }
    if (
      options.maxLevel !== undefined &&
      (!Number.isInteger(options.maxLevel) ||
        options.maxLevel < 0 ||
        options.maxLevel > MAX_LEVEL)
    ) {
      throw new RangeError(`maxLevel 必须是 0 到 ${MAX_LEVEL} 之间的整数`);
    }
    // 检查背景高程在转成瓦片使用的 Float32 后仍然有限，避免写入无穷值。
    if (
      !Number.isFinite(outsideHeight) ||
      !Number.isFinite(Math.fround(outsideHeight))
    ) {
      throw new RangeError("outsideHeight 必须是有限的高程");
    }

    // 父类提供切片方案和几何误差计算。此类重写了 requestTileGeometry，
    // 因此父类要求的 callback 仅用于初始化，地形取样由本类完成。
    super({
      callback: () => undefined,
      tilingScheme: new GeographicTilingScheme(),
      width: tileSize,
      height: tileSize
    });
    this.tileSize = tileSize;
    this.outsideHeight = outsideHeight;
    this.flatBuffer = new Float32Array(tileSize ** 2).fill(outsideHeight);

    // 相同位置只能有一个高度。合并同高程的重复点，提示冲突的测量值。
    const uniquePositions = new Map<string, Cartographic>();
    for (const [longitude, latitude, height] of vertices) {
      if (
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180 ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(height) ||
        !Number.isFinite(Math.fround(height))
      ) {
        throw new Error("测高点必须包含有效的 WGS84 经纬度与有限高程");
      }
      // +180° 与 -180° 表示同一条经线，归一化后用同一个键去重。
      const normalizedLongitude = longitude === 180 ? -180 : longitude;
      const key = `${normalizedLongitude},${latitude}`;
      const existing = uniquePositions.get(key);
      if (existing && existing.height !== height) {
        throw new Error(`经纬度 ${key} 存在冲突的高程`);
      }
      uniquePositions.set(
        key,
        Cartographic.fromDegrees(normalizedLongitude, latitude, height)
      );
    }
    const positions = [...uniquePositions.values()];
    if (positions.length < 3) throw new Error("至少需要 3 个不同位置的测高点");
    this.surveyPositions = positions;

    // Cartographic 内部使用弧度。这里的包围矩形用于相机定位和登记瓦片，
    // 矩形内未被三角网覆盖的空白区域仍然使用背景高程。
    this.surveyRectangle = Rectangle.fromCartographicArray(positions); // 取最小外接矩形
    const { west, width, height, south, north } = this.surveyRectangle;
    this.centralLongitude = west + width / 2;
    // 用 cos(中心纬度) 修正东西向的距离，纬度方向以测区南边界为起点。
    // 正式采样时使用同一套坐标换算，使查询点和三角形位于同一个局部平面。
    // 转经纬度到平面并以turf的点格式存储
    this.longitudeScale = Math.cos((south + north) / 2);
    const points = positions.map(({ longitude, latitude, height }) =>
      point(
        [
          this.projectLongitude(longitude),
          (latitude - south) * METERS_PER_RADIAN
        ],
        {
          elevation: height
        }
      )
    );
    // Turf 读取每个点的 elevation，并把输出三角形前三个顶点的高程依次写入 a、b、c。
    const triangles = tin(featureCollection(points), "elevation");
    if (triangles.features.length === 0) {
      throw new Error("测高点共线，无法构建地形三角网");
    }
    this.triangles.load(triangles);

    // 第 0 级每张瓦片跨 180°，N 个采样点之间有 N - 1 个间隔。
    // 用测区近似面积除以点数再开平方估计点距。每升一级，格点间距减半，
    // 因此用 log2 算出达到这一密度所需的层级。
    const rootSpacing = Math.PI / (tileSize - 1);
    const angularSpacing = Math.sqrt(
      (width * height * this.longitudeScale) / positions.length
    );
    const estimatedLevel = Math.ceil(Math.log2(rootSpacing / angularSpacing));
    this.maxLevel =
      options.maxLevel ?? CesiumMath.clamp(estimatedLevel, 0, MAX_LEVEL);
    // 测区较短的一边大致能容纳 4 个网格间隔后才采样实测面，
    // 避免一个局部高点在粗瓦片上被拉伸到过大的范围。
    const firstLevel = Math.ceil(
      Math.log2((4 * rootSpacing) / Math.min(width, height))
    );
    this.firstSurfaceLevel = CesiumMath.clamp(firstLevel, 0, this.maxLevel);
    this.registerAvailability();
  }

  /**
   * 从已解析的 GeoJSON FeatureCollection 创建地形。
   * 此入口只负责提取顶点，后续校验、建网和瓦片生成与直接传数组相同。
   */
  static fromGeoJSON(
    data: unknown,
    options: GeoJSONTerrainImportOptions = {}
  ): GeoJSONTerrainProvider {
    if (
      !isRecord(data) ||
      data.type !== "FeatureCollection" ||
      !Array.isArray(data.features)
    ) {
      throw new Error("测高点数据必须是 GeoJSON FeatureCollection");
    }
    const vertices = data.features.map((feature, index) =>
      readVertex(feature, index, options.heightProperty)
    );
    return new GeoJSONTerrainProvider(vertices, options);
  }

  /** 返回测区包围矩形的副本，可直接传给 camera.flyTo。 */
  get rectangle(): Rectangle {
    return Rectangle.clone(this.surveyRectangle);
  }

  /** 告诉 Cesium 此瓦片是否有独立数据，供细分和高程采样时查询。 */
  override getTileDataAvailable(x: number, y: number, level: number): boolean {
    return (
      level <= this.maxLevel && this.availability.isTileAvailable(level, x, y)
    );
  }

  /** 测区瓦片达到细节层级后才使用实测表面。 */
  hasSurveySurface(x: number, y: number, level: number): boolean {
    return (
      level >= this.firstSurfaceLevel && this.getTileDataAvailable(x, y, level)
    );
  }

  /** 经度与纬度用弧度。返回米制高程，三角网外使用背景高程。 */
  sampleSurveyHeight(longitude: number, latitude: number): number {
    const x = this.projectLongitude(longitude);
    const y = (latitude - this.surveyRectangle.south) * METERS_PER_RADIAN;
    return this.interpolate(x, y) ?? this.outsideHeight;
  }

  /** 返回指定经纬度矩形内的测点副本，供量化瓦片保留实测顶点。 */
  getSurveyPositions(rectangle: Rectangle): Cartographic[] {
    return this.surveyPositions
      .filter(position => Rectangle.contains(rectangle, position))
      .map(position => Cartographic.clone(position));
  }

  /**
   * Cesium 请求瓦片时的入口。x 向东、y 向南递增，level 表示细节层级。
   * 高程取自内存中的三角网，返回 Promise 以符合 Cesium 提供器接口。
   */
  override async requestTileGeometry(
    x: number,
    y: number,
    level: number,
    _request?: Request
  ): Promise<HeightmapTerrainData> {
    if (level > this.maxLevel) {
      throw new RangeError(`测高点地形的最大层级为 ${this.maxLevel}`);
    }
    // 达到采样层级且瓦片已登记时，对它的经纬度矩形逐点插值；其他情况复用背景网格。
    const buffer = this.hasSurveySurface(x, y, level)
      ? this.sampleTile(this.tilingScheme.tileXYToRectangle(x, y, level))
      : this.flatBuffer;
    // Float32Array 的每个元素已经是米制高程，Cesium 可按默认比例和偏移直接读取。
    return new HeightmapTerrainData({
      buffer,
      width: this.tileSize,
      height: this.tileSize,
      // 用四个位表示可独立加载的子瓦片：西南 1、东南 2、西北 4、东北 8。
      childTileMask: this.availability.computeChildMaskForTile(level, x, y)
    });
  }

  // 记录哪些瓦片是可获取的
  private registerAvailability(): void {
    // 两张根瓦片覆盖全球，后续各级只登记覆盖测区包围矩形的瓦片，
    // 这样高层级的测区瓦片在四叉树中都有可到达的祖先。
    this.availability.addAvailableTileRange(0, 0, 0, 1, 0);
    const { west, east, north, south } = this.surveyRectangle;
    // 跨 180° 时 west 大于 east。把范围拆成经线两侧的两段再求瓦片编号。
    const longitudeRanges =
      west <= east
        ? [[west, east]]
        : [
            [west, Math.PI],
            [-Math.PI, east]
          ];
    for (let level = 1; level <= this.maxLevel; level++) {
      for (const [startLongitude, endLongitude] of longitudeRanges) {
        // 瓦片行号向南递增，用左上角和右下角得到一块连续的编号范围。
        const start = this.tilingScheme.positionToTileXY(
          new Cartographic(startLongitude, north),
          level
        );
        const end = this.tilingScheme.positionToTileXY(
          new Cartographic(endLongitude, south),
          level
        );
        this.availability.addAvailableTileRange(
          level,
          start.x,
          start.y,
          end.x,
          end.y
        );
      }
    }
  }

  /** 把弧度经度展开到中心经线两侧，再换算成局部东西向距离（米）。 */
  private projectLongitude(longitude: number): number {
    return (
      CesiumMath.negativePiToPi(longitude - this.centralLongitude) *
      this.longitudeScale *
      METERS_PER_RADIAN
    );
  }

  /** 把瓦片的经纬度范围采样成 Cesium 可读的一维高程数组。 */
  private sampleTile(rectangle: Rectangle): Float32Array {
    const { tileSize, outsideHeight } = this;
    const buffer = new Float32Array(tileSize ** 2);
    // 行从北向南、列从西向东，网格两端落在瓦片边界上。
    const longitudeStep = rectangle.width / (tileSize - 1);
    const latitudeStep = rectangle.height / (tileSize - 1);
    // 同列的经度和局部 X 坐标一致，先计算每一列，再逐行复用。
    const columns = Array.from({ length: tileSize }, (_, column) =>
      this.projectLongitude(rectangle.west + column * longitudeStep)
    );
    for (let row = 0; row < tileSize; row++) {
      const y =
        (rectangle.north - row * latitudeStep - this.surveyRectangle.south) *
        METERS_PER_RADIAN;
      for (let column = 0; column < tileSize; column++) {
        // 一维索引由行号和列号得到。三角网外没有插值结果，填入背景高程。
        buffer[row * tileSize + column] =
          this.interpolate(columns[column], y) ?? outsideHeight;
      }
    }
    return buffer;
  }

  /** 在局部平面查询一点的高程。空间索引先筛选，重心坐标再判断实际是否落在三角形内。 */
  private interpolate(x: number, y: number): number | undefined {
    const neighboringTriangles = this.triangles.search([
      x - SEARCH_TOLERANCE,
      y - SEARCH_TOLERANCE,
      x + SEARCH_TOLERANCE,
      y + SEARCH_TOLERANCE
    ]);
    for (const triangle of neighboringTriangles.features) {
      const [[ax, ay], [bx, by], [cx, cy]] = triangle.geometry.coordinates[0];
      // GeoJSON 的三角形环末尾重复首点，只取前三个点。分母为 0 代表三角形退化。
      const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (denominator === 0) continue;

      // 重心坐标是三个角点的权重。三个权重均非负时，采样点在三角形内。
      const a = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / denominator;
      const b = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / denominator;
      const c = 1 - a - b;
      if (
        a >= -WEIGHT_TOLERANCE &&
        b >= -WEIGHT_TOLERANCE &&
        c >= -WEIGHT_TOLERANCE
      ) {
        // 权重之和为 1。采样点越靠近一个角点，该顶点对结果的贡献通常越大。
        const heights = triangle.properties;
        return a * heights.a + b * heights.b + c * heights.c;
      }
    }
    return undefined;
  }
}
