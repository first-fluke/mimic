# MIMIC: 그림자 에이전트 (The Shadow Agent)

<p align="center">
  <strong>🧠 당신의 작업 패턴을 학습하고 스스로 진화하는 AI 에이전트</strong>
</p>

<p align="center">
  <a href="#핵심-기능">핵심 기능</a> •
  <a href="#설치-및-시작하기">설치</a> •
  <a href="#mimic-아키텍처">아키텍처</a> •
  <a href="#주의사항">주의사항</a> •
  <a href="./README.md">English</a>
</p>

---

## 소개

**MIMIC**은 개발자의 터미널과 VS Code 작업 패턴을 그림자처럼 관찰하고, 반복되는 비효율을 찾아 스스로 해결책을 제안하는 **자율 진화형 에이전트**입니다.

단순한 명령어 껍데기가 아닙니다. 당신이 일하는 방식을 이해하고, 
*"이 명령어, 이렇게 줄여쓰는 게 어때요?"* 또는 *"방금 실패한 빌드, 단축키로 만들어드릴까요?"* 라고 먼저 말을 거는 파트너입니다.

---

## 핵심 기능

### 1. 🔍 실시간 관찰 (Live Observation)
- **Zero Config**: 설치 즉시 쉘(Zsh)과 IDE의 모든 활동을 투명하게 관찰합니다.
- **Micro-Second Precision**: 사용자가 쉘 명령어를 입력하는 즉시, UI가 실시간으로 반응합니다.
- **Privacy First & Isolated**: **프로젝트 내부의 `.mimic/` 폴더**에 우선 저장하여 프로젝트별 격리성을 보장합니다. (로컬 저장소가 없을 경우에만 `~/.mimic/` 사용)

### 2. ⚡ 적응형 퀵 액션 (Adaptive Quick Actions)
- **Smart Curation**: 프로젝트별로 자주 쓰이는 명령어(5회 이상 실행)를 자동으로 선별합니다.
- **Instant Access**: 사이드바에 **원클릭 버튼**을 생성하여 빠르게 실행할 수 있습니다.
- **Customizable Control**:
  - **Threshold**: 최소 5번 이상 실행된 명령어만 노출하여 목록을 깔끔하게 유지합니다.
  - **Exclusion**: 휴지통 아이콘을 눌러 개별 삭제하거나, **VS Code 설정(`mimic.ignoredPatterns`)**에 키워드(예: `password`)를 등록하여 자동 제외할 수 있습니다.
  - **Project Aware**: 현재 작업 공간에 맞는 명령어만 똑똑하게 보여줍니다.

### 3. 🧠 자율 통찰 & 스킬 합성 (Insight & Synthesis)
- **AI 분석**: 쌓인 로컬 로그를 바탕으로 Gemini/GPT가 당신의 **작업 습관(Micro-Habits)**을 분석합니다.
- **스킬 진화 (Lifecycle)**:
  1. **Analyze (분석)**: **$(sparkle) Analyze Patterns**를 눌러 습관 리포트를 생성합니다 (`~/.mimic/insights/`).
  2. **Synthesize (합성)**:
     - **$(terminal) Shell Script**: 터미널에서 즉시 쓸 수 있는 단축어/함수(`.sh`)를 자동 생성합니다.
     - **$(hubot) Agent Skill**: 안티그래비티 에이전트가 복잡한 워크플로우를 수행할 수 있도록 고수준 스킬을 생성합니다.
  3. **Share (공유)**: 생성된 스킬을 글로벌(`~/.mimic/skills`) 또는 로컬(`.mimic/skills`)에 저장하여 팀원과 공유하세요.

---

## 🕹️ 사용 방법 (User Interface)

MIMIC은 사이드바와 커맨드 팔레트(`Cmd+Shift+P`)를 통해 제어할 수 있습니다.

| 버튼 / 명령어                    | 동작 설명                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| **$(sparkle) Analyze Patterns**  | **[수동 분석]** 현재까지 쌓인 로그를 즉시 AI에게 보내 패턴을 분석합니다.                      |
| **$(lightbulb) View Insights**   | **[통찰 보기]** AI가 발견한 당신의 작업 습관 리포트 폴더를 엽니다.                            |
| **$(terminal) Synthesize Shell** | **[쉘 합성]** 발견된 통찰을 터미널에서 즉시 쓸 수 있는 단축어(`.sh`)로 만듭니다.              |
| **$(hubot) Synthesize Agent**    | **[에이전트 합성]** 안티그래비티 에이전트가 직접 실행할 수 있는 고수준 스킬을 생성합니다.     |
| **$(play) Run Quick Action**     | **[빠른 실행]** 자주 쓰는 프로젝트 명령어를 즉시 실행합니다.                                  |
| **$(trash) Remove / Ignore**     | **[제외 하기]** 퀵 액션 목록에서 명령어를 제거하거나, 설정에서 특정 키워드를 영구 제외합니다. |
| **$(file-code) Open Skill**      | **[스킬 확인]** 생성된 스킬의 상세 내용을 확인하고 수정합니다.                                |
| **$(tools) Install Skill**       | **[명령어 등록]** `.sh` 스킬을 `.zshrc`에 등록하거나, 에이전트 스킬을 프로젝트에 연결합니다.  |

---

## 설치 및 시작하기

### VSIX 파일로 설치 (권장)
1. `mimic-1.0.0.vsix` 다운로드
2. VS Code / Antigravity 실행
3. `Cmd+Shift+P` > **Extensions: Install from VSIX...** 선택
4. 다운로드한 파일 선택 후 리로드
5. **중요**: 쉘 훅(Hook) 활성화를 위해 **터미널을 재시작**해주세요.

### 소스 빌드
```bash
git clone https://github.com/mimic-agent/mimic.git
cd mimic
npm install
npm run compile
npx vsce package
```

---

## MIMIC 아키텍처 (Structure)

MIMIC은 인간의 인지 과정을 모방한 **인지 아키텍처(Cognitive Architecture)**를 따릅니다.

1. **감각(Perception)**: `ActivityWatcher`가 쉘/에디터 이벤트를 실시간 감지 (`Project-Local .mimic/` 또는 `Global ~/.mimic/`)
2. **기억(Memory)**: `EventLog`에 시계열 데이터 축적
3. **분석(Analysis)**: `InsightService`가 백그라운드에서 패턴 발견 (Debounced)
4. **행동(Action)**: `QuickAction` 및 `SkillSynthesizer`를 통해 최적화된 도구 제공

---

## 주의사항 (Precautions)

### ⚠️ 데이터 프라이버시
MIMIC은 모든 활동 로그를 **로컬(`~/.mimic/`)**에 텍스트 파일로 저장합니다.
- **민감 정보**: 비밀번호나 API Key는 터미널에 직접 입력하지 마세요.
- **제외 설정**: `mimic.ignoredPatterns` 설정을 통해 민감한 키워드가 포함된 명령어는 자동 제외할 수 있습니다.
- **데이터 삭제**: 언제든 `rm -rf ~/.mimic` 명령어로 모든 기억을 지울 수 있습니다.

### ⚠️ AI 모델 사용
- MIMIC은 분석을 위해 LLM(Gemini/OpenAI)을 사용합니다.
- **Antigravity IDE** 사용자: 별도 설정 없이 내장된 Pro 모델을 무료로 사용합니다. (추천)
- **일반 VS Code** 사용자: `mimic.geminiApiKey` 또는 `mimic.openaiApiKey` 설정이 필요할 수 있습니다.

---

## 라이선스

MIT License - 누구나 자유롭게 수정하고 배포할 수 있습니다. [LICENSE](./LICENSE.txt)를 확인하세요.

<p align="center">
  Made with ❤️ by the MIMIC Team
</p>
