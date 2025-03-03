import { config } from "../../configs/envConfig";

export const connection = { host: config.REDIS_HOST, port: config.REDIS_PORT };