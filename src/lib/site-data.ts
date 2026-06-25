export const tickerItems = [
  {
    label: "虎虎注册链接：直接走这个链接送额度",
    color: "#3b82f6",
    href: "https://huhuai.xyz/register?aff=BCPA5AKW3KHX",
  },
  {
    label: "QQ 群 602190132：补站点、报价格变化、同步试用线索",
    color: "#10b981",
    href: "/community",
  },
  {
    label: "杂货铺 GPT 倍率 0.058x，CC Max 倍率 0.89x",
    color: "#f59e0b",
    href: "https://api.dstopology.com/keys",
  },
  {
    label: "星见雅公益目前可调用 Grok，适合单独关注",
    color: "#8b5cf6",
    href: "https://new.xinjianya.top/",
  },
];

export const guideSteps = [
  {
    index: "01",
    title: "先看倍率",
    description: "先把倍率清楚、计费口径写明的站筛出来，避免只看首页一句低价就直接充值。",
  },
  {
    index: "02",
    title: "再看备注",
    description: "像模型分组、免费入口、卡制、未核验样本这类备注，往往比单个数字更能影响真实体验。",
  },
  {
    index: "03",
    title: "最后看入口",
    description: "能先试用的先试，能先看群友反馈的先看反馈，再决定要不要长期用。",
  },
];

export const collaborationChannels = [
  {
    title: "QQ 群 602190132",
    href: "/community",
    note: "适合第一时间发新站点、价格变化、试用入口和高峰期异常，群里负责线索流。",
  },
  {
    title: "GitHub Discussions",
    href: "https://github.com/hfeng620-cmd/timin_api_test_and_forum/discussions",
    note: "适合整理经验讨论、长期口径、模型分组说明和需要多人补证据的话题。",
  },
  {
    title: "GitHub Issues",
    href: "https://github.com/hfeng620-cmd/timin_api_test_and_forum/issues",
    note: "适合提交明确纠错、缺失链接、过期价格和待核验站点，便于管理员逐条处理。",
  },
];

export const resourceLinks = [
  {
    title: "虎虎注册链接",
    href: "https://huhuai.xyz/register?aff=BCPA5AKW3KHX",
    note: "当前建议直接走这个链接注册送额度，适合第一次上手先做低成本验证。",
  },
  {
    title: "虎虎历史填表试用单",
    href: "https://www.kdocs.cn/l/cj84YbmlJswN",
    note: "以前群里有过填表送 3 美刀额度的活动，先留作历史记录和补充证明。",
  },
  {
    title: "API 中转站集合统计表",
    href: "https://www.kdocs.cn/l/cr2932V6f6bH",
    note: "适合持续补价格、倍率和入口变动；复制到金山文档 APP 里查看会更方便。",
  },
  {
    title: "加入 QQ 群 602190132",
    href: "/community",
    note: "这里是共建入口，不只是联系方式；适合补站点、报价格变化、同步试用和避坑反馈。",
  },
];

export const stationLinkMap: Record<string, string> = {
  虎虎: "https://huhuai.xyz/register?aff=BCPA5AKW3KHX",
  Aether: "https://to-aether.com/dashboard",
  杂货铺: "https://api.dstopology.com/keys",
  dasuAPI: "https://dasuapi.com",
  Datopology: "https://api.dstopology.com/keys",
  WayX: "https://api.aiwxin.com/dashboard",
  "ai8.my": "https://ai8.my",
  Liary: "https://ai.liaryai.com/",
  "dazes.cc": "https://cn.dazes.cc",
  viptoken站: "https://www.viptoken.top/dashboard",
  Primdream: "https://primdream.store/login",
  "xiaoya-api": "https://xiaoya-api.xyz",
  星见雅公益: "https://new.xinjianya.top/",
  秋天中转站: "https://qiutian.live",
};

export const prioritizedStationNames = ["虎虎", "Aether", "杂货铺", "秋天中转站"];

export type HomeFeaturedStation = {
  name: string;
  badge: string;
  summary: string;
  price: string;
  multiplier: string;
  reason: string;
};

export const homeFeaturedStations: HomeFeaturedStation[] = [
  {
    name: "虎虎",
    badge: "先试用",
    summary: "Plus 0.13x，Pro 0.16x，注册链接送额度。",
    price: "Plus 0.13 / Pro 0.16",
    multiplier: "0.13x 起",
    reason: "最适合新来的人先试水，不用一上来就充值。",
  },
  {
    name: "Aether",
    badge: "常用口碑",
    summary: "群里常用口径偏稳，也可以继续和老板谈组队价格。",
    price: "0.263 倍率",
    multiplier: "0.263x",
    reason: "更像主力候选站，适合稳定需求的人继续观察。",
  },
  {
    name: "杂货铺",
    badge: "双口径",
    summary: "GPT 0.058x，CC Max 0.89x，需要分开看。",
    price: "GPT 0.058 / CC Max 0.89",
    multiplier: "0.058x 起",
    reason: "很适合提醒大家：同一站点也可能是不同档位不同价格，不能只看一个最低值。",
  },
  {
    name: "秋天中转站",
    badge: "新收录",
    summary: "qiutian.live 已补入口，可调用 GPT 5.5 / 5.4。",
    price: "可调用 GPT 5.5 / 5.4",
    multiplier: "待补",
    reason: "适合放进首页精选，提醒大家继续补价格倍率和稳定性反馈。",
  },
];

export const faqPreview = [
  {
    question: "什么是 API 中转站？",
    answer:
      "它位于你和上游模型服务之间，负责转发请求、统一计费、切换渠道，也因此要同时看价格、倍率和口径是否一致。",
  },
  {
    question: "挑站最先看什么？",
    answer:
      "先看倍率和试用入口，再看群友备注，最后才决定是否长期充值，别只盯最低价。",
  },
];

export const faqEntries = [
  {
    question: "什么是 API 中转站？",
    answer:
      "API 中转站通常位于你和上游模型服务之间，负责转发请求、统一计费、切换渠道，或者把多个模型接口包装成同一种调用方式。它的价值在于接入方便、价格灵活、可做聚合与分发，但同时也意味着你并不是直接面对原始模型提供商。",
  },
  {
    question: "API 中转站有什么样的隐患？",
    answer:
      "常见风险包括返回协议与官方不一致、模型身份被替换、知识表现异常、响应内容被二次加工、日志与密钥处理不透明，以及服务稳定性依赖单一上游。一些站点还可能在宣传中高配低卖，表面写的是某个模型，实际转发到的是别的能力层级。",
  },
  {
    question: "有推荐的中转站吗？",
    answer:
      "榜单收录了经过群友长期验证的中转站，每一条都有价格、倍率、模型分组和社区备注。优先从标注「可试用」「注册送额」的站点开始，低门槛验证后再决定长期用谁。你也可以在讨论区查看其他用户的真实反馈和避坑记录。",
  },
  {
    question: "只要是排在前列的站点，充值就是绝对安全的吗？",
    answer:
      "技术指标不等于信誉保证。榜单能帮你梳理价格、倍率、模型覆盖和社区反馈，但无法预测站长的经营持久力。第三方中转站受上游政策影响较大，行业内服务商变动频繁。为了资金安全，请始终保持风险意识，建议初次使用时仅进行最低限度充值，确认长期稳定后再考虑小额续费，切勿一次性大额囤积。",
  },
  {
    question: "为什么不能只看价格最低的站？",
    answer:
      "低价只说明表面成本低，不代表模型映射真实、计费口径一致、峰值时段稳定。尤其是极低倍率站，更应该核验可用性和群友长期反馈。",
  },
  {
    question: "什么叫多档位或特殊口径？",
    answer:
      "像 GPT / Claude 分组、plus / pro 双档、日卡 / 周卡 / 月卡这类，都不适合强行塞成单一数字，应该单独说明。榜单中已为这类站点标注了「双口径」标签。",
  },
  {
    question: "第一次使用中转站怎么降低风险？",
    answer:
      "优先用试用额度或注册送额，先做低额度验证，再看高峰期稳定性和真实模型表现，确认没问题后再考虑长期充值。查看站点详情页中的「优势」和「风险」备注，可以帮助快速判断。",
  },
  {
    question: "QQ 群、Discussions 和 Issues 分别拿来做什么？",
    answer:
      "QQ 群适合先发新线索和实时反馈；Discussions 适合沉淀经验讨论、模型分组和长期口径；Issues 更适合处理明确纠错、缺失链接和待核验条目。这样既能保持讨论活跃，也能把正式数据收口到仓库里。",
  },
  {
    question: "这个站点的数据是怎么收集的？",
    answer:
      "数据来自社区共建：群友提供入口和价格线索、讨论区补充长期反馈和管理员逐条核验后录入。我们通过交叉比对、社区验证和定期复核来尽量保证数据质量，但仍然鼓励你在使用前自行验证关键信息。",
  },
];

export const guideCards = [
  {
    title: "新手先试路线",
    description: "优先走虎虎注册送额度、dazes.cc 注册送额、星见雅公益这类低门槛入口，先验证模型和口径，再决定长期用谁。",
  },
  {
    title: "多倍率怎么看",
    description: "像杂货铺、viptoken 这种同站不同模型不同价格的情况，一定要拆开看，不要把最低倍率当成整站统一口径。",
  },
  {
    title: "怎么一起共建",
    description: "QQ 群负责第一时间发线索，Discussions 和 Issues 负责长期沉淀，管理员审核后再把正式口径收进榜单。",
  },
];

export const forumHighlights = [
  {
    title: "经验讨论",
    note: "哪些站适合长期主力用，哪些只适合薅试用。",
  },
  {
    title: "避坑记录",
    note: "把价格变化、模型缩水、特殊限制这类信息及时沉淀下来。",
  },
  {
    title: "新站报料",
    note: "群里谁发现新入口、新活动、新站点，都可以先进这里挂线索。",
  },
];

export const modelPreviewRows = [
  {
    rank: "#01",
    family: "GPT 系",
    scene: "通用写作 / 代码",
    focus: "适合大多数日常对话、代码协作、写作改稿和通用工作流。",
    stationHint: "如果你主要跑 GPT，用虎虎试用、Aether 长期候选、杂货铺 GPT 档这几类站会更好比较真实成本。",
  },
  {
    rank: "#02",
    family: "Claude 系",
    scene: "长文阅读 / 总结分析",
    focus: "适合长上下文阅读、总结、资料整理和偏细致的分析任务。",
    stationHint: "看多档位价格时要单独比组别和价格，像杂货铺 Plus / Pro、viptoken Claude 组都不能和单一口径混看。",
  },
  {
    rank: "#03",
    family: "Grok / 公益入口",
    scene: "尝鲜补充",
    focus: "适合在主力模型之外补一个额外选择，先看能不能低门槛体验到。",
    stationHint: "星见雅公益目前可调用 Grok，适合单独关注，但要把它和主力付费站分开判断。",
  },
  {
    rank: "#04",
    family: "DeepSeek / Qwen / 其他补位",
    scene: "低成本补位",
    focus: "适合把预算放在更常用的模型上，同时保留一些低成本的补充路线。",
    stationHint: "这类模型更适合回到站点页看入口、倍率和支持范围，再结合 QQ 群反馈判断是否值得常驻。",
  },
];

export const modelGuideNotes = [
  {
    title: "先定任务，再选模型",
    description: "不要先盯站点名，先想清楚自己主要是写作、代码、长文分析，还是想先低门槛试一圈模型差异。",
  },
  {
    title: "选好模型，再回站点页比价格",
    description: "同一个站点里，GPT、Claude、Grok 和其他模型的收费口径可能完全不同。模型先定下来，价格比较才不会走偏。",
  },
  {
    title: "主力站和尝鲜站分开看",
    description: "Aether、虎虎这类更像主力候选；星见雅公益这类更像尝鲜入口。不要把「免费可试」直接等同于「长期主力」。",
  },
];

export const stationComparisonRows = [
  {
    name: "虎虎",
    badge: "双口径",
    group: "huhuai.xyz",
    entry: "注册送额度入口",
    packageType: "倍率制",
    status: "试用信息清晰",
    models: "主流模型待群补",
    price: "Plus 0.13 / Pro 0.16",
    multiplier: "0.13x 起",
    uptime: "缺高峰样本",
    latency: "缺统一样本",
    source: "注册链接 + 历史试用单 + QQ 群反馈",
    verdict: "先试再说",
    note: "当前走注册链接送额度；历史填表活动留档。",
    advantage: "试用入口清晰，适合新用户优先体验。",
    risk: "实际长期价格和稳定性还要继续看群友反馈。",
  },
  {
    name: "Aether",
    badge: "常用",
    group: "https://to-aether.com/dashboard",
    entry: "Dashboard 直链",
    packageType: "倍率制",
    status: "可调用 GPT 5.5 / 5.4，社区常用",
    models: "可调用 GPT 5.5 / 5.4",
    price: "0.263 倍率",
    multiplier: "0.263x",
    uptime: "社区印象偏稳",
    latency: "缺统一样本",
    source: "群友常用口径",
    verdict: "价格还行，口碑偏稳",
    note: "群里常用，价格不算最低但反馈偏稳。",
    advantage: "价格不差，当前备注里稳定性印象较好。",
    risk: "缺少结构化实测数据，仍需要群友补高峰反馈。",
  },
  {
    name: "杂货铺",
    badge: "双口径",
    group: "https://api.dstopology.com/keys",
    entry: "Keys 页面",
    packageType: "模型分组计价",
    status: "需要分开理解",
    models: "GPT / CC Max",
    price: "GPT 0.058 / CC Max 0.89",
    multiplier: "0.058x 起",
    uptime: "缺公开样本",
    latency: "缺统一样本",
    source: "群友备注",
    verdict: "一定要按模型分开看",
    note: "GPT 与 CC Max 分开计价，不要只看最低值。",
    advantage: "很适合展示同站不同模型收费完全不同的真实情况。",
    risk: "如果只看最低值，很容易误读 CC Max 的实际价格。",
  },
  {
    name: "Datopology",
    badge: "未实测",
    group: "https://api.dstopology.com/keys",
    name: "秋天中转站",
    badge: "新收录",
    group: "https://qiutian.live",
    entry: "官网入口",
    packageType: "模型接入已确认 / 价格待补",
    status: "可调用 GPT 5.5 / 5.4",
    models: "可调用 GPT 5.5 / 5.4",
    price: "可调用 GPT 5.5 / 5.4",
    multiplier: "待补录",
    uptime: "缺公开样本",
    latency: "缺统一样本",
    source: "用户新增补充",
    verdict: "先收录官网入口",
    note: "qiutian.live 已补入口，可调用 GPT 5.5 / 5.4。",
    advantage: "模型接入口径已明确，方便后续群友补测价格。",
    risk: "当前仍缺可直接比较的价格和倍率信息。",
  },
  {
    name: "dasuAPI",
    badge: "待补测",
    group: "https://dasuapi.com",
    entry: "官网入口",
    packageType: "模型接入已确认 / 价格待补",
    status: "可调用 GPT 5.5 / 5.4",
    models: "可调用 GPT 5.5 / 5.4",
    price: "可调用 GPT 5.5 / 5.4",
    multiplier: "待补录",
    uptime: "社区正向，但缺样本",
    latency: "缺统一样本",
    source: "群友正向备注",
    verdict: "先挂上，等补体验",
    note: "入口明确，可调用 GPT 5.5 / 5.4，倍率和计费规则待补。",
    advantage: "模型接入口径已明确，适合继续补价格和高峰样本。",
    risk: "缺少具体倍率与长期稳定性数据。",
  },
  {
    name: "Datopology",
    badge: "未实测",
    group: "https://api.dstopology.com/keys",
    entry: "Keys 页面",
    packageType: "模型接入已确认 / 价格待补",
    status: "可调用 GPT 5.5 / 5.4",
    models: "可调用 GPT 5.5 / 5.4",
    price: "可调用 GPT 5.5 / 5.4",
    multiplier: "待补录",
    uptime: "未试",
    latency: "未试",
    source: "群友待试",
    verdict: "先挂名，等第一手体验",
    note: "可调用 GPT 5.5 / 5.4，价格倍率待补。",
    advantage: "模型接入口径已明确，后续重点补价格、倍率和稳定性样本。",
    risk: "价格与稳定性仍缺第一手数据，别写成确定推荐。",
  },
  {
    name: "WayX",
    badge: "待补测",
    group: "https://api.aiwxin.com/dashboard",
    entry: "Dashboard 直链",
    packageType: "模型接入已确认 / 价格待补",
    status: "可调用 GPT 5.5 / 5.4",
    models: "可调用 GPT 5.5 / 5.4",
    price: "可调用 GPT 5.5 / 5.4",
    multiplier: "待补录",
    uptime: "缺公开样本",
    latency: "缺统一样本",
    source: "用户最新整理表",
    verdict: "先收录，待继续反馈",
    note: "已收录入口，可调用 GPT 5.5 / 5.4。",
    advantage: "模型接入口径已明确，方便后续继续补价格和稳定性。",
    risk: "没有明确价格和高峰期稳定性数据。",
  },
  {
    name: "ai8.my",
    badge: "低倍率",
    group: "ai8.my",
    entry: "域名入口",
    packageType: "倍率制",
    status: "低倍率，模型已确认",
    models: "可调用 GPT 5.5 / 5.4",
    price: "0.06 倍率",
    multiplier: "0.06x",
    uptime: "缺高峰样本",
    latency: "缺统一样本",
    source: "群友整理",
    verdict: "倍率比较亮眼",
    note: "倍率低，可调用 GPT 5.5 / 5.4，缺稳定性反馈。",
    advantage: "模型和倍率都有亮点，适合补进低倍率观察区。",
    risk: "高峰期稳定性仍缺样本，别只因为价格低就直接推荐。",
  },
  {
    name: "Liary",
    badge: "卡制",
    group: "https://ai.liaryai.com/",
    entry: "官网入口",
    packageType: "卡制 / 价格待补",
    status: "可调用 GPT 5.5 / 5.4",
    models: "可调用 GPT 5.5 / 5.4",
    price: "可调用 GPT 5.5 / 5.4",
    multiplier: "待补录",
    uptime: "缺公开样本",
    latency: "缺统一样本",
    source: "用户最新整理表",
    verdict: "先保留入口",
    note: "可调用 GPT 5.5 / 5.4。",
    advantage: "模型接入口径已明确，后续补价格后可以继续横向比较。",
    risk: "价格和计费方式仍缺统一样本。",
  },
  {
    name: "dazes.cc",
    badge: "注册送额",
    group: "https://cn.dazes.cc",
    entry: "官网登录",
    packageType: "注册送额 / 价格待补",
    status: "新人友好，模型已确认",
    models: "可调用 GPT 5.5 / 5.4",
    price: "注册送额可试",
    multiplier: "待补录",
    uptime: "群友口径稳定",
    latency: "缺统一样本",
    source: "注册送额 + 邀请码",
    verdict: "新人友好",
    note: "注册送额，可调用 GPT 5.5 / 5.4，邀请码备注 dGSL。",
    advantage: "门槛低，模型接入口径明确，适合拿来先试。",
    risk: "「稳定」目前更多是社区口径，缺少统一实测。",
  },
  {
    name: "viptoken站",
    badge: "低倍率",
    group: "https://www.viptoken.top/dashboard",
    entry: "Dashboard 直链",
    packageType: "模型分组计价",
    status: "已拆 GPT / Claude",
    models: "GPT-5.5 / GPT-5.4 / Claude",
    price: "GPT 0.2 / Claude 0.15",
    multiplier: "0.15x 起",
    uptime: "缺高峰样本",
    latency: "缺统一样本",
    source: "群友整理",
    verdict: "也需要按模型分开看",
    note: "GPT 5.5 / 5.4 与 Claude 组倍率不同。",
    advantage: "模型和价格分组清楚，适合放进正式榜单做对比。",
    risk: "仍缺高峰稳定性和长期使用反馈。",
  },
  {
    name: "Primdream",
    badge: "待复核",
    group: "https://primdream.store/login",
    entry: "官网登录",
    packageType: "模型接入已确认 / 价格待补",
    status: "可调用 GPT 5.5 / 5.4",
    models: "可调用 GPT 5.5 / 5.4",
    price: "可调用 GPT 5.5 / 5.4",
    multiplier: "待补录",
    uptime: "缺公开样本",
    latency: "缺统一样本",
    source: "用户最新整理表",
    verdict: "等待新口径",
    note: "入口保留，可调用 GPT 5.5 / 5.4，倍率待补。",
    advantage: "模型接入口径已明确，后续更新价格比较方便。",
    risk: "价格和稳定性还没有足够样本做明确判断。",
  },
  {
    name: "xiaoya-api",
    badge: "待补测",
    group: "https://xiaoya-api.xyz",
    entry: "官网入口",
    packageType: "模型接入已确认 / 价格待补",
    status: "可调用 GPT 5.5 / 5.4",
    models: "可调用 GPT 5.5 / 5.4",
    price: "可调用 GPT 5.5 / 5.4",
    multiplier: "待补录",
    uptime: "缺公开样本",
    latency: "缺统一样本",
    source: "群友整理",
    verdict: "先收录，等新口径",
    note: "入口保留，可调用 GPT 5.5 / 5.4，倍率待补。",
    advantage: "模型接入口径已明确，后续补价格方便。",
    risk: "当前没有可直接比较的价格信息。",
  },
  {
    name: "星见雅公益",
    badge: "免费",
    group: "https://new.xinjianya.top/",
    entry: "官网入口",
    packageType: "公益 / 免费入口",
    status: "免费入口 + Grok",
    models: "Grok / 其他待补",
    price: "免费",
    multiplier: "不适用",
    uptime: "规则待补",
    latency: "缺统一样本",
    source: "群友整理",
    verdict: "适合单独关注",
    note: "免费入口，可调用 Grok。",
    advantage: "对新手非常友好，门槛最低，也有额外模型可试。",
    risk: "免费不代表长期稳定，仍要看规则和高峰表现。",
  },
  {
    name: "Datopology",
    badge: "未实测",
    group: "https://api.dstopology.com/keys",
    entry: "Keys 页面",
    packageType: "同域关系待确认",
    status: "仅见入口，待确认",
    models: "可调用 GPT 5.5 / 5.4",
    price: "可调用 GPT 5.5 / 5.4",
    multiplier: "待补录",
    uptime: "未试",
    latency: "未试",
    source: "群友待试",
    verdict: "先挂名，等第一手体验",
    note: "缺第一手体验，先留入口。",
    advantage: "和杂货铺同链接，值得确认是否同站不同口径。",
    risk: "完全缺第一手数据，别写成确定推荐。",
  },
];
