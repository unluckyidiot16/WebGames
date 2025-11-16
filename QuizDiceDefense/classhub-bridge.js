// classhub-bridge.js
(function (global) {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("session");
    const inEmbed = params.get("mode") === "embed";

    let quizpack = null;
    const listeners = {
        quizpack: [],
    };

    function notifyQuizpack() {
        if (!quizpack) return;
        listeners.quizpack.forEach((fn) => {
            try { fn(quizpack); } catch (e) { console.error(e); }
        });
        listeners.quizpack.length = 0;
    }

    function requestQuizpack() {
        if (!inEmbed || !sessionId) return;
        global.parent.postMessage(
            { type: "CH_REQUEST_QUIZPACK", sessionId },
            "*"
        );
    }

    function onQuizpackReady(cb) {
        if (quizpack) {
            cb(quizpack);
            return;
        }
        listeners.quizpack.push(cb);
    }

    function reportAnswer(info) {
        if (!inEmbed || !sessionId) return;
        global.parent.postMessage(
            {
                type: "CH_REPORT_ANSWER",
                sessionId,
                questionId: info.questionId ?? null,
                correct: !!info.correct,
                answerIndex: (typeof info.answerIndex === "number") ? info.answerIndex : null,
                timeMs: (typeof info.timeMs === "number") ? info.timeMs : null,
            },
            "*"
        );
    }

    function reportSummary(summary) {
        if (!inEmbed || !sessionId) return;
        global.parent.postMessage(
            { type: "CH_REPORT_SUMMARY", sessionId, summary },
            "*"
        );
    }

    global.addEventListener("message", (event) => {
        const msg = event.data;
        if (!msg || msg.sessionId !== sessionId) return;

        if (msg.type === "CH_QUIZPACK_DATA") {
            quizpack = msg.quizpack;
            notifyQuizpack();
        }
    });

    global.ClassHubBridge = {
        inEmbed,
        sessionId,
        requestQuizpack,
        onQuizpackReady,
        reportAnswer,
        reportSummary,
    };
})(window);
