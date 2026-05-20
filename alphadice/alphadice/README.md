# 알파다이스 아레나 (AlphaDice Arena)

다이스를 굴려 영어 단어를 만들고 적을 쓰러뜨리는 턴제 RPG 교육 게임. 외부 배포용 React + Vite + R3F.

> **설계 철학**: "학습을 위한 게임"이 아니라 "게임을 하며 간접 학습".
> 재미가 최우선 — 영어 학습은 자연스럽게 따라오는 부수 효과.

## 게임플레이

1. **캐릭터 선택**: 기사(보통) / 도적(중) / 마법사(어려움)
2. **다이스 굴림**: 7개 알파벳 다이스 (Yahtzee 스타일, 클래스별 다른 풀)
3. **단어 만들기**: 다이스 클릭으로 3-7글자 영단어 조립
4. **공격**: 단어 길이별 데미지 — 3글자 6, 4글자 10, 5글자 16, 6글자 25, 7글자 40
5. **희귀 글자 보너스**: J(+3), Q(+5), X(+5), Z(+4), K(+2), V(+2)
6. **클래스 스킬**:
   - 기사 「재정비」: 리롤 2회, HP 40, 한손검+방패 — Knight 모델
   - 도적 「이중 베기」: 모든 공격이 2회 분할, 1차 처치 시 2차는 다음 적에게, HP 28, 양손 단검 — Rogue 모델
   - 마법사 「변환」: 다이스 1개를 원하는 글자로 변경, HP 30, 지팡이 — Mage 모델

## 기술 스택

- **React 18 + Vite 5** — 빠른 개발 + dist 정적 배포
- **React Three Fiber + drei** — 3D 씬
- **Zustand** — 게임 상태 관리
- **glTF/glb 통일** — 모든 캐릭터/애니메이션 glb (FBX 대비 ~3배 작음)
- **KayKit Character Animations 1.1** — Rig_Medium 애니메이션 라이브러리
- **SkeletonUtils.clone** — 인스턴스별 독립 스켈레톤 (멀티 적 지원)
- **임베디드 영어 사전** — 3rd grade ~900 단어, 오프라인 즉시 검증

## 애니메이션 시스템

`useCharacterRig` 훅이 모든 KayKit Rig_Medium 라이브러리를 한 번 로드하고, `api.play(clip, { loop, fade, returnTo })`로 크로스페이드 재생.

| 상태 | 클립 |
|------|------|
| Idle | `Idle_A` |
| 기사 공격 | `Melee_1H_Attack_Chop` |
| 기사 필살기 | `Melee_2H_Attack_Spin` |
| 도적 공격 | `Melee_Dualwield_Attack_Stab` |
| 도적 필살기 | `Melee_Dualwield_Attack_Slice` |
| 마법사 공격 | `Ranged_Magic_Shoot` |
| 마법사 필살기 | `Ranged_Magic_Spellcasting` |
| 피격 | `Hit_A` |
| 해골 idle | `Skeletons_Idle` |
| 해골 사망 | `Skeletons_Death` |

## 개발 / 배포

```bash
npm install
npm run dev      # HMR 개발 서버
npm run build    # dist/ 생성
npm run preview  # 빌드 미리보기
```

배포 (madeforanyone.com):
```bash
git init && git add . && git commit -m "Initial"
git remote add origin <REPO_URL>
git push -u origin main
# → Cloudflare 자동 배포
```

## 프로젝트 구조

```
src/
├── data/{characters,enemies,dictionary}.js
├── store/gameStore.js              # Zustand
├── utils/dice.js                   # 굴림 + 데미지
├── hooks/useCharacterRig.js        # glb + 애니메이션 통합
└── components/
    ├── ui/                         # 2D UI (8개)
    └── scene/                      # R3F 3D (4개)

public/models/
├── characters/                     # glb + texture .png
└── animations/                     # KayKit Rig_Medium *.glb
```

## FBX → glTF 마이그레이션

이 프로젝트는 초기 FBX 기반이었으나 glb로 전체 전환:

- **3배 작은 파일** — `Rig_Medium_CombatMelee` FBX 3.3MB → glb 1.0MB
- **R3F 표준** — `useGLTF` + `useAnimations`가 더 단순
- **파싱 속도** — GLTFLoader가 FBXLoader보다 훨씬 빠름
- **DRACO 압축** 추후 적용 가능

## 다음 단계

- [ ] 던전 진행 시스템 (현재 1개 인카운터)
- [ ] 추가 클래스 (Barbarian/Druid/Engineer/Rogue glb 활용 준비됨)
- [ ] 적 AI 다양화 (warrior=강타, rogue=회피, mage=원거리)
- [ ] @react-three/rapier 물리 다이스 (3D 다이스 굴림)
- [ ] 사운드 (다이스/공격/BGM)
- [ ] 등장 애니메이션 (`Skeletons_Awaken_Standing` 활용)

## 학습 설계 노트

- **알파벳 풀 제한 > 길이 제한**: 단어 풀은 다이스 풀로 조정
- **모음 보장**: 각 캐릭터 최소 2개 모음 다이스
- **희귀 글자 보너스**: J/Q/X/Z 사용 동기 부여
- **클래스 = 난이도 분기**: 영어 수준에 맞게 선택

## 크레딧

- 캐릭터 & 애니메이션: [KayKit by Kay Lousberg](https://kaylousberg.com/)
