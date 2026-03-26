# Deployment Diagram - System Platform

## Pham vi
So do trien khai dev/prod muc tong quan.

## Mermaid
```mermaid
flowchart TB
  U[Users Browser]
  NGINX[Client Nginx]
  API[NestJS Container]
  PG[(PostgreSQL Container)]
  VOL[/uploads volume/]

  U --> NGINX
  NGINX --> API
  API --> PG
  API --> VOL
```

## Nguon ma lien quan
- docker-compose.yml
- docker-compose.prod.yml
- client/nginx.conf
- server/Dockerfile
