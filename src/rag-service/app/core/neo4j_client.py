import logging
from neo4j import AsyncGraphDatabase
from app.config import settings

logger = logging.getLogger(__name__)


class Neo4jClient:
    def __init__(self):
        self.driver = None

    async def connect(self):
        self.driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            max_connection_lifetime=3600,
            max_connection_pool_size=10,
            connection_acquisition_timeout=30,
        )
        await self.verify()
        logger.info("Connected to Neo4j at %s", settings.NEO4J_URI)

    async def close(self):
        if self.driver:
            await self.driver.close()
            self.driver = None
            logger.info("Neo4j connection closed")

    async def verify(self) -> bool:
        if not self.driver:
            return False
        try:
            async with self.driver.session() as session:
                await session.run("RETURN 1")
            return True
        except Exception:
            return False

    async def run_query(self, cypher: str, params: dict | None = None) -> list[dict]:
        if not self.driver:
            logger.warning("Neo4j driver not connected")
            raise ConnectionError("Neo4j driver is not connected")
        async with self.driver.session() as session:
            result = await session.run(cypher, params or {})
            records = await result.fetch()
            return [record.data() for record in records]

    async def get_node_counts(self) -> list[dict]:
        return await self.run_query(
            "MATCH (n) RETURN labels(n) AS labels, count(n) AS count ORDER BY labels(n)[0]"
        )

    async def get_graph_stats(self) -> dict:
        result = await self.run_query(
            "MATCH (n) RETURN count(n) AS node_count "
            "UNION ALL "
            "MATCH ()-[r]->() RETURN count(r) AS node_count"
        )
        if len(result) >= 2:
            return {"node_count": result[0]["node_count"], "relationship_count": result[1]["node_count"]}
        return {"node_count": 0, "relationship_count": 0}


neo4j_client = Neo4jClient()
