# MIMIC 프로젝트 개요

## 프로젝트 목적
MIMIC은 개발자의 워크플로우를 학습하고 패턴을 분석하여 자동화 제안을 제공하는 AI 에이전트입니다.

## 모노레포 구조
```
mimic/
├── apps/
│   ├── vscode-mimic/          # VS Code 확장 프로그램
│   └── opencode-plugin-mimic/ # OpenCode 플러그인
├── package.json               # 워크스페이스 설정 (Biome 사용)
└── README.md
```

## 기술 스택

### 공통
- **언어**: TypeScript
- **빌드**: tsup
- **테스트**: Vitest
- **패키지 매니저**: Bun
- **런타임**: Node.js 24+

### VS Code 확장 (apps/vscode-mimic)
- **린터**: Biome
- **런타임**: VS Code Extension Host

### OpenCode 플러그인 (apps/opencode-plugin-mimic)
- **테스트**: Vitest + Coverage
- **의존성**: @opencode-ai/plugin, @opencode-ai/sdk

## 핵심 아키텍처 (Cognitive Architecture)

### 1. Perception (감지)
- `ActivityWatcher`: 파일 시스템 감시를 통한 실시간 쉘 이벤트 감지
- `events.jsonl`: 타임스리즈 로그 저장

### 2. Memory (기억)
- 프로젝트 로컬 스토리지: `<root>/.mimic/`
- 글로벌 스토리지: `~/.mimic/`

### 3. Analysis (분석)
- `InsightService`: 백그라운드 임계값 기반 분석
- `AnalystService`: 6단계 하이브리드 폭백 (vscode.lm → Antigravity Bridge → Cloud API → Google Token → Custom API Key → Clipboard)

### 4. Action (실행)
- `SynthesisService`: 인사이트를 실행 가능한 스크립트/스킬로 변환
- `QuickActionService`: 빈번한 명령어 원클릭 실행

## 주요 서비스

### VS Code 확장
| 서비스 | 설명 |
|--------|------|
| ActivityWatcher | 쉘 이벤트 실시간 감시 |
| InsightService | 패턴 분석 및 인사이트 생성 |
| AnalystService | 하이브리드 LLM 분석 엔진 |
| SynthesisService | 스킬/스크립트 합성 |
| QuickActionService | 빈번한 명령어 관리 |
| AntigravityBridge | Antigravity IDE 로컬 RPC 연결 |
| AntigravityOAuth | Antigravity Cloud API 인증 |
| AuthService | Google OAuth 인증 |
| Installer | 쉘 훅 자동 설치 |
| SidebarProvider | 사이드바 UI 관리 |
| SettingsPanel | 설정 패널 |

### OpenCode 플러그인
| 모듈 | 설명 |
|------|------|
| StateManager | 상태 관리 및 persistence |
| ObservationLog | 관찰 로그 기록 |
| Pattern Detection | 패턴 자동 감지 |
| Evolution Engine | 능력 진화 시스템 |
| Instinct System | 학습된 본능 관리 |
| Skill Generator | 스킬 자동 생성 |

## 개발 명령어

### VS Code 확장
```bash
cd apps/vscode-mimic
bun install
bun run compile
bun test
```

### OpenCode 플러그인
```bash
cd apps/opencode-plugin-mimic
bun install
bun run build
bun run test
bun run typecheck
```

## 릴리즈 관리
- **도구**: Release Please
- **커밋 컨벤션**: Conventional Commits
  - `feat:` - 마이너 버전 증가
  - `fix:` - 패치 버전 증가
  - `feat!:` 또는 `BREAKING CHANGE:` - 메이저 버전 증가

## 태그 형식
- VS Code Extension: `vscode-mimic@v1.0.0`
- OpenCode Plugin: `opencode-plugin-mimic@v0.1.11`
