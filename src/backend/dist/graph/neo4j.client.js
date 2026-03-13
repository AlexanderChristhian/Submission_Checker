import { getNeo4jDriver } from "../config/neo4j.js";
export async function runQuery(cypher, params = {}) {
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
        return await session.run(cypher, params);
    }
    finally {
        await session.close();
    }
}
//# sourceMappingURL=neo4j.client.js.map