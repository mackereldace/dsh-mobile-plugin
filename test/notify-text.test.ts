/**
 * 端侧通知文案与触发规则的断言（对应 `src/notify-text.ts`）。
 *
 * 为什么值得钉：这条链是"手机上能不能看到"的最后一步，
 * 它错了在电脑端**完全看不出来**（推送返回 ok，手机上却没有或文案不对）。
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  HUMAN_SENTENCES,
  MACHINE_NAME_MAX,
  NOTIFY_DETAIL_MAX,
  NOTIFY_SENTENCE_MAX,
  NOTIFY_TOTAL_MAX,
  NOTIFY_EVENT_SUFFIXES,
  NOTIFY_EVENT_TYPES,
  detailLineFor,
  humanSentenceFor,
  machineDisplayName,
  notifyTextFor,
  shouldNotifyEvent,
} from '../src/notify-text.ts'

describe('端侧通知：触发规则', () => {
  it('明写清单里只有审批', () => {
    assert.deepEqual([...NOTIFY_EVENT_TYPES], ['approval/asked'])
  })

  it('★ 结构规律：*/asked 都算"agent 在问你"（选择卡因此现在就能通知）', () => {
    assert.deepEqual([...NOTIFY_EVENT_SUFFIXES], ['/asked'])
    assert.equal(shouldNotifyEvent('approval/asked'), true)
    assert.equal(shouldNotifyEvent('select/asked'), true)
    assert.equal(shouldNotifyEvent('question/asked'), true)
  })

  it('★ 但不是"什么都推"：不合规律的、空的、非字符串的一律不推', () => {
    assert.equal(shouldNotifyEvent('session/started'), false)
    assert.equal(shouldNotifyEvent('tool/result'), false)
    assert.equal(shouldNotifyEvent('asked'), false) // 不能只凭包含
    assert.equal(shouldNotifyEvent(''), false)
    assert.equal(shouldNotifyEvent(undefined), false)
    assert.equal(shouldNotifyEvent(null), false)
  })
})

describe('端侧通知：文案', () => {
  it('审批：带上工具名与原因', () => {
    const text = notifyTextFor('approval/asked', { toolName: 'Bash', reason: '要跑 rm -rf' })
    assert.equal(text.title, '需要你确认')
    assert.match(text.body, /Bash/)
    assert.match(text.body, /rm -rf/)
  })

  it('审批：字段缺失也要成句（不留半截）', () => {
    assert.equal(notifyTextFor('approval/asked', undefined).body, '电脑上的 agent 需要你确认')
    assert.match(notifyTextFor('approval/asked', { title: 'Edit' }).body, /Edit/)
  })

  it('★ 原因过长要截断（通知栏放不下）', () => {
    const text = notifyTextFor('approval/asked', { reason: 'x'.repeat(400) })
    assert.ok(text.body.length < 200)
  })

  it('★ 按规律认出来的类型（如选择卡）：中性文案，绝不编造"需要你确认"', () => {
    const text = notifyTextFor('select/asked', { toolName: '选择卡' })
    assert.doesNotMatch(text.title + text.body, /需要你确认/)
    assert.match(text.title, /等你回应/)
    assert.match(text.body, /选择卡/)
  })

  it('★ 按规律认出来但没带任何字段：也要有一句能看的话', () => {
    const text = notifyTextFor('select/asked', undefined)
    assert.ok(text.body.length > 0)
    assert.doesNotMatch(text.body, /需要你确认/)
  })
})

/**
 * ★ 2026-10-05（用户真机抱怨的那条通知）：
 *
 * ```
 * 标题：需要你确认                                   ← 不知道是哪台电脑
 * 正文：电脑上的 agent 需要你确认：bash（escalate sandbox to danger-full-access:
 *       提权演练：写入工作区外的用户主目录文件需要 danger-full-access，请批准本次。）
 * ```
 *
 * 抱怨：标题没说哪台电脑；正文是原始英文工具调用 + 沙箱术语，又长又被系统截断，
 * 看不出"要我干什么"。⇒ 本节把**新形状**逐条钉住（标题带电脑名 / 第一行一句人话 /
 * 第二行原始细节截断到 60 字 / 总长不超上限）。
 */
describe('端侧通知：提权/审批的新形状（2026-10-05）', () => {
  /** 用户真机那条的原始字段（照抄截图里宿主收到的那一份）。 */
  const ESCALATE = {
    toolName: 'bash',
    reason:
      'escalate sandbox to danger-full-access: 提权演练：写入工作区外的用户主目录文件需要 danger-full-access，请批准本次。',
  }
  /** 原始细节那一行（宿主自己拼的：工具名 + 原因）。 */
  const RAW = ESCALATE.toolName + ' ' + ESCALATE.reason
  const MAC = 'Mac-mini-2024.local'

  it('★ 标题 = <电脑名> 需要你确认，且 `.local` 不进标题（与手机上那个行名同一个名字）', () => {
    const text = notifyTextFor('approval/asked', ESCALATE, MAC)
    assert.equal(text.title, 'Mac-mini-2024 需要你确认')
    assert.doesNotMatch(text.title, /\.local/)
  })

  it('★ 正文第一行是一句人话（不是原始英文工具调用），且 ≤ 40 字', () => {
    const lines = notifyTextFor('approval/asked', ESCALATE, MAC).body.split('\n')
    assert.equal(lines[0], '允许一次提权到 danger-full-access')
    assert.ok((lines[0] ?? '').length <= NOTIFY_SENTENCE_MAX, `实际 ${(lines[0] ?? '').length} 字`)
    assert.doesNotMatch(lines[0] ?? '', /escalate|sandbox/i, '第一行不许是原始英文工具调用')
  })

  it('★ 正文第二行是原始细节，截断到 60 字（前 59 字原样保留 ⇒ 可追溯）', () => {
    const lines = notifyTextFor('approval/asked', ESCALATE, MAC).body.split('\n')
    const detail = lines[1] ?? ''
    assert.equal(detail, RAW.slice(0, NOTIFY_DETAIL_MAX - 1) + '…')
    assert.ok(detail.length <= NOTIFY_DETAIL_MAX, `实际 ${detail.length} 字`)
    assert.ok(RAW.startsWith(detail.slice(0, -1)), '截断前那一段必须与原文逐字相同（可追溯）')
    assert.notEqual(detail, RAW, '这条样本本来就长于上限 ⇒ 必须真的被截断')
  })

  it('★ 标题 + 正文 ≤ 120 字（系统通知要能显示完，不被截掉尾巴）', () => {
    const text = notifyTextFor('approval/asked', ESCALATE, MAC)
    assert.ok(
      text.title.length + text.body.length <= NOTIFY_TOTAL_MAX,
      `实际 ${text.title.length + text.body.length} 字`,
    )
  })

  it('★ 拿不到电脑名 ⇒ 标题退回原来那三个字（**绝不编**一个名字）', () => {
    assert.equal(notifyTextFor('approval/asked', ESCALATE).title, '需要你确认')
    assert.equal(notifyTextFor('approval/asked', ESCALATE, '').title, '需要你确认')
    // ★ 正文那一半与"有电脑名"时逐字相同（电脑名只影响标题，不影响正文）
    assert.equal(notifyTextFor('approval/asked', ESCALATE, MAC).body, notifyTextFor('approval/asked', ESCALATE).body)
  })

  it('★ 非提权样本**不许**套那句提权的话（按关键词映射，不是硬编码一种）', () => {
    const write = notifyTextFor(
      'approval/asked',
      { toolName: 'Write', reason: '写入工作区外的文件：/Users/me/notes.md（超出工作区）' },
      MAC,
    )
    assert.equal(write.body.split('\n')[0], '允许写入工作区外的文件')
    assert.doesNotMatch(write.body, /danger-full-access/, '没提到 danger-full-access 就不许说提权')

    const rm = notifyTextFor('approval/asked', { toolName: 'Bash', reason: '要跑 rm -rf ./build' }, MAC)
    assert.equal(rm.body.split('\n')[0], '允许删除文件')
    assert.doesNotMatch(rm.body, /提权|danger-full-access/)

    // ★ 与审批无关的类型（选择卡）一个字都不许套
    const ask = notifyTextFor('select/asked', { toolName: '选择卡' }, MAC)
    assert.doesNotMatch(ask.body, /允许|提权|danger-full-access/)
    assert.doesNotMatch(ask.title, /需要你确认/)
  })

  it('★ 放不下就不带第三行（会话）——带了也不许越过总长上限', () => {
    // 这条样本：第一行 12 字 + 细节 60 字 ⇒ 塞得进「会话 sess-42」✓
    const short = notifyTextFor(
      'approval/asked',
      { toolName: 'Write', reason: '写入工作区外的文件：/Users/me/notes.md', sessionId: 'sess-42' },
      MAC,
    )
    assert.match(short.body.split('\n')[2] ?? '', /^会话 sess-42$/)
    assert.ok(short.title.length + short.body.length <= NOTIFY_TOTAL_MAX)

    // 这条：上面那条提权样本已经很满 ⇒ 第三行**必须不带**（否则就要挤掉别的行 ✗）
    const full = notifyTextFor('approval/asked', { ...ESCALATE, sessionId: 'web-HbO3D4mPZ6yH' }, MAC)
    assert.equal(full.body.split('\n').length, 2, `实际：${JSON.stringify(full.body)}`)
    assert.ok(full.title.length + full.body.length <= NOTIFY_TOTAL_MAX)
  })

  it('★ 映射表本身的不变量：每条"人话"都 ≤ 40 字，且各条互不相同（不许两条挤成一句）', () => {
    const sentences = HUMAN_SENTENCES.map(([, sentence]) => sentence)
    assert.ok(sentences.length >= 4, '关键词映射至少要有四条（单一硬编码已被用户否掉）')
    for (const sentence of sentences) {
      assert.ok(sentence.length <= NOTIFY_SENTENCE_MAX, `${sentence} 有 ${sentence.length} 字`)
    }
    assert.equal(new Set(sentences).size, sentences.length, '两条规则给了同一句话 ⇒ 说明映射写重了')
  })

  it('★ 拿不到电脑名时的显示名处理：去 `.local`、保留域名与 Windows 裸名', () => {
    assert.equal(machineDisplayName('Mac-mini-2024.local'), 'Mac-mini-2024')
    assert.equal(machineDisplayName('DESKTOP-ABC1234'), 'DESKTOP-ABC1234')
    assert.equal(machineDisplayName('mac.example.com'), 'mac.example.com')
    assert.equal(machineDisplayName('  '), '')
    assert.equal(machineDisplayName(undefined), '')
    assert.equal(machineDisplayName('Mac.local.other'), 'Mac.local.other', '只去掉结尾那一个 .local')
    // ★ 上限：完整域名可以很长，标题不许被它撑爆（留头去尾）
    const longName = 'mac-mini-2024.department.example.internal.company.com'
    const display = machineDisplayName(longName)
    assert.equal(display.length, MACHINE_NAME_MAX)
    assert.ok(longName.startsWith(display.slice(0, -1)), '留下的是主机名那一段（可辨认的部分）')
    assert.match(display, /…$/)
  })

  it('★ 极长的电脑名 + 极长的工具名也不许把总长撑过上限（裁的是细节那一行）', () => {
    const text = notifyTextFor(
      'approval/asked',
      { toolName: 'very-long-tool-name-that-keeps-going', reason: 'x'.repeat(400) },
      'mac-mini-2024.department.example.internal.company.com',
    )
    assert.ok(
      text.title.length + text.body.length <= NOTIFY_TOTAL_MAX,
      `总长必须仍在上限内（实际 ${text.title.length + text.body.length} 字）`,
    )
    const lines = text.body.split('\n')
    assert.equal(lines.length, 2, '第一行（人话）与第二行（细节）都必须留着')
    assert.ok((lines[1] ?? '').length <= NOTIFY_DETAIL_MAX, '细节那一行仍不许超上限')
    assert.ok((lines[1] ?? '').length < NOTIFY_DETAIL_MAX, '名字太挤时，被裁的正是细节这一行')
  })

  it('★ 没有关键词命中 ⇒ 退回带工具名的一句（**绝不空着**）', () => {
    assert.equal(humanSentenceFor('Edit 想改一行', 'Edit'), '允许执行 Edit')
    assert.equal(humanSentenceFor('莫名其妙的一件事', ''), '允许一次需要批准的操作')
  })

  it('★ 截断的边界：正好 60 字不截，多一个字才截', () => {
    assert.equal(detailLineFor('x'.repeat(NOTIFY_DETAIL_MAX)), 'x'.repeat(NOTIFY_DETAIL_MAX))
    assert.equal(detailLineFor('x'.repeat(NOTIFY_DETAIL_MAX + 1)), 'x'.repeat(NOTIFY_DETAIL_MAX - 1) + '…')
  })
})
