(function(){
    // 이미 오버레이가 존재하면 중복 실행 방지
    if(document.getElementById("codegeniusOverlay")) return;

    // codegeniusEntrance 호출을 찾고, 인자들을 추출하는 함수
    // <button> 또는 <a> 태그에서 onclick 속성 내 codegeniusEntrance(...)를 탐색
    function findCodeGeniusButtons() {
      const buttons = document.querySelectorAll("button[onclick*='codegeniusEntrance'], a[onclick*='codegeniusEntrance']");
      const results = [];
      const regex = /codegeniusEntrance\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/;
      buttons.forEach((button) => {
        const onclickStr = button.getAttribute("onclick");
        const match = regex.exec(onclickStr);
        if(match) {
          results.push({
            cntsTypeCd: match[1],
            sbjCd: match[2],
            unitCd: match[3],
            meetingId: match[4]
          });
        }
      });
      return results;
    }

    // 오버레이 패널을 생성하는 함수
    function createOverlay(results) {
      const overlay = document.createElement("div");
      overlay.id = "codegeniusOverlay";
      // 오버레이 기본 스타일 – 우측 하단 고정, 스크롤 가능, 반투명 배경
      Object.assign(overlay.style, {
        position: "fixed",
        bottom: "0",
        right: "0",
        width: "300px",
        maxHeight: "400px",
        overflowY: "auto",
        backgroundColor: "rgba(255,255,255,0.95)",
        border: "1px solid #ccc",
        zIndex: "10000",
        padding: "10px",
        fontSize: "12px",
        boxShadow: "0 0 8px rgba(0,0,0,0.3)"
      });
      overlay.innerHTML = "<h3 style='margin:0 0 10px 0;'>CodeGenius 파라미터</h3>";

      // 새로고침 버튼
      const refreshBtn = document.createElement("button");
      refreshBtn.textContent = "새로고침";
      refreshBtn.style.marginBottom = "10px";
      refreshBtn.onclick = () => {
        updateOverlay();
      };
      overlay.appendChild(refreshBtn);

      // 결과 리스트 영역
      const list = document.createElement("ul");
      list.style.padding = "0";
      list.style.margin = "0";
      list.style.listStyle = "none";

      if(results.length === 0) {
        const li = document.createElement("li");
        li.textContent = "감지된 버튼이 없습니다.";
        list.appendChild(li);
      } else {
        results.forEach((params, index) => {
          const li = document.createElement("li");
          li.style.borderBottom = "1px solid #ddd";
          li.style.marginBottom = "5px";
          li.style.paddingBottom = "5px";
          li.innerHTML = `<strong>버튼 ${index+1}:</strong><br>
                          cntsTypeCd: ${params.cntsTypeCd}<br>
                          sbjCd: ${params.sbjCd}<br>
                          unitCd: ${params.unitCd}<br>
                          meetingId: ${params.meetingId}`;

          // 복사 버튼 – 코드 클립보드 복사
          const copyBtn = document.createElement("button");
          copyBtn.textContent = "복사";
          copyBtn.style.fontSize = "10px";
          copyBtn.style.marginTop = "5px";
          copyBtn.onclick = () => {
            const code = `codegeniusEntrance('${params.cntsTypeCd}','${params.sbjCd}','${params.unitCd}','${params.meetingId}');`;
            navigator.clipboard.writeText(code).then(() => {
              alert("코드 복사됨:\n" + code);
            }).catch(err => {
              alert("복사 실패: " + err);
            });
          };
          li.appendChild(copyBtn);

          // 입장 버튼 – 서버에 요청 보내고 새 탭 열기
          const enterBtn = document.createElement("button");
          enterBtn.textContent = "입장";
          enterBtn.style.fontSize = "10px";
          enterBtn.style.marginLeft = "5px";
          enterBtn.onclick = () => {
            const query = new URLSearchParams({
              sbjCd: params.sbjCd,
              unitCd: params.unitCd,
              cntsTypeCd: params.cntsTypeCd,
              meetingId: params.meetingId
            }).toString();

            fetch("/home/codegenius/entranceLec", {
              method: "POST",
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: query
            })
            .then(res => res.text())
            .then(text => {
              let data;
              try {
                data = JSON.parse(text);
              } catch (e) {
                alert("응답 JSON 파싱 실패:\n" + e + "\n" + text);
                return;
              }

              if (data.result === "1") {
                const form = document.createElement("form");
                form.method = "POST";
                form.action = data.url;
                form.target = "_blank";

                const fields = {
                  authorizationHeader: data.authorizationHeader,
                  cntsTypeCd: params.cntsTypeCd,
                  sbjCd: params.sbjCd,
                  unitCd: params.unitCd,
                  meetingId: params.meetingId,
                  cmpnyCd: "AS",
                  zoomHostType: "ENTRANT"
                };

                for (const key in fields) {
                  const input = document.createElement("input");
                  input.type = "hidden";
                  input.name = key;
                  input.value = fields[key];
                  form.appendChild(input);
                }

                document.body.appendChild(form);
                form.submit();
                document.body.removeChild(form);
              } else {
                alert("입장 실패:\n" + data.message);
              }
            })
            .catch(err => {
              alert("요청 중 오류 발생:\n" + err);
            });
          };
          li.appendChild(enterBtn);

          list.appendChild(li);
        });
      }
      overlay.appendChild(list);

      // 닫기 버튼 – 오버레이 제거
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "닫기";
      closeBtn.style.marginTop = "10px";
      closeBtn.onclick = () => {
        if(overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      };
      overlay.appendChild(closeBtn);

      return overlay;
    }

    // 오버레이 업데이트 함수 – 새로고침 버튼에서 호출됨
    function updateOverlay() {
      const results = findCodeGeniusButtons();
      const oldOverlay = document.getElementById("codegeniusOverlay");
      if(oldOverlay) {
        const newOverlay = createOverlay(results);
        oldOverlay.parentNode.replaceChild(newOverlay, oldOverlay);
      }
    }

    // 처음 실행 시 – 버튼 검색 결과에 따라 오버레이 생성
    const results = findCodeGeniusButtons();
    const overlay = createOverlay(results);
    document.body.appendChild(overlay);
})();
