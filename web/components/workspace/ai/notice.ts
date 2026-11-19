/** Event fired when a signed-in user starts any AI action; AiNoticeHost listens for it. */
export const AI_NOTICE_EVENT = "rca:ai-run";
export const aiNoticeKey = (userId: string) => `rca.aiNoticeDismissed.${userId}`;

export function isAiNoticeDismissed(userId: string): boolean {
  try {
    return window.localStorage.getItem(aiNoticeKey(userId)) === "1";
  } catch {
    return false; // storage blocked: fall back to showing it
  }
}

export function dismissAiNotice(userId: string) {
  try {
    window.localStorage.setItem(aiNoticeKey(userId), "1");
  } catch {
    /* ignore */
  }
}
