## Run with Loki and Grafana

This project includes a local logging stack:

- Loki stores logs.
- Grafana provides the UI at http://localhost:3000.
- Grafana Alloy collects Docker container logs and forwards them to Loki.

Start everything:

```powershell
docker compose up -d
```

Open Grafana at http://localhost:3000 and sign in with the values from `.env`:

- user: `GRAFANA_ADMIN_USER` or `admin`
- password: `GRAFANA_ADMIN_PASSWORD` or `admin`

The Loki datasource is provisioned automatically. In Grafana Explore, use queries like:

```logql
{service="api"}
{service="frontend"}
{service="db"}
```

Alloy's debug UI is available at http://localhost:12345, and Loki is exposed at http://localhost:3100.
