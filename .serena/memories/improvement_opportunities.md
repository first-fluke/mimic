# MIMIC 프로젝트 개선 기회 분석

## 🔴 긴급 (Critical)

### 1. 테스트 인프라 부재 (VS Code 확장)
**위치**: `apps/vscode-mimic`
**문제**: `npm test`가 작동하지 않음
**영향**: 코드 변경 시 안정성 검증 불가, 회귀 버그 위험
**해결책**:
- `@vscode/test-electron` + `mocha` 또는 `vitest` 설정
- GitHub Actions CI/CD 연동
- 서비스별 단위 테스트 작성

### 2. 테스트 인프라 부재 (OpenCode 플러그인)
**위치**: `apps/opencode-plugin-mimic/package.json`
**문제**: `@vitest/utils` 누락으로 테스트 실패
**해결책**: `devDependencies`에 `@vitest/utils` 추가

### 3. 성능 병목 - 대용량 파일 처리
**위치**: 
- `AnalystService.ts:515` - `fs.readFileSync(eventsPath, 'utf-8')`
- `InsightService.ts:351` - 전체 파일 읽기
- `QuickActionService.ts:175` - 전체 파일 읽기
- `ObservationLog.ts:201` - `readFile(this.logPath, "utf-8")`

**위험**: events.jsonl/observations.jsonl 크기 증가 시 OOM 및 심각한 지연
**해결책**: 스트리밍 기반 tail 읽기 구현
```typescript
// 개선 전
const content = fs.readFileSync(eventsPath, 'utf-8');

// 개선 후
const stream = fs.createReadStream(eventsPath, { start: fileSize - 10000 });
```

### 4. 블로킹 동기 I/O
**위치**: `git.ts` - 모든 함수가 `execSync` 사용
**문제**: 대형 리포지토리에서 UI 블로킹
**해결책**: `execSync` → `exec` (Promise 기반) 마이그레이션

---

## 🟡 중요 (High Priority)

### 5. 데이터 경로 불일치
**위치**: `AnalystService.ts:507`
**문제**: 글로벌 경로(`~/.mimic/events.jsonl`)만 사용, 워크스페이스 로컬 데이터 무시
**영향**: 워크스페이스 모드에서 잘못된 분석 결과
**해결책**: `extension.ts`의 경로 결정 로직 공유

### 6. 중복 코드
**위치**: 
- `InsightService.ts:372`
- `SynthesisService.ts:139`
**문제**: `listInsights()` 메서드 중복 구현
**해결책**: 유틸리티 함수로 추출

### 7. 쉘 호환성
**위치**: `Installer.ts`
**문제**: Zsh 전용(`.zshrc`), Bash/Fish/Windows 미지원
**해결책**: `process.env.SHELL` 감지 및 다중 쉘 지원

### 8. 파일 감시 불안정성
**위치**: `ActivityWatcher.ts:81`
**문제**: Node.js `fs.watch`는 플랫폼 간 동작 불일치
**해결책**: `vscode.workspace.createFileSystemWatcher` 사용

### 9. Git Diff 무제한
**위치**: `git.ts:54`
**문제**: `getGitDiff`가 크기 제한 없이 전체 diff 반환
**위험**: 대형 리팩토링 시 메모리/LLM 컨텍스트 초과
**해결책**: 최대 크기 제한 추가

---

## 🟢 개선 권장 (Medium Priority)

### 10. TODO 항목 구현 필요
**OpenCode 플러그인**:
- `engine.ts:33` - 도구 로직 구현
- `engine.ts:57` - 커스텀 로직 추가  
- `engine.ts:77` - 자동화 동작 구현

### 11. 하드코딩된 값
- **AuthService.ts:11-12**: `CLIENT_ID`, `CLIENT_SECRET` 하드코딩
- **ActivityWatcher.ts:13**: `_DEFAULT_THRESHOLD = 100`
- **AnalystService.ts**: Google Cloud 엔드포인트 하드코딩

### 12. 에러 처리 개선
- **SidebarProvider.ts:384,397**: `console.error` 대신 사용자 알림
- **ActivityWatcher.ts:129**: 로그 로테이션 에러 무시
- **InsightService.ts:134**: 분석 실패 시 사용자 알림 부재

### 13. UI 새로고침 최적화
**위치**: `extension.ts:103`
**문제**: 5초 간격 `setInterval` 새로고침
**해결책**: 이벤트 기반 새로고침으로 변경

### 14. MCP 설정 덮어쓰기
**위치**: `engine.ts:151`
**문제**: `opencode.json` 파싱/직렬화 시 사용자 주석 및 포맷팅 손실
**해결책**: JSON with Comments 지원 또는 병합 로직 개선

### 15. 타입 안전성
- `AntigravityBridge.ts`의 `any` 타입 사용
- `data: Record<string, unknown>` 대신 구체적 타입 정의

---

## 📋 개선 계획 제안

| 단계 | 작업 | 예상 시간 | 우선순위 |
|------|------|----------|---------|
| Phase 3 | 테스트 인프라 구축 | 2-3일 | 🔴 |
| Phase 4 | 스토리지 고도화 (No Workspace) | 1-2일 | 🔴 |
| Phase 5 | 성능 최적화 (스트리밍 읽기) | 2-3일 | 🔴 |
| Phase 6 | 코드 품질 개선 (중복 제거, 에러 처리) | 2일 | 🟡 |
| Phase 7 | 크로스 플랫폼 지원 (쉘, 파일 감시) | 2-3일 | 🟡 |
| Phase 8 | 보안 강화 (OAuth, 토큰 저장) | 1-2일 | 🟢 |

---

## 💡 추가 개선 아이디어

1. **Global vs Local Skills 동기화**: 프로젝트 A에서 배운 스킬을 프로젝트 B에서 활용
2. **워크스페이스 없음 예외 처리**: 단일 파일 열기 시 `context.globalStorageUri` 활용
3. **로깅 체계화**: `console.log/error` 대신 통합 로거 사용
4. **문서화**: JSDoc 추가 및 API 문서 생성
5. **국제화**: VS Code 확장의 i18n 지원

---

## ⚠️ 보안 고려사항

1. **OAuth 클라이언트 시크릿**: 환경 변수로 이동 권장
2. **이벤트 로그**: 민감한 명령어 필터링 (password, secret 등)
3. **토큰 저장**: VS Code SecretStorage 활용 검토
4. **Git 히스토리**: 민감한 파일 diff 필터링
