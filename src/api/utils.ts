/* 发起的请求的名称是url的最后一个节点，如url为/resource/layer/tree,请求名称为tree */
export const baseUrlApi = (url: string) => `${url}`;

export const qgj206UrlApi = (url: string) => `/qgj206${url}`;

export const qgj208UrlApi = (url: string) => `/qgj208${url}`;

export const qgj207UrlApi = (url: string) => `/qgj207${url}`;
