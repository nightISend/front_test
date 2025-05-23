<template>
  # 系统架构设计

  <div
    style="
      display: flex;
      gap: 2rem;
      justify-content: center;
      padding: 2rem;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border-radius: 16px;
      box-shadow: 0 8px 16px rgb(0 0 0 / 10%);
    "
  >
    <!-- 左侧表现层 -->
    <div
      style="flex: 1; padding: 1.5rem; background: white; border-radius: 12px"
    >
      <h3 style=" margin: 0 0 1rem;color: #2c3e50">🎨 表现层</h3>
      <div
        style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem"
      >
        <div style=" padding: 0.8rem;background: #e8f4ff; border-radius: 8px">
          <h4 style="margin: 0 0 0.5rem">🔐 系统登录</h4>
          <p style="margin: 0; font-size: 0.9em">• 账号密码<br />• 密码验证</p>
        </div>
        <div style=" padding: 0.8rem;background: #e8f4ff; border-radius: 8px">
          <h4 style="margin: 0 0 0.5rem">🗃️ 数据管理</h4>
          <p style="margin: 0; font-size: 0.9em">• 记录管理<br />• 用户管理</p>
        </div>
        <div style=" padding: 0.8rem;background: #e8f4ff; border-radius: 8px">
          <h4 style="margin: 0 0 0.5rem">📊 数据展示</h4>
          <p style="margin: 0; font-size: 0.9em">• 数据统计<br />• 图像显示</p>
        </div>
        <div style=" padding: 0.8rem;background: #e8f4ff; border-radius: 8px">
          <h4 style="margin: 0 0 0.5rem">🌍 地图交互</h4>
          <p style="margin: 0; font-size: 0.9em">• 空间分析<br />• 信息展示</p>
        </div>
      </div>
    </div>

    <!-- 右侧数据层 -->
    <div
      style="
        flex: 0.6;
        padding: 1.5rem;
        color: white;
        background: #2c3e50;
        border-radius: 12px;
      "
    >
      <h3 style="margin: 0 0 1rem">💾 数据层</h3>
      <div style="display: grid; gap: 1rem">
        <div
          style="
            padding: 1rem;
            text-align: center;
            background: #3b4d5e;
            border-radius: 8px;
          "
        >
          <p style="margin: 0">🗺️ PostGIS</p>
        </div>
        <div
          style="
            padding: 1rem;
            text-align: center;
            background: #3b4d5e;
            border-radius: 8px;
          "
        >
          <p style="margin: 0">🔌 AXIOS</p>
        </div>
        <div
          style="
            padding: 1rem;
            text-align: center;
            background: #3b4d5e;
            border-radius: 8px;
          "
        >
          <p style="margin: 0">🤖 ChatGLM</p>
        </div>
        <div
          style="
            padding: 1rem;
            text-align: center;
            background: #3b4d5e;
            border-radius: 8px;
          "
        >
          <p style="margin: 0">⚙️ Spring Boot</p>
        </div>
      </div>
    </div>
  </div>

  <div
    style=" margin-top: 1rem; font-size: 0.9em; color: #666;text-align: center"
  >
    系统采用分层架构设计，实现业务逻辑与数据存储解耦
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "Webgl"
});

import canvas1 from "./component/canvas.vue";
</script>
