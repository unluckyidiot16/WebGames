// public/WebGames/QuizDiceDefense/classhub-bridge.js
(function () {
    const isInIframe =
        typeof window !== "undefined" &&
        window.parent &&
        window.parent !== window;

    const QUIZPACK_LISTENERS = [];

    // ?sessionId=... 쿼리에서 세션 ID 추출
    let embeddedSessionId = null;
    if (typeof window !== "undefined") {
        try {
            const params = new URLSearchParams(window.location.search);
            embeddedSessionId = params.get("sessionId");
        } catch (e) {
            console.warn("[ClassHubBridge] failed to parse sessionId", e);
        }
    }

    function safePostToHost(message) {
        if (!isInIframe) return;
        try {
            window.parent.postMessage(
                {
                    // 어디서 왔는지 구분용 메타
                    source: "QDD",
                    game: "qdd",
                    ...message,
                },
                "*" // 필요하면 origin 제한 가능
            );
        } catch (e) {
            console.warn("[ClassHubBridge] postMessage failed", e);
        }
    }

    /** QDD <-> Host 브리지 객체 */
    const bridge = {
        /** iframe 안에서만 true */
        inEmbed: isInIframe,

        /** QDD → Host : 퀴즈팩 요청 */
        requestQuizpack() {
            safePostToHost({
                type: "CH_REQUEST_QUIZPACK",
                sessionId: embeddedSessionId,
            });
        },

        /** QDD ← Host : 퀴즈팩 전달 콜백 등록 */
        onQuizpackReady(cb) {
            if (typeof cb === "function") {
                QUIZPACK_LISTENERS.push(cb);
            }
        },

        /** QDD → Host : 정답/오답 결과 보고 */
        reportAnswer(payload) {
            if (!payload) return;
            const p = payload || {};

            const normalized = {
                questionId:
                    typeof p.questionId === "string"
                        ? p.questionId
                        : p.questionId != null
                            ? String(p.questionId)
                            : null,
                correct: !!p.correct,
                answerIndex:
                    typeof p.answerIndex === "number" ? p.answerIndex : null,
                timeMs: typeof p.timeMs === "number" ? p.timeMs : null,
            };

            // ✅ ClassHub 규격에 맞춰 최상위에 sessionId/필드들을 펼쳐서 보냄
            safePostToHost({
                type: "CH_REPORT_ANSWER",
                sessionId: embeddedSessionId,
                ...normalized,
            });
        },

        /** QDD → Host : 최종 요약 보고 (선택) */
        reportSummary(summary) {
            if (!summary) return;
            safePostToHost({
                type: "CH_REPORT_SUMMARY",
                sessionId: embeddedSessionId,
                summary,
            });
        },
    };

    // 기존에 뭔가 정의돼 있으면 덮어쓰지 말고 합치기
    window.ClassHubBridge = Object.assign(
        {},
        window.ClassHubBridge || {},
        bridge
    );

    // Host → QDD 메시지 수신 (퀴즈팩 등)
    window.addEventListener("message", (event) => {
        const data = event.data;
        if (!data || typeof data !== "object") return;

        // Host → QDD 퀴즈팩 전달
        if (data.type === "CH_QUIZPACK_DATA") {
            // 세션이 다르면 무시 (동시에 여러 QDD가 떠 있을 때 안전망)
            if (
                embeddedSessionId &&
                data.sessionId &&
                data.sessionId !== embeddedSessionId
            ) {
                return;
            }

            const pack = data.quizpack;
            for (const cb of QUIZPACK_LISTENERS) {
                try {
                    cb(pack);
                } catch (e) {
                    console.warn(
                        "[ClassHubBridge] onQuizpackReady handler error",
                        e
                    );
                }
            }
        }
    });
})();
