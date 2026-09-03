#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "사용법: bash deploy/aws/configure-and-start.sh <Elastic-IP>.sslip.io"
  exit 1
fi

APP_DOMAIN_VALUE="$1"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/deploy/aws/.env.production"

if docker info >/dev/null 2>&1; then
  DOCKER_COMMAND=(docker)
elif command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
  echo "현재 사용자의 Docker 그룹 권한이 없어 sudo로 배포합니다."
  DOCKER_COMMAND=(sudo docker)
else
  echo "Docker 데몬에 연결할 수 없습니다. Docker 실행 상태와 사용자 권한을 확인하세요."
  exit 1
fi

read -rsp "Gemini API 키: " LLM_API_KEY_VALUE
echo

umask 077
cat > "$ENV_FILE" <<EOF
APP_DOMAIN=$APP_DOMAIN_VALUE
MYSQL_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')

ADMIN_SEED_ENABLED=false
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_DISPLAY_NAME=관리자

LLM_ENABLED=true
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_API_KEY=$LLM_API_KEY_VALUE
LLM_MODEL=gemini-2.5-flash
EOF
unset LLM_API_KEY_VALUE
chmod 600 "$ENV_FILE"

cd "$PROJECT_ROOT"
"${DOCKER_COMMAND[@]}" compose --env-file "$ENV_FILE" -f deploy/aws/compose.prod.yml up -d --build
"${DOCKER_COMMAND[@]}" compose --env-file "$ENV_FILE" -f deploy/aws/compose.prod.yml ps

echo
echo "배포를 시작했습니다. RAG 모델 초기화에는 몇 분 걸릴 수 있습니다."
echo "주소: https://$APP_DOMAIN_VALUE"
