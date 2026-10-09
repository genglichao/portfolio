# PROJECT_MEMORY.md — 项目记忆

## 项目目标

为秋招（AI 产品经理方向）搭建个人作品集网站：排版清晰、时尚简约、有设计感，配精致动效/微动效；面试官 30 秒看懂定位、3 分钟看完核心项目。

## 当前状态

- [x] 联网调研：2025–2026 设计趋势 + PM 作品集方法论
- [x] 整体规划（单页式 + 详情弹层，极简编辑风）→ 计划文件已存
- [x] 网站框架 + 占位内容搭建（HTML/CSS/JS + GSAP + Lenis）
- [x] 本地预览验证（桌面端 Hero/About/Works/两种详情弹层 + 移动端均正常）
- [x] 首屏文案改为「姓名 + 身份 + 定位」结构；页面顺序 Hero → Works → About → Contact
- [x] 首屏图文排版：照片卡片 + 旋转徽章 + 背景描边大字视差
- [x] 替换真实信息：照片（assets/portrait.webp）、简历 PDF（assets/resume.pdf）、个人信息、5 个真实项目（来自简历：EditLoop / SuitMe / 字节飞书 / 青麟栖云面试官 Agent / 杉缔智衣 AIGC 自动化）
- [x] SuitMe 项目完整填充：展板大图（超哥提供的完整版 assets/suitme-board-1/2/3.webp）、演示视频（压缩至 7.5MB，assets/suitme-demo.mp4 + 封面帧）、卡片封面（浅色双机图 suitme-cover.webp）、弹层头图（同图 suitme-hero.webp，data.js 用 heroImg 字段单独指定）
- [x] SuitMe 详情排版重构（面试官视角）：概览下新增关键数据带（detail.metrics，97 份/85.5%/6 大/已交付）；演示视频前置为「产品演示」区块，项目展板紧跟视频下方；产品方案改为六功能卡片网格（section.cards）；AI 亮点改为五步流水线步骤条（section.steps）；过程配图内嵌（用户旅程图 assets/suitme-fig-journey.webp、完整版功能架构图 suitme-fig-arch.webp（超哥提供的原图，非展板裁切）、ComfyUI 流程 suitme-fig-comfyui.webp，点击灯箱放大）；正文段落通栏排满；区块标题自动编号
- [x] SuitMe 文案修正（超哥反馈）：背景与问题中技术表述改为「视觉模型负责衣物识别与管理、LLM 负责需求解析、生成模型负责试衣与模特」（原 CV/NLP 表述不准确）
- [x] 详情组件通用化：section 支持 paras/cards/steps/figure/parasAfter/list 组合渲染，其余 4 个项目兼容已验证
- [x] 字节实习拆为两个独立项目（超哥自行改的 data.js 结构：feishu-onboarding 新客上线中心 + feishu-agent 建联平台）；detail.note 脱敏声明字段已支持
- [x] 滴滴建联（feishu-agent）素材填充：78 秒演示视频压缩 27MB→5.9MB（assets/didi-demo.mp4）；从录屏抽 6 张关键界面帧做横版图库（assets/didi-s1~s6，media.wideBoards = 2 列 16:10 网格，标题「产品界面 / Screens」）；需求大厅截图做封面/头图/海报帧
- [x] 脱敏处理：卡片封面 / 弹层头图 / 视频海报帧已改用超哥自行脱敏（马赛克）的需求大厅截图（2026-09-04 提供）；此前 PIL「内部同事」色块方案已废弃。演示视频也已换成超哥 2026-09-04 重录的脱敏版（4K 源 56MB → 1920px 3.6MB，无有效音轨），海报帧取自新视频，脱敏问题已闭环
- [x] 滴滴建联二轮修订（2026-09-04）：① 产品界面图库（Screens）整体移除，didi-s1~s6.webp 已删除；② 用户流程的 6 卡片改为 HTML 流程图（新 section.flow 字段 + main.js buildFlow 渲染 + .flow-* 样式）：发布阶段 → 双路径分支（A·AI 智能推荐 绿 / B·主动接单 橙）→ 候选人池与确认 → 履约阶段（判定节点）→ 双出口（成功·紫 / 48h 未成功·回退），依据超哥提供的产品流程图重绘，桌面双列、移动端单列自适应
- [x] 飞享 FlyDeals 三轮修订（2026-09-04）：① 弹层头图换成 Unsplash 旅行风景照（机翼云海，photo-1436491865332，免费图源）；② 数据带删除（评测数字保留在成果段落）；③「背景与问题」上方新增「产品演示 / Demo」视频位（link 类型媒体支持 video，视频文件 assets/flydeals-demo.mp4 待超哥提供）；④ 链路流程图模块删除；⑤ 「核心设计」四卡（意图识别领衔）；⑥ 挑战四卡改 PM 视角；⑦ 类型改「个人项目 · Demo」
- [x] 飞享 FlyDeals 四轮修订（2026-09-04）：meta 区「线上地址」标签去掉、按钮改克莱因蓝实心胶囊；「背景与问题」板块删除；底部大 CTA 不再渲染（media.ctaInMeta 控制）
- [x] 飞享 FlyDeals 概览定位修正（2026-09-04）：超哥两次反馈——先嫌长，后指出「本质就是一个 RAG 系统的练习 demo」，宏大叙事（「机票绝不允许幻觉，重构搜索体验」）不诚实。最终版概览坦诚定位：「一个 RAG 系统的练习 Demo：拿机票推荐做场景，把意图理解→混合检索→可解释打分→数据 Grounded 生成→评测回归这条 LLM 应用链路独立跑通了一遍」。原则：项目是什么就写什么，练手项目不包装成行业命题（与超哥诚实文案偏好一致）
- [x] EditLoop 详情按超哥定的四个主打点重写（2026-09-04）：素材来自 Team_Cut_Agent 仓库（README / PROJECT_TARGET / PORTFOLIO_INTERVIEW_NARRATIVE / DSH 接入 PRD 飞书文档）。结构：背景与问题 → 团队审阅与快速修改（闭环 4 步）→ GraphRAG 素材理解与检索（Tier1 Worker → GraphRAG → Evidence Gate → Footage Agent 4 步）→ DeepSeek Harness 单 Agent+Skill/Tools（4 卡：收敛决策 / Skill 加载 / 11 Tool 契约 / 人工确认与会话状态机）→ 评测体系（5 Bench 卡 + Eval Space）→ 成果 → 复盘。超哥定的优先级：GraphRAG / DSH 单 Agent 验证 / 团队审阅快速修改 / 评测。卡片标题去掉「多 Agent」；「开发中·暂无线上环境」声明按超哥要求删除
- [x] EditLoop 真实产品截图入库（2026-09-04，超哥提供 3 张）：记忆中心 GraphRAG 图谱（84 节点/272 关系/23 类实体）→ GraphRAG 章节配图 assets/editloop-fig-graphrag.webp；审阅台（四类评论/V1–V4 版本/AI 修改入口）→ 团队审阅章节配图 editloop-fig-review.webp；剪辑工作台 + DSH Agent 对话截图被超哥否掉（人脸不适合做封面）
- [x] EditLoop 视觉与结构微调（2026-09-04）：数据带删除（超哥：图一不需要）；卡片封面与弹层头图改用 GraphRAG 记忆中心知识图谱图（暗底彩点，超哥认可「用 GraphRAG 那张也行」）——editloop-cover.webp（16:11 裁切）/ editloop-hero.webp（全宽），GraphRAG 章节配图 editloop-fig-graphrag.webp 保留（同源图，头图是氛围化裁切、配图是完整可读截图）
- [x] 飞享 FlyDeals 卡片修订（2026-09-04）：卡片 metric 从评测数据改为「完整链路独立跑通：意图理解 → 混合检索 → 可解释打分 → Grounded 生成」（评测数字只留在详情成果段）；卡片「访问线上站点」从蓝色文字链接改为实心克莱因蓝按钮（main.js 里 link-arrow 换 btn btn-accent，带磁吸效果）
- [x] 飞享 demo 视频入库（2026-09-04）：超哥提供的 3 分 21 秒录屏（4K 源 117MB）压缩至 1920px 8.9MB（assets/flydeals-demo.mp4，音轨基本无声已去掉），海报帧取 90 秒处推荐卡片画面（assets/flydeals-poster.webp）。至此飞享项目素材齐备，仅剩项目时间「2026」待补起止月份
- [x] 飞享 FlyDeals 五轮修订（2026-09-04）：超哥反馈「四张挑战卡不像正常做 RAG 会遇到的挑战」——重写为标准 RAG/LLM 工程挑战框架，每张「现象→解法→结果」：① 幻觉抑制：事实与生成隔离 ② 混合检索：硬约束与语义召回（并入 Bug 价软惩罚/硬过滤案例）③ 多轮状态管理：槽位继承（保留死循环案例）④ 评测与回归：让迭代可度量（并入 freeform 兜底 + 220 变体回归）。原「封闭 Schema 表达丢失」「反向航段污染」两卡撤销，素材并入 ②④
- [x] 超哥反馈修订：卡片 metric 为「AI 双向自动撮合：为需求匹配人脉、为人脉匹配需求，提醒直达双方」；卡片封面为完整需求大厅截图（16:11 画布 + 圆角投影），封面/头图/海报帧均用超哥自行脱敏（马赛克）的版本
- [x] 滴滴建联详情按超哥产品文档重构（2026-09-04）：概览改用文档原话「你想找谁，平台帮你匹配公司里谁能搭上线」；去掉数据带；叙事改为项目自己的逻辑——需求背景 / 设计思路（双角色+人脉归属+积分闭环）/ 用户流程（发单③步+接单③步双路径卡片）/ AI 检索匹配思路（情报分析→7 维关联推断→精排打分→双向输出，四步链路，按文档真实机制）/ Skill 设计（5 个 Skill 卡片，**按链路推断草拟，待超哥确认实际拆分**）/ 成果与复盘。超哥明确：不要求每个项目套同一模板，各项目按自身内容组织
- [x] 灯箱展板改为 <img> contain 完整显示，不再裁切
- [x] 本地预览服务换成 serve.py（支持 HTTP Range，视频可拖动快进）；AGENTS.md 预览命令已更新
- [x] 修复 Lenis stop 导致弹层无法滚动的问题（改为 prevent 规则 + overflow 锁背景）
- [x] 项目列表精简为 4 个（2026-09-04 超哥指令）：删除面试官 Agent（青麟栖云）、AIGC 生产与上架自动化（杉缔智衣）、飞书新客上线中心（feishu-onboarding）三个条目；最终顺序 EditLoop → 滴滴建联 → 飞享 FlyDeals → SuitMe，已本地验证列表与弹层渲染
- [x] 滴滴建联边界修正（2026-09-04）：Skill 设计 parasAfter 中「复用到 10+ Agent」表述删除——超哥明确该作品只对应简历「Agent 应用产品化设计」一条，10+ Agent 属另一段经历，不纳入本项目
- [ ] EditLoop 演示视频 assets/editloop-demo.mp4（data.js 已引用但文件不存在，待补，否则视频区 404）
- [ ] 飞享项目时间「2026」待补起止月份
- [x] 部署 GitHub Pages（2026-09-04）：妙搭静态发布因 tar.gz 23.8MB 超 20MB 硬限（三个演示视频占 20MB）放弃；改走 GitHub Pages——genglichao/portfolio 已开启 Pages（main 分支根目录），线上地址 https://genglichao.github.io/portfolio/ 。已验证国内不走代理直连：首页 200（0.79s）、CSS/data.js 200、视频 Range 请求 206（可拖动快进）。此后 push genglichao main 即自动重新部署
- [x] Vercel 上线（2026-10-09）：超哥在 Vercel 网页端导入 genglichao/portfolio，项目名 portfolio，线上地址 https://portfolio-two-red-15.vercel.app/ ，与 GitHub 联动——push main 后 Pages 与 Vercel 双端自动部署。已验证 index / bend-gl.js / banner / resume.pdf 均为最新。注意：本机 `vercel` CLI 装在 `~/.npm-global/bin`（/usr/local 无写权限）；`~/.gitconfig` 的 gh 凭证助手已失效，push 需加 `-c credential.https://github.com.helper=osxkeychain` 绕过（待修复）
- [x] Works 区初版 3D 滚筒（2026-09-28）：逐帧分析 ricardochance.com 后实现 rotationX 圆柱转子（逐面板旋转、ScrollTrigger pin、caption 随中心切换）；当日被后续方案取代
- [x] Works 区重构为 WebGL 柔性卡片转子（2026-09-30 – 10-08，对齐 nk.studio 链路）：位置层 ScrollTrigger pin + 分段 easeInOutCubic，卡片 2.75:1 横幅（专用 assets/editloop|didi|flydeals|suitme-banner.webp，原封面 cover 裁剪）；形变层为滚动速度驱动弯曲（Lenis velocity → 弹簧插值 → three.js 逐顶点弯曲，停滚回弹为平面）。技术栈：js/bend-gl.js（three.js 0.164 CDN 动态 import）→ 失败降级 js/bend-scroll.js（DOM 切片版）→ 移动端（<640px）/ reduced-motion / 精细指针不满足 → 经典交替网格列表。caption 为 DOM 覆盖层。点击卡片 Raycaster 命中打开详情弹层。参数集中在 main.js STAGE 对象与 bend-gl.js GL_DEFAULTS
- [x] 分析与实现文档入库：RICARDO_ANALYSIS.md / RICARDO_TECH_REPORT.md / RICARDO_SCROLL_INTERACTION.md / RICARDO_IMPLEMENTATION_PLAN.md；另有 bend-demo.html（弯曲效果试验页）、server.js（Node 预览服务，与 serve.py 并存）

## 重要决策

- 技术栈：纯静态零构建，项目数据集中在 `js/data.js`，便于后续持续添加作品。
- 无链接项目（展板 + 视频）走详情弹层内的 `board` 媒体区；有链接项目卡片上直接放「访问线上站点 ↗」。
- 案例详情统一叙事结构：概览 → 关键数据带 → 演示视频 → 背景与问题 → 调研（配旅程图）→ 方案（功能卡片）→ AI 亮点（步骤条 + 流程配图）→ 成果 → 复盘 → 展板附录；「10 秒扫到数字，1 分钟读完故事」。
- 首屏文案走「姓名 + 身份 + 一句定位」的经典结构（不用口号式标语）；页面顺序为 Hero → Works → About → Contact，导航同步。
- 点缀色：克莱因蓝 `#002FA7`（已确认保留整体风格）。
- 真实信息来源：简历 PDF（图片版，已用 PyMuPDF 渲染读取）；照片从会话附件提取转 WebP（720px 宽，44KB）。
- 实习项目涉敏处理原则：不放内部链接/内部域名/同事真实姓名/内部产品代号外的敏感信息；视觉素材一律超哥自行马赛克或重录脱敏版，配 detail.note 脱敏声明；「作品边界」严格对齐简历条目，不混入其他经历的成果（如 10+ Agent）。
- 工具环境：`.tools-venv/`（pymupdf + pillow，仅用于处理素材，已被 .gitignore 排除）。

## 待超哥确认 / 提供

- 滴滴建联「已部署内部演示环境」等成果表述是否属实（我基于录屏与简历写的）
- EditLoop 部署后是否有可公开链接；EditLoop 演示视频文件
- 是否保留 Geng-li-chao/portfolio 这个仓库（当前主远程，Vercel 实际用的是 genglichao/portfolio；不需要的话可删）
