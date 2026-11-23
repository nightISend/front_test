import { featureCollection, geojsonRbush, point, tin } from "@turf/turf";
import * as Cesium from "cesium";
import {
  BoundingSphere,
  Cartographic,
  Cartesian3,
  Event,
  GeographicTilingScheme,
  HeightmapTerrainData,
  Math as CesiumMath,
  OrientedBoundingBox,
  QuantizedMeshTerrainData,
  Rectangle,
  TerrainProvider,
  TileAvailability,
  type Ellipsoid,
  type Request
} from "cesium";

const MAX_QUANTIZED = 32767;
const GRID_DIVISIONS = 16;
const MAX_LEVEL = 24;
const METERS_PER_RADIAN = Cesium.Ellipsoid.WGS84.maximumRadius;
const SEARCH_TOLERANCE = 1e-6;
const WEIGHT_TOLERANCE = 1e-12;

/** WGS84 经度、纬度（度）和椭球高（米）。 */
export type SurveyVertex = readonly [
  longitude: number,
  latitude: number,
  height: number
];

export interface GeoJSONQuantizedMeshTerrainOptions {
  /** 高程字段。省略时依次读取坐标 Z、Elevation 和 POINT_Z。 */
  heightProperty?: string;
  /** 背景高程图的边长，也是估算几何误差和层级时使用的采样密度。 */
  tileSize?: number;
  /** 可独立请求的最高层级。省略时按测点密度估算。 */
  maxLevel?: number;
  /** 测区之外的背景高程，默认 0 米。 */
  outsideHeight?: number;
}

interface MeshVertex {
  u: number;
  v: number;
  height: number;
}

type TriangleGeometry = ReturnType<typeof tin>["features"][number]["geometry"];
type TriangleValues = { a: number; b: number; c: number };

// 地平线剔除工具。当前 Cesium npm 版本导出了此工具，但未提供对应的 TypeScript 声明。
const { EllipsoidalOccluder } = Cesium as typeof Cesium & {
  EllipsoidalOccluder: new (ellipsoid: Ellipsoid) => {
    // 计算这一张瓦片的剔除点。渲染时若该点被地球遮挡，Cesium 可跳过这张瓦片。
    computeHorizonCullingPointPossiblyUnderEllipsoid(
      direction: Cartesian3, // 从地心指向本瓦片包围盒中心的方向
      positions: Cartesian3[], // 本瓦片解码后的地心三维顶点，包括补点
      minimumHeight: number // 瓦片的最小高程
    ): Cartesian3 | undefined;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

// 读取测高点,返回[经度,纬度,高程]数组
function readSurveyVertex(
  feature: unknown,
  index: number,
  heightProperty?: string
): SurveyVertex {
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

function quantize(fraction: number): number {
  return Math.round(CesiumMath.clamp(fraction, 0, 1) * MAX_QUANTIZED);
}

// 用测高点和采样点一起构建三角网,获取每个三角形的点索引
function triangulate(vertices: MeshVertex[]): Uint16Array | Uint32Array {
  // Turf 将每个顶点的 index 属性带到三角形的 a、b、c 属性中。
  const points = vertices.map(({ u, v }, index) => point([u, v], { index }));
  const triangles = tin(featureCollection(points), "index");
  const indices: number[] = [];
  for (const triangle of triangles.features) {
    const { a, b, c } = triangle.properties as TriangleValues;
    const first = vertices[a];
    const second = vertices[b];
    const third = vertices[c];
    // 计算三角形叉积,用于确定顶点顺序
    const cross =
      (second.u - first.u) * (third.v - first.v) -
      (second.v - first.v) * (third.u - first.u);

    // 从地表外侧看采用逆时针顶点顺序，跳过面积为零的三角形。
    if (cross > 0) indices.push(a, b, c);
    if (cross < 0) indices.push(a, c, b);
  }
  return vertices.length >= 65536
    ? new Uint32Array(indices)
    : new Uint16Array(indices);
}

/**
 * 根据测高点独立建立测区表面和可用瓦片索引。
 * 测区细层级输出 QuantizedMeshTerrainData，粗层级提供背景高程图。
 */
export default class GeoJSONQuantizedMeshTerrainProvider
  implements TerrainProvider
{
  readonly hasWaterMask = false;
  readonly hasVertexNormals = false;
  readonly credit = undefined;
  readonly errorEvent = new Event();
  readonly tilingScheme = new GeographicTilingScheme();
  readonly availability: TileAvailability;
  readonly maxLevel: number;

  private readonly surveyPositions: readonly Cartographic[];
  private readonly surveyRectangle: Rectangle;
  private readonly centralLongitude: number;
  private readonly longitudeScale: number;
  private readonly tileSize: number;
  private readonly outsideHeight: number;
  private readonly flatBuffer: Float32Array;
  private readonly firstSurfaceLevel: number;
  private readonly levelZeroError: number;
  private readonly surveyTriangles = geojsonRbush<TriangleGeometry>();
  private readonly occluder = new EllipsoidalOccluder(
    this.tilingScheme.ellipsoid
  );

  constructor(
    vertices: readonly SurveyVertex[],
    options: GeoJSONQuantizedMeshTerrainOptions = {}
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
    if (
      !Number.isFinite(outsideHeight) ||
      !Number.isFinite(Math.fround(outsideHeight))
    ) {
      throw new RangeError("outsideHeight 必须是有限的高程");
    }
    this.tileSize = tileSize;
    this.outsideHeight = outsideHeight;
    this.flatBuffer = new Float32Array(tileSize ** 2).fill(outsideHeight);

    // 校验并去重。+180° 与 -180° 表示同一条经线。
    const unique = new Map<string, Cartographic>();
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
      const normalizedLongitude = longitude === 180 ? -180 : longitude;
      const key = `${normalizedLongitude},${latitude}`;
      const existing = unique.get(key);
      if (existing && existing.height !== height) {
        throw new Error(`经纬度 ${key} 存在冲突的高程`);
      }
      unique.set(
        key,
        Cartographic.fromDegrees(normalizedLongitude, latitude, height)
      );
    }
    const positions = [...unique.values()];
    if (positions.length < 3) {
      throw new Error("至少需要 3 个不同位置的测高点");
    }
    this.surveyPositions = positions;

    this.surveyRectangle = Rectangle.fromCartographicArray(positions);
    const { west, width, height, south, north } = this.surveyRectangle;
    this.centralLongitude = west + width / 2;
    this.longitudeScale = Math.cos((south + north) / 2);

    // 在测区的局部米制平面建网。这个三角网供所有瓦片查询源高程。
    const points = this.surveyPositions.map(({ longitude, latitude, height }) =>
      point(
        [
          this.projectLongitude(longitude),
          (latitude - south) * METERS_PER_RADIAN
        ],
        { elevation: height }
      )
    );
    const sourceTriangles = tin(featureCollection(points), "elevation");
    if (sourceTriangles.features.length === 0) {
      throw new Error("测高点共线，无法构建地形三角网");
    }
    this.surveyTriangles.load(sourceTriangles);

    // 每升一级，瓦片跨度减半。用测点平均间距估算最细层级。
    // 确认最大和最小瓦片层级,并登记可用瓦片
    const rootSpacing = Math.PI / (tileSize - 1);
    const pointSpacing = Math.sqrt(
      (width * height * this.longitudeScale) / this.surveyPositions.length
    );
    const estimatedLevel = Math.ceil(Math.log2(rootSpacing / pointSpacing));
    this.maxLevel =
      options.maxLevel ?? CesiumMath.clamp(estimatedLevel, 0, MAX_LEVEL);
    const firstLevel = Math.ceil(
      Math.log2((4 * rootSpacing) / Math.min(width, height))
    );
    this.firstSurfaceLevel = CesiumMath.clamp(firstLevel, 0, this.maxLevel);
    // 0层的误差,用于设置瓦片裙带长度,同时用于判断不同层级的误差
    this.levelZeroError =
      TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
        this.tilingScheme.ellipsoid,
        tileSize,
        this.tilingScheme.getNumberOfXTilesAtLevel(0)
      );
    this.availability = new TileAvailability(
      this.tilingScheme,
      this.maxLevel + 1
    );
    // 自创方法,等级可用瓦片
    this.registerAvailability();
  }

  static fromGeoJSON(
    data: unknown,
    options: GeoJSONQuantizedMeshTerrainOptions = {}
  ): GeoJSONQuantizedMeshTerrainProvider {
    if (
      !isRecord(data) ||
      data.type !== "FeatureCollection" ||
      !Array.isArray(data.features)
    ) {
      throw new Error("测高点数据必须是 GeoJSON FeatureCollection");
    }
    const vertices = data.features.map((feature, index) =>
      readSurveyVertex(feature, index, options.heightProperty)
    );
    return new GeoJSONQuantizedMeshTerrainProvider(vertices, options);
  }

  get rectangle(): Rectangle {
    return Rectangle.clone(this.surveyRectangle);
  }

  // Cesium 用几何误差判断画面是否需要更细层级。
  getLevelMaximumGeometricError(level: number): number {
    return this.levelZeroError / 2 ** level;
  }

  // Cesium 用这个方法判断该瓦片有无独立数据。
  getTileDataAvailable(x: number, y: number, level: number): boolean {
    return (
      level <= this.maxLevel && this.availability.isTileAvailable(level, x, y)
    );
  }

  loadTileDataAvailability(): undefined {
    // 测区可用性已登记，无需额外请求。
    return undefined;
  }

  // 这是 Cesium 取瓦片的入口。根据瓦片编号取得范围，再构建对应的网格。
  async requestTileGeometry(
    x: number,
    y: number,
    level: number,
    _request?: Request
  ): Promise<QuantizedMeshTerrainData | HeightmapTerrainData> {
    if (level > this.maxLevel) {
      throw new RangeError(`测高点地形的最大层级为 ${this.maxLevel}`);
    }
    // 根据可用性索引标记下一层哪些子瓦片有独立的数据。
    const childTileMask = this.availability.computeChildMaskForTile(
      level,
      x,
      y
    );
    let buffer = this.flatBuffer;
    if (
      level >= this.firstSurfaceLevel &&
      this.getTileDataAvailable(x, y, level)
    ) {
      const rectangle = this.tilingScheme.tileXYToRectangle(x, y, level);
      const mesh = this.createQuantizedMesh(
        rectangle,
        this.getLevelMaximumGeometricError(level) * 5,
        childTileMask
      );
      if (mesh) return mesh;
      buffer = this.sampleHeightmap(rectangle);
    }
    return new HeightmapTerrainData({
      buffer,
      width: this.tileSize,
      height: this.tileSize,
      childTileMask
    });
  }

  private registerAvailability(): void {
    // 先登记两张全球根瓦片，再逐级登记测区，确保细瓦片有可到达的父瓦片。
    this.availability.addAvailableTileRange(0, 0, 0, 1, 0);
    const { west, east, north, south } = this.surveyRectangle;
    // 跨 180° 时分别登记经线两侧的范围。
    const longitudeRanges =
      west <= east
        ? [[west, east]]
        : [
            [west, Math.PI],
            [-Math.PI, east]
          ];
    for (let level = 1; level <= this.maxLevel; level++) {
      for (const [startLongitude, endLongitude] of longitudeRanges) {
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

  private projectLongitude(longitude: number): number {
    return (
      CesiumMath.negativePiToPi(longitude - this.centralLongitude) *
      this.longitudeScale *
      METERS_PER_RADIAN
    );
  }

  // 取坐标的高程
  private sampleSurveyHeight(longitude: number, latitude: number): number {
    const x = this.projectLongitude(longitude);
    const y = (latitude - this.surveyRectangle.south) * METERS_PER_RADIAN;
    const candidates = this.surveyTriangles.search([
      x - SEARCH_TOLERANCE,
      y - SEARCH_TOLERANCE,
      x + SEARCH_TOLERANCE,
      y + SEARCH_TOLERANCE
    ]);
    for (const triangle of candidates.features) {
      const [[ax, ay], [bx, by], [cx, cy]] = triangle.geometry.coordinates[0];
      const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (denominator === 0) continue;

      // 三个重心权重在容差内均非负，表示采样点落在三角形内。
      const a = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / denominator;
      const b = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / denominator;
      const c = 1 - a - b;
      if (
        a >= -WEIGHT_TOLERANCE &&
        b >= -WEIGHT_TOLERANCE &&
        c >= -WEIGHT_TOLERANCE
      ) {
        const heights = triangle.properties as TriangleValues;
        return a * heights.a + b * heights.b + c * heights.c;
      }
    }
    return this.outsideHeight;
  }

  // 生成瓦片高程矩阵
  private sampleHeightmap(rectangle: Rectangle): Float32Array {
    const { tileSize } = this;
    const buffer = new Float32Array(tileSize ** 2);
    // 量化瓦片无法构建时，从同一个源表面重新采样。高程图从北向南逐行存储。
    for (let row = 0; row < tileSize; row++) {
      const latitude = CesiumMath.lerp(
        rectangle.north,
        rectangle.south,
        row / (tileSize - 1)
      );
      for (let column = 0; column < tileSize; column++) {
        const longitude = CesiumMath.lerp(
          rectangle.west,
          rectangle.east,
          column / (tileSize - 1)
        );
        buffer[row * tileSize + column] = this.sampleSurveyHeight(
          longitude,
          latitude
        );
      }
    }
    return buffer;
  }

  // 取瓦片范围内的测点和补点。经纬度使用弧度，顶点的高程仍以米保存。
  private collectVertices(rectangle: Rectangle): MeshVertex[] {
    const vertices = new Map<number, MeshVertex>();
    const add = (u: number, v: number, height: number) => {
      // 同一个量化位置只保留一个顶点，先加入的实测高程优先。
      const key = v * (MAX_QUANTIZED + 1) + u;
      if (!vertices.has(key)) vertices.set(key, { u, v, height });
    };

    // 优先保留瓦片内部的实测点。边界点由统一的格点取样，便于相邻瓦片对齐。
    // 收集测高点,测高点的经纬度要量化到局部,高度不量化
    for (const position of this.surveyPositions) {
      if (!Rectangle.contains(rectangle, position)) continue;
      // 按瓦片西边和南边计算比例，得到从 0 到 32767 的 u、v。
      const u = quantize(
        (position.longitude - rectangle.west) / rectangle.width
      );
      const v = quantize(
        (position.latitude - rectangle.south) / rectangle.height
      );
      if (u > 0 && u < MAX_QUANTIZED && v > 0 && v < MAX_QUANTIZED) {
        add(u, v, position.height);
      }
    }

    // 这里选用 17 × 17 个补点位置，四角与瓦片四角重合。
    // 补点网格覆盖四角、公共边和点稀疏的区域。
    // 先确定量化后的位置，再查询那个位置的高程。
    // 生成采样点并计算采样点的高程
    for (let row = 0; row <= GRID_DIVISIONS; row++) {
      const v = quantize(row / GRID_DIVISIONS);
      const latitude = CesiumMath.lerp(
        rectangle.south,
        rectangle.north,
        v / MAX_QUANTIZED
      );
      for (let column = 0; column <= GRID_DIVISIONS; column++) {
        const u = quantize(column / GRID_DIVISIONS);
        const longitude = CesiumMath.lerp(
          rectangle.west,
          rectangle.east,
          u / MAX_QUANTIZED
        );
        // 三角网插值计算采样点高程
        add(u, v, this.sampleSurveyHeight(longitude, latitude));
      }
    }
    return [...vertices.values()];
  }

  // 构建量化瓦片
  private createQuantizedMesh(
    rectangle: Rectangle,
    skirtHeight: number,
    childTileMask: number
  ): QuantizedMeshTerrainData | undefined {
    const vertices = this.collectVertices(rectangle);
    // 获取瓦片内测高点和补点构成的三角形索引。
    const indices = triangulate(vertices);
    if (indices.length === 0) return undefined;
    const count = vertices.length;
    const ellipsoid = this.tilingScheme.ellipsoid;
    // 计算瓦片内高程范围
    let minimumHeight = Infinity;
    let maximumHeight = -Infinity;
    for (const { height } of vertices) {
      minimumHeight = Math.min(minimumHeight, height);
      maximumHeight = Math.max(maximumHeight, height);
    }
    const heightRange = maximumHeight - minimumHeight;

    // 数组按 [全部 u, 全部 v, 全部 h] 存储。平坦瓦片的高度编码直接用 0。
    const quantizedVertices = new Uint16Array(count * 3); // 存放量化顶点的一维数组,注意先放所有的u,再放所有的v,最后放所有的h
    const westIndices: number[] = [];
    const eastIndices: number[] = [];
    const southIndices: number[] = [];
    const northIndices: number[] = [];
    const positions = vertices.map(({ u, v, height }, index) => {
      // 高度按本瓦片的范围量化。平坦瓦片用 0 表示共同高程。
      const h =
        heightRange === 0
          ? 0
          : quantize((height - minimumHeight) / heightRange);
      quantizedVertices[index] = u;
      quantizedVertices[index + count] = v;
      quantizedVertices[index + 2 * count] = h;
      if (u === 0) westIndices.push(index);
      if (u === MAX_QUANTIZED) eastIndices.push(index);
      if (v === 0) southIndices.push(index);
      if (v === MAX_QUANTIZED) northIndices.push(index);

      // 把量化值还原为经纬度和高程，再转成地心三维坐标计算裁剪信息。
      // lerp 按给定比例在两个端点之间取值。
      return Cartesian3.fromRadians(
        CesiumMath.lerp(rectangle.west, rectangle.east, u / MAX_QUANTIZED),
        CesiumMath.lerp(rectangle.south, rectangle.north, v / MAX_QUANTIZED),
        minimumHeight + (h / MAX_QUANTIZED) * heightRange,
        ellipsoid
      );
    });
    const orientedBoundingBox = OrientedBoundingBox.fromRectangle(
      rectangle,
      minimumHeight,
      maximumHeight,
      ellipsoid
    );
    // 计算代表点。Cesium 在渲染阶段使用它和相机位置做遮挡判断。
    const horizonOcclusionPoint =
      this.occluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
        orientedBoundingBox.center,
        positions,
        minimumHeight
      );
    // 无法得到有效地平线剔除点时，调用方仍可返回同一地表的高程图。
    if (!horizonOcclusionPoint) return undefined;

    return new QuantizedMeshTerrainData({
      quantizedVertices,
      indices,
      minimumHeight,
      maximumHeight,
      boundingSphere: BoundingSphere.fromPoints(positions),
      orientedBoundingBox,
      horizonOcclusionPoint,
      westIndices,
      eastIndices,
      southIndices,
      northIndices,
      // 裙边沿瓦片边缘向下延伸，用于遮挡邻接处的小缝。
      westSkirtHeight: skirtHeight,
      eastSkirtHeight: skirtHeight,
      southSkirtHeight: skirtHeight,
      northSkirtHeight: skirtHeight,
      childTileMask
    });
  }
}
