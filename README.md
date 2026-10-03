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

## ★ 装完还要做一步（否则手机连不上 ✗）

bundle 只给"行"，**这台机器的配置**得由你给：局域网地址、监听端口、手机该用哪个地址。
把下面这段加到 **`~/.dsh/profiles/<profile名>/cordis.patch.yml`**（把地址换成这台机器的）：

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
