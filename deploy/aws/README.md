# AWS 배포

FINDEPENDENCE MVP를 한 대의 EC2에서 실행하는 구성입니다. 외부에는 HTTPS 443만 서비스하며 Spring Boot, RAG, Chroma, MySQL은 Docker 내부 네트워크에서만 통신합니다.

기본 인스턴스는 RAG 실행 메모리를 고려한 `m7i-flex.large`이며 30GB 암호화 디스크를 사용합니다. 무료 플랜에서도 사용량은 크레딧에서 차감되므로 시연하지 않는 기간에는 인스턴스를 중지합니다.

## 1. AWS 계정 보호

1. 루트 계정에 MFA를 등록합니다.
2. 루트 액세스 키는 만들지 않습니다.
3. IAM에서 `findependence-deployer` 사용자를 만들고 MFA를 등록합니다.
4. 처음 인프라를 만드는 동안만 `AdministratorAccess` 정책을 연결합니다.
5. 해당 사용자의 CLI 액세스 키를 한 번만 발급해 로컬 AWS CLI에 등록합니다.
6. 루트 계정에서 로그아웃합니다.

## 2. AWS CLI 로그인

AWS CLI v2 최신 버전을 설치한 뒤 PowerShell에서 실행합니다.

```powershell
aws configure --profile findependence
aws sts get-caller-identity --profile findependence
```

기본 리전은 `ap-northeast-2`, 출력 형식은 `json`을 사용합니다. 액세스 키와 비밀 키는 Git, 메신저, 문서에 기록하지 않습니다.

## 3. 인프라 생성

저장소 루트에서 실행합니다.

```powershell
aws cloudformation deploy `
  --profile findependence `
  --region ap-northeast-2 `
  --stack-name findependence-mvp `
  --template-file deploy/aws/infrastructure.yml `
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation describe-stacks `
  --profile findependence `
  --region ap-northeast-2 `
  --stack-name findependence-mvp `
  --query "Stacks[0].Outputs" `
  --output table
```

출력의 `SuggestedDomain`, `InstanceId`를 기록합니다.

## 4. 서버에 비밀값 만들고 서비스 시작

AWS 콘솔에서 EC2 → 인스턴스 → `findependence-mvp` → 연결 → Session Manager로 접속합니다. SSH 포트와 키 파일은 필요하지 않습니다.

```bash
sudo -iu ubuntu
cd /opt/findependence/app
bash deploy/aws/configure-and-start.sh <SuggestedDomain 값>
```

Gemini API 키는 이 과정에서 화면에 표시되지 않게 입력됩니다. MySQL 비밀번호와 JWT 키는 서버에서 무작위 생성되며 `deploy/aws/.env.production`에 권한 `600`으로 저장됩니다. 이 파일은 Git에서 제외됩니다.

RAG 이미지가 모델을 내려받고 빌드하므로 첫 배포는 시간이 걸릴 수 있습니다.

```bash
docker compose --env-file deploy/aws/.env.production -f deploy/aws/compose.prod.yml ps
docker compose --env-file deploy/aws/.env.production -f deploy/aws/compose.prod.yml logs --tail=100
```

모든 서비스가 실행되면 `https://<SuggestedDomain>`으로 접속합니다.

## 업데이트 배포

```bash
sudo -iu ubuntu
cd /opt/findependence/app
git pull --ff-only origin main
docker compose --env-file deploy/aws/.env.production -f deploy/aws/compose.prod.yml up -d --build
```

## 비용 중지

테스트를 오래 쉬면 EC2를 중지합니다. Elastic IP와 EBS에는 중지 중에도 비용이 발생할 수 있습니다. 완전히 정리할 때는 먼저 필요한 DB를 백업한 뒤 CloudFormation 스택을 삭제합니다.
