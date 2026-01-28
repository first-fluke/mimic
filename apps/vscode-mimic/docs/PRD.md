# Project MIMIC: The "Native & Alive" Agent PRD (Product Requirement Document)

> **Document Status**: Draft
> **Version**: 2.1 (Evolution Engine Added)
> **Author**: Lead Planner (Persona)
> **Date**: 2026-01-23

---

## 1. Executive Summary
**Project MIMIC V2**는 기존 Python 백엔드 기반의 무거운 구조를 탈피하고, **VS Code Native (Client-Only)** 아키텍처로 완전히 새롭게 태어납니다.
Antigravity IDE 및 최신 VS Code의 기능(`vscode.lm`)을 100% 활용하여, **설치 없이(Zero-Setup)**, **즉시 반응(Real-time)**하는 "가장 가벼운 그림자 에이전트"를 목표로 합니다.

### 🛡️ Mission
> *"Be the shadow that learns from your instincts, not a burden that requires management."*
> (당신의 본능을 학습하는 그림자가 되라. 관리해야 할 짐이 되지 마라.)

---

## 2. Market Analysis & Positioning
경쟁 프로젝트 **Homunculus**의 모든 기능을 수용하되, **OpenCode**처럼 편리하게 만듭니다.

| Feature Comparison       | **Homunculus**         | **MIMIC V2 (Native)**                  | **Dominance Logic**                                    |
| :----------------------- | :--------------------- | :------------------------------------- | :----------------------------------------------------- |
| **Real-time Perception** | Shell Hooks (External) | **Shell Hooks + Watcher (Integrated)** | 동일한 즉시성, 더 쉬운 설치                            |
| **Evolution (Learning)** | `instinct.md` 생성     | **Skill Generation**                   | 텍스트(Rule)뿐만 아니라 실행 가능한 코드(Skill)로 진화 |
| **Persona (Agent)**      | Hooks based Identity   | **Native Brain (`vscode.lm`)**         | 에디터 인격을 그대로 계승 (Antigravity Persona)        |
| **Automation**           | Passive Observation    | **Active Automation**                  | 관찰을 넘어 즉시 실행 단계까지 자동화                  |

**Conclusion**: MIMIC V2는 Homunculus의 상위 호환(Superset)입니다. Homunculus의 "Instincts(본능)" 개념을 MIMIC의 "**Skills(기술)**"로 승화시켜, 단순히 '기억'하는 것을 넘어 '수행'할 수 있게 만듭니다.

---

## 3. Core Architecture Principles
1.  **No Python Backend**: 외부 프로세스 관리, 포트 충돌, 무거운 런타임 의존성을 제거합니다. 오직 VS Code Extension(TypeScript)만으로 동작합니다.
2.  **Editor Native Brain**: 자체 LLM 연동 로직 대신 `vscode.lm` API를 사용하여 에디터(Antigravity/Copilot)의 인증된 세션을 빌려 씁니다.
3.  **Shell-Driven Perception**: 훅(Hooks)을 통해 터미널 이벤트를 파일 시스템에 기록하고, 파일 감시자(File Watcher)가 이를 즉시 읽어들입니다.

---

## 4. Feature Specifications (기능 명세)

### 4.1 Phase 1: Intelligence (The Brain) - "Analyst Handoff"
사용자의 행동 패턴을 분석하여 인사이트를 제공하는 기능입니다.

#### [Feature] Triple Hybrid Analysis
어떤 환경에서도 동작하는 3단계 폴백(Fallback) 전략을 사용합니다.
1.  **Level 1: Editor Native (Preferred)**
    - `vscode.lm.selectChatModels({ family: 'gemini' })` (Antigravity Native)
    - `vscode.lm.selectChatModels({ family: 'gpt-4' })`
2.  **Level 2: Custom Key** (`mimic.openaiApiKey`)
3.  **Level 3: Manual Handoff** (Clipboard)

#### [Prompt Strategy]
- **Context Injection**:
    - `Recent Patterns`: 최근 감지된 반복 행동.
    - `Existing Skills`: 현재 보유 중인 스킬 목록.
- **Output Format**:
    - **Instincts**: 습관화해야 할 규칙 제안.
    - **New Skills**: 즉시 사용 가능한 자동화 스킬 아이디어.

### 4.2 Phase 2: Perception (The Senses) - "Real-time Hooks"
MIMIC이 터미널 명령어를 입력하는 순간 즉시 반응하도록 만듭니다.

#### [Component] Shell Hook Generator
- **Script**: `resources/hooks/mimic-zsh.sh`
- **IPC**: `~/.mimic/events.jsonl` 파일에 JSON 라인 추가 (즉시 기록).

#### [Component] Event Watcher (TypeScript)
- `vscode.workspace.createFileSystemWatcher` 사용.
- **Real-time Reaction**: `events.jsonl` 변경 즉시, 에러나 패턴을 감지하여 `vscode.lm`에 "가벼운 질문"을 던짐.

---

## 5. Phase 3: The Evolution Engine (New)
Homunculus의 'Evolution' 핵심 가치를 구현합니다.

### [Concept] From Instinct to Skill
- **Step 1 (Instinct)**: 사용자의 반복 행동을 '본능(Instinct)' 텍스트로 기록. (Homunculus와 동일)
- **Step 2 (Skill)**: 본능이 3회 이상 강화되면, 실행 가능한 **'Skill(자동화 스크립트)'**로 진화(Evolve) 제안.
- **Workflow**:
  1. 감지: `npm run test` 5번 실패.
  2. 본능 형성: "테스트 실패 시에는 로그의 마지막 10줄을 분석해야 한다."
  3. 진화 제안: "이 본능을 **'Auto Log Analyzer' 스킬**로 만들까요?"

---

## 6. Roadmap & Milestones

### Milestone 1: Foundation (Current)
- [ ] 신규 프로젝트 구조(`mimic-v2`) 셋업.
- [ ] TypeScript 전용 Extension 베이스라인 구축.

### Milestone 2: Intelligence (Phase 1)
- [ ] `vscode.lm` 연동 프로토타입.
- [ ] Triple Hybrid 로직 구현.

### Milestone 3: Perception (Phase 2)
- [ ] Shell Hook 스크립트 작성 및 테스트.
- [ ] File Watcher 구현.

### Milestone 4: Evolution (Phase 3)
- [ ] Instinct DB설계 (JSON).
- [ ] Skill Generation 파이프라인.

---

## 7. Open Questions & Risks
- **Q**: `vscode.lm` API가 모든 VS Code 배포판(Cursor 등)에서 동일하게 동작하는가?
    - **A**: 표준 API이므로 지원하지만, 모델 가용성(`family`)은 다를 수 있음. 방어적 코딩 필요.
