import { inflate } from "pako";
import {
  DeveloperError,
  Ellipsoid,
  Resource,
  HeightmapTerrainData,
  Rectangle,
  TileAvailability,
  CustomHeightmapTerrainProvider,
  type Request
} from "cesium";

type BaseOptions = ConstructorParameters<
  typeof CustomHeightmapTerrainProvider
>[0];

interface GeoTerrainProviderOptions
  extends Pick<BaseOptions, "tilingScheme" | "credit"> {
  url: string;
  subdomains?: readonly string[];
  // int16 对应原实现的两字节整数解码，float 对应四字节浮点数。
  dataType?: "int16" | "float";
  token?: string;
}

const SOURCE_SIZE = 150;
const TILE_SIZE = 64;

/**
 * 将天地图 elv_c 接口返回的压缩高程瓦片转换成 Cesium 高程图。
 * Viewer 渲染地球时会按需调用 requestTileGeometry，并用返回的高程图生成地形网格。
 */
class GeoTerrainProvider extends CustomHeightmapTerrainProvider {
  private readonly url: string;
  private readonly subdomains?: readonly string[];
  private readonly dataType: "int16" | "float";
  private readonly token?: string;

  // 保留原实现的覆盖范围设置。当前为空，子瓦片掩码因此为 0。
  private readonly rectangles: { rectangle: Rectangle; maxLevel: number }[] =
    [];
  private readonly topLevel = 5;
  private readonly bottomLevel = 12;

  // 每个采样点占四字节，前三字节按大端顺序存储高程编码，第四字节为填充。
  // Cesium 用“编码值 × 0.001 − 1000”还原以米为单位的高度。
  private readonly terrainStructure = {
    heightScale: 0.001,
    heightOffset: -1000,
    elementsPerHeight: 3, // 每 3 个字节组成一个高度值
    stride: 4, // 但每 4 个字节才是一个像素的起点（有 1 字节填充）
    elementMultiplier: 256,
    isBigEndian: true
  };

  override readonly availability = new TileAvailability(this.tilingScheme, 19); //用于记录哪些瓦片可用,19是最大层级
  private flatHeightBuffer?: Uint8Array;

  constructor(options: GeoTerrainProviderOptions) {
    // 父类负责切片方案和几何误差计算，获取瓦片的逻辑由下方重写的方法接管。
    super({
      tilingScheme: options?.tilingScheme,
      credit: options?.credit,
      callback: () => undefined,
      ellipsoid: Ellipsoid.WGS84,
      width: TILE_SIZE,
      height: TILE_SIZE
    });

    if (options?.url == null) {
      throw new DeveloperError("options.url is required.");
    }
    this.url = options.url;
    this.subdomains = options.subdomains;
    this.dataType = options.dataType ?? "int16";
    this.token = options.token;

    // 初始化可用性索引，登记地理切片方案第 0 级的两张根瓦片。
    // 0, 0, 0, 1, 0 层级0,开始XY为00,结束的XY为10

    this.availability.addAvailableTileRange(0, 0, 0, 1, 0);
  }

  /**
   *获取瓦片数据并转换成HeightmapTerrainData格式,同时记录哪些瓦片可用
   * @param x
   * @param y
   * @param level
   * @param request
   * @returns
   */
  override requestTileGeometry(
    x: number,
    y: number,
    level: number,
    request?: Request
  ): Promise<HeightmapTerrainData> | undefined {
    // 天地图请求层级比 Cesium 大 1。沿用原实现观测到的服务上限 l=12。
    if (level >= this.bottomLevel) {
      return Promise.reject(`${level}该级别不发送请求!`);
    }
    // Cesium 第 0–4 级使用本地零高程瓦片，供低层级渲染。
    if (level < this.topLevel) {
      return Promise.resolve(
        new HeightmapTerrainData({
          buffer: this.getFlatHeightBuffer(),
          width: TILE_SIZE,
          height: TILE_SIZE,
          childTileMask: this.getChildTileMask(x, y, level),
          structure: this.terrainStructure
        })
      );
    }

    // 根据瓦片坐标分散子域请求，再填入坐标、层级和可选的令牌占位符。
    let url = this.url;
    if (this.subdomains?.length) {
      const subdomain = this.subdomains[(x + y) % this.subdomains.length];
      url = url.replace("{s}", subdomain);
    }
    url = url
      .replace("{token}", String(this.token))
      .replace("{x}", String(x))
      .replace("{y}", String(y))
      .replace("{z}", String(level + 1));

    // 沿用 Cesium 请求调度。返回 undefined 表示本次未发起请求，Cesium 稍后会重试。
    const tileResource = Resource.fetchArrayBuffer({ url, request });
    if (!tileResource) return undefined;

    return tileResource.then(buffer => {
      // 沿用原实现的短响应过滤，再解压并校验高程网格。
      if (buffer.byteLength < 1000) throw new Error("无效数据");
      const heights: Uint8Array = inflate(new Uint8Array(buffer));
      const terrainData = new HeightmapTerrainData({
        buffer: this.transformBuffer(heights),
        width: TILE_SIZE,
        height: TILE_SIZE,
        childTileMask: this.getChildTileMask(x, y, level),
        structure: this.terrainStructure
      });
      // 保留原实现对地形裙边内部字段的设置，Cesium 创建网格时会重新计算该值。Object.assign把两个object的属性合并在一起,有同名属性取大的值
      Object.assign(terrainData, { _skirtHeight: 6000 });

      // 成功构造高程图后登记该瓦片，供 Cesium 查询已知的可用范围。
      this.availability.addAvailableTileRange(level, x, y, x, y);
      return terrainData;
    });
  }
  /**
   * 判断层级是否可用
   * @param _x
   * @param _y
   * @param level
   * @returns
   */
  override getTileDataAvailable(
    _x: number,
    _y: number,
    level: number
  ): boolean | undefined {
    // 原实现按层级报告可用性，达到请求上限后返回 undefined。
    return level < this.bottomLevel ? true : undefined;
  }

  /**
   * 用最近邻采样把 150 网格降到 64 网格，并将天地图的高程编码（如 int16 + 特定偏移）重新编码为 Cesium 能理解的字节布局
   * @param source 解压后的天地图高程数据
   * @returns
   */
  private transformBuffer(source: Uint8Array): Uint8Array {
    const bytesPerHeight = this.dataType === "float" ? 4 : 2;
    if (source.length !== SOURCE_SIZE ** 2 * bytesPerHeight) {
      throw new Error("天地图地形瓦片的高程数据长度无效");
    }

    const sourceView = new DataView(
      source.buffer,
      source.byteOffset,
      source.byteLength
    );
    const target = new Uint8Array(
      TILE_SIZE ** 2 * this.terrainStructure.stride
    );
    for (let row = 0; row < TILE_SIZE; row++) {
      // 将目标行列映射到原始网格并向下取整，保留瓦片四条边上的采样位置。
      const sourceRow = Math.floor(((SOURCE_SIZE - 1) * row) / (TILE_SIZE - 1));
      for (let column = 0; column < TILE_SIZE; column++) {
        const sourceColumn = Math.floor(
          ((SOURCE_SIZE - 1) * column) / (TILE_SIZE - 1)
        );
        const offset =
          (sourceRow * SOURCE_SIZE + sourceColumn) * bytesPerHeight;

        // 服务数据按小端读取。两字节分支沿用原实现的无符号读取方式。
        let height =
          bytesPerHeight === 4
            ? sourceView.getFloat32(offset, true)
            : sourceView.getUint16(offset, true);
        if (height > 10000 || height < -2000) height = 0;

        // 将米制高程转换为 Cesium 所需的三字节编码，依次写入高、中、低位。
        const { heightOffset, heightScale, stride } = this.terrainStructure;
        const encoded = (height - heightOffset) / heightScale;
        const index = (row * TILE_SIZE + column) * stride;
        target[index] = encoded / 65536;
        target[index + 1] = (encoded - target[index] * 65536) / 256;
        target[index + 2] =
          encoded - target[index] * 65536 - target[index + 1] * 256;
        target[index + 3] = 255;
      }
    }
    return target;
  }

  /**
   * 返回0米高程,用于1至4层
   * @returns
   */
  private getFlatHeightBuffer(): Uint8Array {
    // 缓存零米高程的编码 1000000（0x0F4240），所有低层级瓦片共用这份缓冲区。
    if (!this.flatHeightBuffer) {
      const buffer = new Uint8Array(TILE_SIZE ** 2 * 4);
      for (let index = 0; index < buffer.length; index += 4) {
        buffer.set([15, 66, 64, 255], index);
      }
      this.flatHeightBuffer = buffer;
    }
    return this.flatHeightBuffer;
  }

  private getChildTileMask(x: number, y: number, level: number): number {
    const scratch = new Rectangle();
    const parent = this.tilingScheme.tileXYToRectangle(x, y, level);
    let mask = 0;

    // 只处理覆盖当前瓦片且允许继续细分的范围，逐个判断子瓦片是否与该范围相交。
    for (const { rectangle, maxLevel } of this.rectangles) {
      if (mask === 15) break;
      if (
        maxLevel <= level ||
        !Rectangle.intersection(rectangle, parent, scratch)
      ) {
        continue;
      }

      // Cesium 的位标记分别为西南 1、东南 2、西北 4、东北 8，瓦片 y 向南递增。
      const childX = x * 2;
      const childY = y * 2;
      const intersects = (column: number, row: number): boolean => {
        const child = this.tilingScheme.tileXYToRectangle(
          column,
          row,
          level + 1
        );
        return Rectangle.intersection(child, rectangle, scratch) !== undefined;
      };
      if (intersects(childX, childY)) mask |= 4;
      if (intersects(childX + 1, childY)) mask |= 8;
      if (intersects(childX, childY + 1)) mask |= 1;
      if (intersects(childX + 1, childY + 1)) mask |= 2;
    }
    return mask;
  }
}

export default GeoTerrainProvider;
