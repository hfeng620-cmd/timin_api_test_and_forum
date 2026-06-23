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
    label: "杂货铺 GPT 模型当前整理倍率为 0.058x",
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

export const highlightMetrics = [
  { label: "已录入站点", value: "14", note: "已补入五条悟 qiutian.live，并继续扩展可比站点" },
  { label: "可直接试用入口", value: "2", note: "虎虎注册送额度和 dazes.cc 新人赠额都已挂到页面" },
  { label: "特殊价格口径", value: "5+", note: "含多倍率、日卡/周卡/月卡、plus/pro 分组等情况" },
  { label: "共建优先级", value: "高", note: "这批数据最需要群友继续补测和纠错" },
];

export const updateBoard = [
  "虎虎最新整理倍率更新为 0.12x，当前主入口改为注册链接送额度",
  "Aether 最新整理倍率更新为 0.263x",
  "杂货铺已拆成 GPT 0.058x / Claude Max 1.15x 双口径",
];

export const stationSnapshots = [
  {
    name: "虎虎",
    group: "huhuai.xyz / 试用入口",
    tag: "可试用",
    price: "0.12 倍率",
    multiplier: "0.12x",
    uptime: "待群测",
    latency: "待补",
  },
  {
    name: "Aether",
    group: "to-aether.com / 社区常用",
    tag: "较稳定",
    price: "0.263 倍率",
    multiplier: "0.263x",
    uptime: "待补",
    latency: "待补",
  },
  {
    name: "杂货铺",
    group: "api.dstopology.com / 低倍率",
    tag: "双口径",
    price: "GPT 0.058 / Claude Max 1.15",
    multiplier: "0.058x 起",
    uptime: "待补",
    latency: "待补",
  },
];

export const communityPosts = [
  {
    category: "集合更新",
    meta: "刚整理 · 需要大家补测",
    title: "这批中转站已经先挂上来了，接下来最缺的是稳定性和模型分组反馈",
    summary:
      "现在已经不是空样品了，而是把你给的真实站点集合先做进页面。下一步最有价值的是群友补充高峰期稳定性、实际模型可用性和价格是否持续有效。",
  },
  {
    category: "试用提醒",
    meta: "优先入口",
    title: "虎虎当前走注册链接送额度，历史填表活动先留档",
    summary:
      "当前主入口已改为注册链接送额度；以前群里填表送 3 美刀的记录先保留。",
  },
  {
    category: "避坑",
    meta: "社区口径",
    title: "Primdream 先别急着下结论，当前更缺的是新口径和一手样本",
    summary:
      "像这类还缺稳定样本的站，更适合先收录入口和当前口径，再等群友补价格截图、模型覆盖和高峰期表现，而不是直接写成确定推荐或明确劝退。",
  },
  {
    category: "待核验",
    meta: "继续共建",
    title: "Datopology、WayX、xiaoya-api 这几类站最需要大家补第一手体验",
    summary:
      "有的站现在只有倍率或入口，没有足够的高峰稳定性和模型实际反馈，这正是大家一起补数据最能发挥作用的地方。",
  },
];

export type XDiscussionReply = {
  author: string;
  handle: string;
  postedAt: string;
  body: string;
};

export type XDiscussionPost = {
  id: string;
  author: string;
  handle: string;
  postedAt: string;
  body: string;
  tags: string[];
  station?: string;
  stats: {
    replies: number;
    likes: number;
    bookmarks: number;
  };
  replies?: XDiscussionReply[];
};

export const xDiscussionSeed: XDiscussionPost[] = [
  {
    id: "huhu-trial-thread",
    author: "北城补站员",
    handle: "@beicheng_api",
    postedAt: "今天 09:14",
    station: "虎虎",
    body:
      "虎虎这两天还是挺适合新人的，当前走注册链接送额度。以前群里有过填表送 3 美刀，历史入口先留着。真要长期用，还是要继续盯价格和稳定性。",
    tags: ["试用入口", "虎虎", "新手先试"],
    stats: {
      replies: 18,
      likes: 42,
      bookmarks: 15,
    },
    replies: [
      {
        author: "西瓜不加冰",
        handle: "@melon_patch",
        postedAt: "今天 09:26",
        body: "我昨天填的，额度到账挺快，适合先跑点日常请求试水。",
      },
      {
        author: "阿泽补档中",
        handle: "@aze_logs",
        postedAt: "今天 09:41",
        body: "建议群里顺手补一下高峰期表现，别最后首页只剩试用信息最完整。",
      },
    ],
  },
  {
    id: "aether-main-choice",
    author: "长文本搬运工",
    handle: "@context_runner",
    postedAt: "今天 10:03",
    station: "Aether",
    body:
      "Aether 现在给我的感觉还是偏“主力候选”。0.263 这个口径不算最低，但好处是群里用的人多，反馈没那么飘。要是你不是专门薅最低价，而是想找个能长期放在工作流里的站，它反而值得盯。",
    tags: ["Aether", "主力候选", "稳定性"],
    stats: {
      replies: 11,
      likes: 33,
      bookmarks: 12,
    },
    replies: [
      {
        author: "雾里看接口",
        handle: "@foggy_route",
        postedAt: "今天 10:17",
        body: "同感，至少现在群里提到它时，不会马上跟着一堆避坑截图。",
      },
    ],
  },
  {
    id: "grocery-dual-pricing",
    author: "倍率警察",
    handle: "@ratio_watch",
    postedAt: "今天 11:08",
    station: "杂货铺",
    body:
      "杂货铺最怕被一句“0.058x 很便宜”带过去。GPT 那档确实亮眼，但 Claude Max 又是另一套价格，得拆开写，不然新来的人很容易把最低倍率当成整站统一口径，这个误导挺大的。",
    tags: ["杂货铺", "多口径", "Claude Max"],
    stats: {
      replies: 24,
      likes: 57,
      bookmarks: 21,
    },
    replies: [
      {
        author: "半夜修表格",
        handle: "@sheet_fixer",
        postedAt: "今天 11:20",
        body: "这个一定得在榜单里做明显点，不然别人一眼只看最低值。",
      },
      {
        author: "桉树",
        handle: "@eucalyptus_dev",
        postedAt: "今天 11:31",
        body: "对，最好后面都默认写成“0.058x 起”，别再只留单值了。",
      },
    ],
  },
  {
    id: "dasuapi-needs-testing",
    author: "实测等你发车",
    handle: "@bench_first",
    postedAt: "今天 12:02",
    station: "dasuAPI",
    body:
      "dasuAPI 现在是那种“群里口碑偏正向，但结构化信息太少”的典型。入口明确、大家印象不差，可真正拿来比较时，倍率、模型分组、峰值时段表现都还缺。这个站我建议放首页，但旁边一定写清楚“待补测”。",
    tags: ["dasuAPI", "待补测", "首页精选"],
    stats: {
      replies: 15,
      likes: 28,
      bookmarks: 9,
    },
    replies: [
      {
        author: "路过存个档",
        handle: "@cache_copy",
        postedAt: "今天 12:18",
        body: "我支持先挂上，但不要直接写成稳定推荐，不然后面改口会很尴尬。",
      },
    ],
  },
  {
    id: "xinjianya-grok-note",
    author: "公益入口观察员",
    handle: "@free_gate_note",
    postedAt: "今天 13:11",
    station: "星见雅公益",
    body:
      "星见雅公益这次最值得单独标出来的是它现在还能调 Grok。对新手来说，这种免费入口本来就适合先摸模型差异；加上 Grok 之后，关注点就不只是“免费”，而是“有额外模型可以顺手试”。当然，公益入口永远别默认它长期稳。",
    tags: ["星见雅公益", "Grok", "免费入口"],
    stats: {
      replies: 19,
      likes: 49,
      bookmarks: 18,
    },
    replies: [
      {
        author: "小赵先记一下",
        handle: "@memo_zhao",
        postedAt: "今天 13:24",
        body: "这个信息很值钱，很多人还停留在“它只是免费入口”的印象里。",
      },
    ],
  },
  {
    id: "qq-group-collab-call",
    author: "表格催更组",
    handle: "@update_ping",
    postedAt: "今天 14:06",
    body:
      "QQ群这块我建议别只放成联系方式，要明确它是共建入口。谁发现新站、谁看到价格变了、谁跑出高峰报错、谁拿到试用活动，都先往群里丢。后面管理员按“通过 / 修改后通过 / 驳回”收进正式榜单，这样节奏会顺很多。",
    tags: ["QQ群共建", "审核流程", "群维护"],
    stats: {
      replies: 21,
      likes: 63,
      bookmarks: 24,
    },
    replies: [
      {
        author: "南巷口",
        handle: "@south_lane",
        postedAt: "今天 14:19",
        body: "是的，群里负责“线索流”，站里负责“定稿流”，这样分工最清楚。",
      },
      {
        author: "接口搬砖人",
        handle: "@relay_worker",
        postedAt: "今天 14:33",
        body: "后面如果接 GitHub 登录，这条直接能变成站内公告置顶。",
      },
    ],
  },
];

export const demoVideos = [
  {
    title: "首页导览建议",
    subtitle: "30 秒讲清楚怎么先试、怎么看群友备注",
    note: "适合放一个短视频，演示首页主榜单、QQ 群入口和试用入口分别在哪。",
  },
  {
    title: "榜单阅读建议",
    subtitle: "重点解释倍率、模型分组和特殊口径",
    note: "适合录一个榜单阅读说明，尤其讲清楚杂货铺、viptoken 这种同站多口径怎么理解。",
  },
  {
    title: "协作提交流程",
    subtitle: "新站点、纠错和群聊结论怎么进入正式榜单",
    note: "适合录一个 GitHub 协作说明，讲清楚 QQ 群、Discussions、Issues 和管理员审核的分工。",
  },
];

export const collaborationSteps = [
  {
    title: "先发线索",
    description: "新站点、价格变化、试用入口和活动线索，先发 QQ 群或 GitHub Discussions，方便大家先确认口径。",
  },
  {
    title: "再补口径",
    description: "补上倍率、模型组、注册链接、截图、出现时间和适用条件，尽量别只留一句口头描述。",
  },
  {
    title: "最后入表",
    description: "管理员确认后再进正式榜单；适合长期留档的内容走 Issues、PR 或 Discussions 继续沉淀。",
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

export const pendingVerifications = [
  {
    name: "WayX",
    need: "缺高峰期稳定性和模型可用反馈",
  },
  {
    name: "Datopology",
    need: "缺第一手体验，也需要确认是否与妖怪杂货铺属于同域名不同口径",
  },
  {
    name: "dasuAPI",
    need: "缺具体倍率、模型分组和价格截图",
  },
  {
    name: "ai8.my",
    need: "目前只整理到 0.06x，缺模型覆盖和高峰稳定性反馈",
  },
  {
    name: "星见雅公益",
    need: "当前已补可调用 Grok，仍缺额度规则和长期可用性说明",
  },
];

export const contributionTasks = [
  "补一个你用过的站",
  "纠正一条过期价格",
  "提交一个试用入口",
  "补充一条避坑备注",
];

export const featuredColumns = [
  {
    title: "试用入口汇总",
    description: "把试用单、注册送额度、互填邀请这种入口统一整理成一个板块。",
  },
  {
    title: "多倍率说明",
    description: "专门解释 GPT、Claude、plus、pro、Max、日卡/周卡/月卡的不同口径。",
  },
  {
    title: "待补实测清单",
    description: "公开列出哪些站还缺群友测试，让大家知道下一步帮什么最有价值。",
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
  五条悟: "https://qiutian.live",
};

export const prioritizedStationNames = ["虎虎", "Aether", "杂货铺", "dasuAPI"];

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
    summary: "当前走注册链接送额度，历史填表活动先留档。",
    price: "0.12 倍率",
    multiplier: "0.12x",
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
    summary: "GPT 模型按 0.058x 整理，Claude Max 单独是 1.15x，必须拆开看。",
    price: "GPT 0.058 / Claude Max 1.15",
    multiplier: "0.058x 起",
    reason: "非常适合拿来提醒大家：同一站点也可能是不同模型不同收费方式。",
  },
  {
    name: "dasuAPI",
    badge: "待补测",
    summary: "目前社区备注偏正向，价格和稳定性都值得继续补第一手反馈。",
    price: "便宜 / 稳定",
    multiplier: "待补",
    reason: "适合放进首页精选，提醒大家继续补倍率和模型分组信息。",
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
      "API 中转站通常位于你和上游模型服务之间，负责转发请求、统一计费、切换渠道，或者把多个模型接口包装成一种调用方式。它的价值在于接入方便、价格灵活、可做聚合与分发，但同时也意味着你并不是直接面对原始模型提供商。",
  },
  {
    question: "为什么不能只看价格最低的站？",
    answer:
      "低价只说明表面成本低，不代表模型映射真实、计费口径一致、峰值时段稳定。尤其是极低倍率站，更应该核验可用性和群友长期反馈。",
  },
  {
    question: "哪些信息最值得首页先展示？",
    answer:
      "对大多数人最有价值的是：试用入口、倍率口径、是否多档位、模型是否分组、是否需要特殊获取方式，以及一句能帮助决策的社区备注。",
  },
  {
    question: "什么叫多档位或特殊口径？",
    answer:
      "像 plus / pro、GPT / Claude 分组、日卡 / 周卡 / 月卡、TB 搜索入口这类，都不适合强行塞成单一数字，应该单独说明。",
  },
  {
    question: "第一次使用中转站怎么降低风险？",
    answer:
      "优先用试用额度或注册送额，先做低额度验证，再看高峰期稳定性和真实模型表现，确认没问题后再考虑长期充值。",
  },
  {
    question: "QQ 群、Discussions 和 Issues 分别拿来做什么？",
    answer:
      "QQ 群适合先发新线索和实时反馈；Discussions 适合沉淀经验讨论、模型分组和长期口径；Issues 更适合处理明确纠错、缺失链接和待核验条目。这样既能保持讨论活跃，也能把正式数据收口到仓库里。",
  },
  {
    question: "为什么星见雅公益要单独标注 Grok？",
    answer:
      "因为它不只是一个免费入口，还带了额外模型可试的价值。对新手来说，这类信息往往比单纯“免费”更重要；但公益入口依然要单独看额度规则和长期稳定性，不能直接等同于主力站。",
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
    stationHint: "看 Claude 时要单独比组别和价格，像杂货铺 Claude Max、viptoken Claude 组都不能和 GPT 档混看。",
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
    description: "Aether、虎虎这类更像主力候选；星见雅公益这类更像尝鲜入口。不要把“免费可试”直接等同于“长期主力”。",
  },
];

export const stationComparisonRows = [
  {
    name: "虎虎",
    badge: "可试用",
    group: "huhuai.xyz",
    entry: "注册送额度入口",
    packageType: "倍率制",
    status: "试用信息清晰",
    models: "主流模型待群补",
    price: "0.12 倍率",
    multiplier: "0.12x",
    uptime: "缺高峰样本",
    latency: "缺统一样本",
    source: "注册链接 + 历史试用单 + QQ 群反馈",
    verdict: "先试再说",
    note: "当前建议直接走注册链接送额度；以前群里有过填表送 3 美刀，历史入口先保留作记录。",
    advantage: "试用入口清晰，适合新用户优先体验。",
    risk: "实际长期价格和稳定性还要继续看群友反馈。",
  },
  {
    name: "Aether",
    badge: "常用",
    group: "https://to-aether.com/dashboard",
    entry: "Dashboard 直链",
    packageType: "倍率制",
    status: "社区常用，待统一实测",
    models: "主流模型待补录",
    price: "0.263 倍率",
    multiplier: "0.263x",
    uptime: "社区印象偏稳",
    latency: "缺统一样本",
    source: "群友常用口径",
    verdict: "价格还行，口碑偏稳",
    note: "群里口径是比较常用，也可以和老板商量组队压价。",
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
    models: "GPT / Claude Max",
    price: "GPT 0.058 / Claude Max 1.15",
    multiplier: "0.058x 起",
    uptime: "缺公开样本",
    latency: "缺统一样本",
    source: "群友备注",
    verdict: "一定要按模型分开看",
    note: "同一个域名下 GPT 和 Claude Max 的价格差异很大，不适合合成一个单值。",
    advantage: "很适合展示“同站不同模型收费完全不同”的真实情况。",
    risk: "如果只看最低值，很容易误读 Claude 组的实际价格。",
  },
  {
    name: "dasuAPI",
    badge: "待补测",
    group: "https://dasuapi.com",
    entry: "官网入口",
    packageType: "口径待补录",
    status: "已有入口，样本不足",
    models: "模型范围待补录",
    price: "未见稳定公开口径",
    multiplier: "待补录",
    uptime: "社区正向，但缺样本",
    latency: "缺统一样本",
    source: "群友正向备注",
    verdict: "先挂上，等补体验",
    note: "目前备注偏正向，但细节不够。",
    advantage: "站点入口明确，适合继续补数据。",
    risk: "缺少具体倍率与模型组信息。",
  },
  {
    name: "Datopology",
    badge: "未实测",
    group: "https://api.dstopology.com/keys",
    entry: "Keys 页面",
    packageType: "同域关系待确认",
    status: "仅见入口，待确认",
    models: "疑似同域不同口径",
    price: "未见公开口径",
    multiplier: "待补录",
    uptime: "未试",
    latency: "未试",
    source: "群友待试",
    verdict: "先挂名，等第一手体验",
    note: "当前备注是“没试过，你们试试”。",
    advantage: "和妖怪杂货铺同链接，值得确认是否同站不同口径。",
    risk: "完全缺第一手数据，别写成确定推荐。",
  },
  {
    name: "WayX",
    badge: "待补测",
    group: "https://api.aiwxin.com/dashboard",
    entry: "Dashboard 直链",
    packageType: "口径待补录",
    status: "已收录入口",
    models: "模型范围待补录",
    price: "未见公开口径",
    multiplier: "待补录",
    uptime: "缺公开样本",
    latency: "缺统一样本",
    source: "用户最新整理表",
    verdict: "先收录，待继续反馈",
    note: "这次整理里只保留了入口，没有给出明确倍率。",
    advantage: "入口明确，方便后续继续补数据。",
    risk: "没有明确价格和模型可用性数据。",
  },
  {
    name: "ai8.my",
    badge: "低倍率",
    group: "ai8.my",
    entry: "域名入口",
    packageType: "倍率制",
    status: "低倍率待核验",
    models: "模型范围待补录",
    price: "0.06 倍率",
    multiplier: "0.06x",
    uptime: "缺高峰样本",
    latency: "缺统一样本",
    source: "群友整理",
    verdict: "倍率比较亮眼",
    note: "目前整理到的主要是倍率，缺模型组和稳定性反馈。",
    advantage: "适合补进低倍率观察区。",
    risk: "信息不全，别只因为价格低就直接推荐。",
  },
  {
    name: "Liary",
    badge: "卡制",
    group: "https://ai.liaryai.com/",
    entry: "官网入口",
    packageType: "卡制口径待补录",
    status: "仅保留入口",
    models: "模型范围待补录",
    price: "未见公开口径",
    multiplier: "待补录",
    uptime: "缺公开样本",
    latency: "缺统一样本",
    source: "用户最新整理表",
    verdict: "先保留入口",
    note: "当前只保留了站点入口，没有新的价格口径。",
    advantage: "后续补数据后可以继续纳入比较。",
    risk: "目前无法直接横向比较。",
  },
  {
    name: "dazes.cc",
    badge: "注册送额",
    group: "https://cn.dazes.cc",
    entry: "官网登录",
    packageType: "注册送额 / 口径待补录",
    status: "新人友好",
    models: "模型范围待补录",
    price: "注册送额可试",
    multiplier: "待补录",
    uptime: "群友口径稳定",
    latency: "缺统一样本",
    source: "注册送额 + 邀请码",
    verdict: "新人友好",
    note: "注册送 1 美刀，互相填写再得 1 美刀，邀请码备注是 dGSL。",
    advantage: "门槛低，适合拿来先试。",
    risk: "“稳定”目前更多是社区口径，缺少统一实测。",
  },
  {
    name: "viptoken站",
    badge: "低倍率",
    group: "https://www.viptoken.top/dashboard",
    entry: "Dashboard 直链",
    packageType: "模型分组计价",
    status: "已拆 GPT / Claude",
    models: "GPT / Claude",
    price: "GPT 0.2 / Claude 0.15",
    multiplier: "0.15x 起",
    uptime: "缺高峰样本",
    latency: "缺统一样本",
    source: "群友整理",
    verdict: "也需要按模型分开看",
    note: "GPT 模型和 Claude 组是不同倍率，不能简单写成一个统一数字。",
    advantage: "价格分组清楚，适合放进正式榜单做对比。",
    risk: "仍缺高峰稳定性和长期使用反馈。",
  },
  {
    name: "Primdream",
    badge: "待复核",
    group: "https://primdream.store/login",
    entry: "官网登录",
    packageType: "口径待补录",
    status: "仅保留入口",
    models: "模型范围待补录",
    price: "未见公开口径",
    multiplier: "待补录",
    uptime: "缺公开样本",
    latency: "缺统一样本",
    source: "用户最新整理表",
    verdict: "等待新口径",
    note: "当前最新表格没有给出新的倍率或详细备注，先保留入口，等群友补一手样本。",
    advantage: "入口明确，后续更新比较方便。",
    risk: "现在没有足够信息做明确判断。",
  },
  {
    name: "xiaoya-api",
    badge: "待补测",
    group: "https://xiaoya-api.xyz",
    entry: "官网入口",
    packageType: "口径待补录",
    status: "仅保留入口",
    models: "模型范围待补录",
    price: "未见公开口径",
    multiplier: "待补录",
    uptime: "缺公开样本",
    latency: "缺统一样本",
    source: "群友整理",
    verdict: "先收录，等新口径",
    note: "这次用户给的最新整理里没有明确倍率，先保留入口，等后续再补。",
    advantage: "入口明确，后续补数据方便。",
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
    note: "当前已补充为可调用 Grok；免费入口属性仍然成立，但更适合轻量试用和单独关注。",
    advantage: "对新手非常友好，门槛最低，也有额外模型可试。",
    risk: "免费不代表长期稳定，仍要看规则和高峰表现。",
  },
  {
    name: "五条悟",
    badge: "新收录",
    group: "https://qiutian.live",
    entry: "官网入口",
    packageType: "口径待补录",
    status: "新收录入口",
    models: "模型范围待补录",
    price: "未见公开口径",
    multiplier: "待补录",
    uptime: "缺公开样本",
    latency: "缺统一样本",
    source: "用户新增补充",
    verdict: "先收录官网入口",
    note: "qiutian.live 入口已补入，后面继续补价格、倍率和模型细节。",
    advantage: "入口明确，方便后续群友补测。",
    risk: "当前仍缺可直接比较的价格和口径信息。",
  },
];
