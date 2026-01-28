# MIMIC v2 프로젝트 개선 계획 (Revised)

**작성일**: 2026-01-27
**상태**: Phase 1, 2 완료 / Phase 3, 4 예정

---

## 1. 개요 (Executive Summary)
MIMIC v2는 "실시간 인식"과 "스킬 합성"의 핵심 가치를 전달하지만, 장기 사용 시 **확장성/안정성** 문제와 **지식 파편화** 우려가 있습니다. 본 계획은 이를 해결하고 기업급(Enterprise-grade) 품질로 도약하기 위한 로드맵입니다.

---

## 2. 완료된 개선 사항 (Phase 1 & 2 - Done ✅)
*   **성능 최적화**: 대용량 로그 스트리밍 처리 (`ActivityWatcher`), 비동기 I/O 전면 도입.
*   **UX 강화**: 상태 표시줄(`Status Bar`) 추가, 학습 상태 시각화.
*   **스토리지 격리**: 홈 디렉토리(`~/.mimic`) 오염 방지를 위해 VS Code 내부 스토리지(`WorkspaceStorage`)로 데이터 이동.

---

## 3. 추가 개선 계획 (Phase 3 & 4)

### 🔴 Phase 3: 테스트 인프라 구축 (긴급)
현재 코드는 안전해졌으나, 이를 검증할 **자동화 테스트**가 누락되어 있습니다. `npm test`가 작동하지 않습니다.

- [ ] **Test Runner 설치**: `mocha`, `@vscode/test-electron` 등 필수 패키지 설치.
- [ ] **테스트 스크립트 작성**: `package.json`에 `test` 명령어 추가.
- [ ] **CI/CD 준비**: 향후 GitHub Action 연동을 위한 기반 마련.

### 🟡 Phase 4: 스토리지 고도화 (User Feedback)

#### 1. "워크스페이스 없음(No Workspace)" 예외 처리
*   **문제**: 폴더 없이 파일 하나만 열었을 때(`Code myscript.py`), 저장소가 `os.tmpdir()`(임시 폴더)로 지정되어 재부팅 시 학습 내용이 날아감.
*   **해결책**:
    *   **Global Storage 활용**: 워크스페이스가 없을 경우, VS Code가 제공하는 `context.globalStorageUri`에 영구 저장하도록 로직 변경.
    *   *결과*: 파일 하나만 열고 작업해도 MIMIC이 배운 내용을 잊어버리지 않음.

#### 2. 지식 파편화 방지 (Global vs Local Skills)
*   **문제**: 프로젝트 A에서 배운 유용한 `git` 단축키를 프로젝트 B에서는 모름 (학습 데이터가 격리됨).
*   **해결책: 이원화된 스킬 관리**
    *   **학습(Learning)**: 프로젝트별 격리 유지 (보안/컨텍스트 보호).
    *   **합성(Synthesis)**: 스킬 생성 시 **[전역 저장]** 옵션 제공.
        *   `Save to Project (.agent/skills)`: 팀원과 공유할 프로젝트 전용 스킬.
        *   `Save to Global (~/.mimic/global_skills)`: 모든 프로젝트에서 쓸 내 전용 스킬.
    *   **구현**: `synthesize` 명령 실행 후 저장 위치를 묻는 `QuickPick` 메뉴 추가.

---

## 4. 실행 순서
1.  **Phase 3 (테스트)**: 지금 즉시 수행하여 `npm test`를 살려냄.
2.  **Phase 4 (스토리지)**: `No Workspace` 대응 코드 추가 및 `Global Save` 옵션 구현.
