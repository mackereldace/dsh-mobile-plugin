/**
 * 端侧通知的**文案与触发类型**（第二阶段）—— 抽出来是为了两件事：
 *
 * 1. **一处可配置** ✗：选择卡（0.20）的事件类型名还没取证到 ✓
 *    （取证办法见 `40-通知推送现状与缺口-20261004.md`：宿主已把每个 `session/event`
 *    的类型记进诊断 ✓，而诊断现在已经能在手机上的自检页读到 ✓）。
 *    拿到名字之后**只改这里一行** ✓ —— 通道（`deviceCall('notify', …)` ✓）
 *    与"点击落到会话"（`sessionId` ✓）都已共用 ✓，不需要再动别处 ✓。
 * 2. **可以被断言** ✓：文案是纯函数 ⇒ 电脑上就能钉住 ✓，
 *    不必等到真机上"看起来不对"才发现 ✓（本仓在选择器/类型名上栽过多次 ✗）。
 *
 * ★ 纪律：**不猜** ✗ —— 没在清单里的类型**不通知** ✓（宁可少推一条 ✓，
 *   也不要凭"看起来像"就推 ✓，那会让用户收到莫名其妙的通知 ✗）。
 */
/** 会触发端侧通知的会话事件类型（拿到新类型名 ⇒ 往这里加一项即可）。 */
export declare const NOTIFY_EVENT_TYPES: readonly string[];
/** 这条事件类型要不要通知。 */
export declare function shouldNotifyEvent(type: string | undefined | null): boolean;
/**
 * 通知文案（标题 + 正文）✓ —— 纯函数，给断言用 ✓。
 *
 * @param type 事件类型（清单内的 ✓）
 * @param data 事件负载里能拿到的几个字段（都可能是 undefined ✓）
 */
export declare function notifyTextFor(type: string, data: {
    toolName?: unknown;
    reason?: unknown;
    title?: unknown;
    summary?: unknown;
} | undefined): {
    title: string;
    body: string;
};
//# sourceMappingURL=notify-text.d.ts.map