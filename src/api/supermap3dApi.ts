import { http } from "@/utils/http";
import { qgj207UrlApi } from "./utils";

/* 要有token否则会被拦截 */
export function getLayertree() {
  return http.request("get", qgj207UrlApi("/resource/layer/tree"));
}
