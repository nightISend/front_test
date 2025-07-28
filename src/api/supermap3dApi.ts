import { http } from "@/utils/http";
import { qtjUrlApi } from "./utils";

/* 要有token否则会被拦截 */
export function getLayertree() {
  return http.request("get", qtjUrlApi("/resource/layer/tree"));
}
