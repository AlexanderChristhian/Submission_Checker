import pino from "pino";
import { config } from "../config/index.js";
const options = config.NODE_ENV !== "production"
    ? { level: "debug", transport: { target: "pino-pretty" } }
    : { level: "info" };
export const logger = pino(options);
//# sourceMappingURL=logger.js.map