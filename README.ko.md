# MIMIC 모노레포

<p align="center">
  <strong>🧠 당신의 작업 패턴을 학습하고 스스로 진화하는 AI 에이전트</strong>
</p>

<p align="center">
  <a href="#패키지">패키지</a> •
  <a href="#아키텍처">아키텍처</a> •
  <a href="#개발">개발</a> •
  <a href="#릴리즈-관리">릴리즈</a> •
  <a href="./README.md">English</a>
</p>

---

## 소개

**MIMIC**은 개발자의 터미널과 IDE 작업 패턴을 그림자처럼 관찰하고, 반복되는 비효율을 찾아 스스로 해결책을 제안하는 **자율 진화형 에이전트**입니다.

이 모노레포에는 MIMIC 에이전트의 두 가지 구현체가 포함되어 있습니다:
- **VS Code 확장 프로그램**: 실시간 쉘 관찰을 통한 심층 IDE 통합
- **OpenCode 플러그인**: 도구 사용 패턴으로부터 학습하는 AI 에이전트 플러그인

---

## 패키지

| 패키지 | 버전 | 설명 |
|---------|------|------|
| [vscode-mimic](./apps/vscode-mimic) | [![VS Code Version](https://img.shields.io/badge/v1.0.0-blue)](./apps/vscode-mimic) | 실시간 쉘 관찰이 가능한 VS Code 확장 프로그램 |
| [opencode-plugin-mimic](./apps/opencode-plugin-mimic) | [![npm version](https://img.shields.io/npm/v/opencode-plugin-mimic)](https://www.npmjs.com/package/opencode-plugin-mimic) | 도구 사용 패턴으로부터 학습하는 OpenCode 플러그인 |

### apps/vscode-mimic

실시간 쉘 관찰을 통해 워크플로우를 학습하는 VS Code 확장 프로그램입니다.

**주요 기능:**
- **실시간 관찰**: 쉘 훅을 통한 Zsh 터미널 활동의 실시간 모니터링
- **적응형 퀵 액션**: 자주 사용하는 명령어(5회 이상 실행)를 위한 원클릭 버튼
- **자율 통찰 및 합성**: Gemini/GPT 기반 AI 분석으로 쉘 별칭과 에이전트 스킬 생성
- **프라이버시 우선**: 데이터를 `.mimic/`(프로젝트) 또는 `~/.mimic/`(글로벌)에 로컬 저장

[자세히 보기 →](./apps/vscode-mimic/README.ko.md)

### apps/opencode-plugin-mimic

사용자의 패턴을 학습하고 워크플로우에 적응하는 OpenCode 플러그인입니다.

**주요 기능:**
- **패턴 감지**: 반복되는 도구 사용, 파일 편집, git 패턴 자동 감지
- **본능 학습**: 프로젝트 히스토리로부터 행동 "본능"(휴리스틱) 학습
- **아이덴티티 진화**: 학습할수록 자체적인 성격과 통계를 개발
- **세션 기억**: 세션 간 관찰 사항과 마일스톤 보존
- **스킬 생성**: 프로젝트 컨텍스트를 기반으로 선언적 스킬 자동 생성

[자세히 보기 →](./apps/opencode-plugin-mimic/README.ko.md)

---

## 아키텍처

두 구현체 모두 인간의 인지 과정을 모방한 **인지 아키텍처(Cognitive Architecture)**를 따릅니다:

```
┌─────────────────────────────────────────────────────────────┐
│                    MIMIC 아키텍처                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │    감각      │───▶│    기억      │───▶│    분석      │  │
│  │  (관찰)      │    │   (저장)     │    │  (패턴)      │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│         ▲                                        │         │
│         │                                        ▼         │
│         │                               ┌──────────────┐  │
│         └───────────────────────────────│    행동      │  │
│                                         │  (제안)      │  │
│                                         └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. **감각(Perception)**: 사용자 활동 관찰 (쉘 명령어, 도구 호출, 파일 편집)
2. **기억(Memory)**: 시계열 데이터를 로컬에 저장 (JSONL 형식)
3. **분석(Analysis)**: AI/ML 또는 규칙 기반 시스템으로 패턴 발견
4. **행동(Action)**: 최적화 제안 (별칭, 단축키, 스킬)

---

## 개발

### 필수 조건

- [Bun](https://bun.sh/)
- Node.js 24+

### 설정

```bash
# 저장소 클론
git clone https://github.com/mimic-agent/mimic.git
cd mimic

# 루트 의존성 설치
npm install
```

### VS Code 확장 프로그램

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

---

## 릴리즈 관리

이 저장소는 자동화된 버전 관리와 릴리즈를 위해 [Release Please](https://github.com/googleapis/release-please)를 사용합니다.

### Conventional Commits

버전 증가를 트리거하려면 Conventional Commit 메시지 형식을 사용하세요:

| 커밋 타입 | 버전 증가 | 예시 |
|-----------|----------|------|
| `feat:` | 마이너 | `feat: add new pattern detector` |
| `fix:` | 패치 | `fix: resolve memory leak in watcher` |
| `feat!:` 또는 `BREAKING CHANGE:` | 메이저 | `feat!: redesign API surface` |

### 패키지 태그

- VS Code 확장: `vscode-mimic@v{version}`
- OpenCode 플러그인: `opencode-plugin-mimic@v{version}`

---

## 라이선스

MIT License

---

## 스폰서

이 프로젝트가 도움이 되었다면, 커피 한 잔을 후원해 주세요!

<a href="https://www.buymeacoffee.com/firstfluke" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

또는 스타를 남겨주세요:

```bash
gh api --method PUT /user/starred/first-fluke/mimic
```
