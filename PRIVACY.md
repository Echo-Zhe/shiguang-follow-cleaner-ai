# 隐私说明

## 本地数据

本工具不会把账号数据上传到任何服务器。运行时的数据位于 Electron 的 `app.getPath('userData')/data`（打包启动脚本会使用安装目录下的 `data`）：

- `app-state.json`：关注列表、筛选变量、白名单、扫描和清理历史
- `chromium/`：登录会话与 Chromium 配置

这些内容属于用户个人数据，**不属于源码仓库**。

## 仓库中不应该出现

- Cookie、`SESSDATA`、`bili_jct`、`DedeUserID`、`sessionid`
- 真实账号 ID、昵称、头像或主页链接
- `app-state.json`、`data/`、Chromium 用户目录
- 带真实账号的截图、日志、导出 CSV
- 任何 token、密钥、`.env`

`.gitignore` 已尽量阻止这些文件被提交；提交前仍请自行检查。

## 平台请求

请求由本机 Electron 会话直接发往抖音/B站。项目没有中转服务器，也没有遥测。平台仍可能看到正常网络请求，请遵守平台规则并自行承担账号风险。
