import neo4j, {} from "neo4j-driver";
import { config } from "./index.js";
let driver = null;
export function getNeo4jDriver() {
    if (!driver) {
        driver = neo4j.driver(config.NEO4J_URI, neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD));
    }
    return driver;
}
export async function closeNeo4j() {
    if (driver) {
        await driver.close();
        driver = null;
    }
}
//# sourceMappingURL=neo4j.js.map