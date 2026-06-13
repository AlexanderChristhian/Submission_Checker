def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    # Health can be "ok" or "degraded" depending on Neo4j connectivity
    assert response.json()["status"] in ("ok", "degraded")
