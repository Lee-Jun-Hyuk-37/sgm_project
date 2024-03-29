env
---

conda env "web_ui"

```console
conda install Flask Flask-SocketIO flask-cors
```

Todo
---

- [x] 언어 선택 박스에 기본값 추가 (언어를 선택해주세요)
- [x] json 파일에 언어 추가
- [x] json 파일 언어 읽어서 선택박스 기본 선택
- [x] json 파일 생성 삭제 구현 -> 삭제는 일단 구현 안함

- [x] lang select 하면 자주 쓰는 스크립트 바로 업데이트 되도록 수정

- [x] 메세지에 시간 출력 포맷 이쁘게 수정
- [x] 새로운 통신 누르면 그 통신으로 이동시키기
- [x] 새로운 통신 후 새로 생긴 json 파일에 language 추가 -> 처음에는 none
- [x] language 가 none 일 때는 메세지 전송 안되고, 언어 선택하라는 메세지 띄우기
- [x] 첫 화면에 그냥 아무것도 안띄우기

- [x] 자주 사용하는 스크립트 구현
- [x] 채팅 길어지면 밀고 올라가게끔
- [x] 언어 선택된 채팅 보다가 새로운 통신 눌었을때, 언어 초기화 안됨
- [x] 채팅 길어져서 밀려있을 때, freq_script 눌렀을 때, 스크롤 내려가긴 하는데, 완전히 안내려가는 문제

- [x] 시연용 IO 제작
- [ ] 문자망 branch 새로 파서 2가지 버전 다 살리고 있기

- [x] 인공지능 IO 연결하기
- [x] 오디오 파일 잘 저장하고 읽는 것 확인
- [x] 수신 중지, 재개 버튼 만들기

- [x] sid 문제 코드 수정
- [x] 시작화면 비우기
- [x] 수신 후에 채팅창 끝까지 내려가기
- [x] 수신도 loading메세지 먼저 띄우기
- [x] 긴 내용 수신하면 터지는 버그 해결
- [ ] 음성 수신은 파이썬 백엔드 단에서 수행하기(?)
- [ ] whisper 언어 강제해주기 -> 옵션 있음.
- [ ] 제목 상시 고정해주기
- [x] 코드 깔끔하게 리펙토링
- [ ] file_list 클릭 되어 있는 것 bold로 표시
- [ ] file_list 검색 및 정렬기능 구현
- [ ] freq_script 추가 삭제 기능 구현