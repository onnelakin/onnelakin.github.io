# OnnelLab App Screenshot Workflow

이 저장소는 OnnelLab 메인 홈과 앱 상세 랜딩페이지 저장소이다.

- 원격: `https://github.com/onnellab/onnellab.github.io.git`
- 로컬 작업 경로: `/tmp/onnellab.github.io`

## 고정 규칙

- 앱 저장소에서 홍보 이미지 편집본을 새로 만들면 이 저장소의 앱 상세 랜딩페이지 스크린샷도 같은 최신 편집본으로 교체한다.
- 앱별 편집본은 각 앱 저장소의 `tool/{app}_store_promo_template.py` 템플릿으로 만든다.
- 템플릿은 Melivra 템플릿 형식을 기준으로 한다.
- 오른쪽 상단 장식은 ONNELLAB favicon 기반 OL 마크를 사용한다.
- 사이트 favicon도 ONNELLAB OL 마크 형태를 유지하며, 소프트피치/라일락/베이비블루 파스텔 포인트 컬러 계열로 관리한다.
- 스크린샷 교체 후 `npm run build`로 상세 페이지와 이미지 라우트 생성을 확인한다.

## 앱별 연결

| 앱 | 앱 저장소 | 랜딩 slug | 랜딩 스크린샷 경로 |
| --- | --- | --- | --- |
| Aligna | `/mnt/c/dev/projects/aligna` | `aligna` | `src/content/apps/aligna/assets/screenshots/{en,ko}` |
| ClipNest | `/mnt/c/dev/projects/clipnest` | `clipnest` | `src/content/apps/clipnest/assets/screenshots/{en,ko}` |
| Melivra | `/home/lue/dev/melivra` | `melivra` | `src/content/apps/melivra/assets/screenshots/{en,ko}` |
| Quivra | `/mnt/c/dev/projects/quivra` | `quivra` | `src/content/apps/quivra/assets/screenshots/{en,ko}` |
| Segra | `/mnt/c/dev/projects/segra` | `segra` | `src/content/apps/segra/assets/screenshots/{en,ko}` |
| TagWeaver | `/mnt/c/dev/projects/tagweaver2` | `tagweaver` | `src/content/apps/tagweaver/assets/screenshots/{en,ko}` |
| VaultXT | `/home/lue/dev/onnellab-text/vaultxt` | `vaultxt` | `src/content/apps/vaultxt/assets/screenshots/{en,ko}` |

## OnnelLab Text 메모

OnnelLab Text 저장소는 `/home/lue/dev/onnellab-text` 이다.

하위 앱:

- `flomo`
- `heara`
- `nunote`
- `textoria`
- `vaultxt`

현재 이 랜딩페이지 저장소에 연결된 OnnelLab Text 앱은 `vaultxt`이다. 다른 OnnelLab Text 앱을 노출하려면 먼저 랜딩 slug, 앱 상세 콘텐츠, 원본 스크린샷 자산을 확정한다.

## 교체 절차

1. 앱 저장소에서 최신 편집본을 생성한다.
2. 편집본을 이 저장소의 `src/content/apps/{slug}/assets/screenshots/{en,ko}`로 복사한다.
3. `npm run build`를 실행한다.
4. 앱 저장소와 이 저장소를 각각 커밋/푸시한다.
