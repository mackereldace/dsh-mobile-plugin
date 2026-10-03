# DSH Mobile · 宿主插件（`@dsh-mobile/host`）

给 **DeepSeek Harness** 用的插件：让手机能作为**遥控端**连上这台电脑 ——
原生首页、会话页、真截图缩略图、配对与隧道，都在这个包里。

## 怎么装（DSH 0.17+ 的官方插件管理）

在 DSH 的 **Plugins 页面**里选 **Git** 那一栏，填这个仓库地址：

```
https://github.com/mackereldace/dsh-mobile-plugin
```

或者用命令行（等价）：

```bash
dsh plugin --profile <profile名> add https://github.com/mackereldace/dsh-mobile-plugin
```

本包是 **bundle**（`package.json` 里 `dsh.bundle.patch` ✓）⇒ 装完之后
它那**一行插件配置会自动并进** DSH 的补丁栈 ✓，**不需要手工编辑 `cordis.patch.yml`** ✓。

## ★ 装完一般**不用**再手填配置了（2026-10-04 起 ✓）

bundle 只给"行"（`id` / `name` ✓）；**这台机器**该用哪个地址、哪些信任项，原先要你手填 ✗。
**现在插件会自己推导** ✓：没配 `trustedHosts` / `publicBaseUrl` / `phoneBaseUrl` 时，
它按**本机探测到的地址**与监听端口补上 ✓，并在启动日志里**逐条说明**：

```
[dsh-mobile] 没配 trustedHosts ⇒ 按本机地址用 10.0.0.5 / 100.64.0.9（端口 3091 与 3453）
[dsh-mobile] 没配 publicBaseUrl ⇒ 用 http://10.0.0.5:3091
[dsh-mobile] 没配 phoneBaseUrl ⇒ 用 https://10.0.0.5:3453（如果这不是你要的，就在插件 config 里显式写好它）
```

★ 三条纪律（写死在代码里 ✓）：**只补缺**（你配过的一个字不动 ✓）、
**探测不到就不补**（绝不编地址 ✗）、**每一处都打日志**（所以出问题时你能念出来 ✓）。

### 什么时候仍然要手填

- 探测出来的地址**不是你想要的**（例如同时有局域网与 Tailscale，你想让手机走另一条 ✓）；
- 你想**显式**固定端口或信任名单 ✓。

那就照下面写（把地址换成你要的 ✓），加在 **`~/.dsh/profiles/<profile名>/cordis.patch.yml`**：

```yaml
- id: mobile-host
  config:
    trustedHosts:
      - '<这台机器的IP>:3091'
      - '<这台机器的IP>:3453'
    publicBaseUrl: 'http://<这台机器的IP>:3091'
    phoneBaseUrl: 'https://<这台机器的IP>:3453'
    listener:
      plain: '0.0.0.0:3091'
      tls: '0.0.0.0:3453'
```

然后 **退出并重开 DeepSeek Harness**。
（★ 桌面端已完全插件化 ⇒ 重启就是"关掉 App 再打开"✓，**不要**跑 `scripts/restart-lan.sh` ✗ —— 那是插件化之前的 CLI 启动器。）

## 手机侧

- 电脑上打开 `http://<这台机器的IP>:3091/mobile` 出二维码 ⇒ 手机 App 里「＋ 添加电脑」扫码；
- 每台电脑有自己的身份与 CA ⇒ **换一台就要单独配一次对** ✓（首页会出现多张卡）。

## ★ 两句实话

1. **`lib/` 是"当前在跑的那份产物"的快照** ✓ —— 主仓的 `HEAD` 目前**编译不过**
   （已提交的 `src/index.ts` import 了尚未提交的 `src/codex-page.ts` ✗），
   所以这个仓库里的 `lib/` 来自**实际运行的工作区** ✓，而不是从已提交源码重建的 ✓。
2. 本包**不含**桥（`@dsh-mobile/bridge`）—— DSH 那边 `blockExoticSubdeps` 挡着，
   桥必须自己是 bundle ⇒ **官方这条路要装两次**（host 一次、bridge 一次）。
