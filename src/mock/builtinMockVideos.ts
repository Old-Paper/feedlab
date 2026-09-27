import type { MockVideo } from '../types'
import { generateMockThumbDataUrl } from './generators'

interface BuiltinSpec {
  id: string
  title: string
  channel: string
  views: number
  durationSec: number
  publishedHoursAgo: number
  danmaku?: number
}

// 30 个风格差异明显的干扰视频。标题覆盖游戏/科技/生活/美食/音乐/科普/挑战等,
// 长度、标点、数字使用各不相同;封面为程序生成,不使用任何真实创作者素材。
const SPECS: BuiltinSpec[] = [
  { id: 'm01', title: '【硬核】CPU到底是怎么造出来的?从沙子到芯片', channel: '极客车间', views: 1840000, durationSec: 1123, publishedHoursAgo: 52 },
  { id: 'm02', title: '一晚上速成Python?我劝你冷静一下', channel: '代码宇宙', views: 326000, durationSec: 754, publishedHoursAgo: 190 },
  { id: 'm03', title: '2026年了,机械键盘还值得买吗?这把98配列真的香', channel: '桌面物志', views: 89200, durationSec: 621, publishedHoursAgo: 30 },
  { id: 'm04', title: '看完这条视频,你就彻底懂了量子纠缠', channel: '赛先生', views: 2670000, durationSec: 968, publishedHoursAgo: 340 },
  { id: 'm05', title: '把Windows塞进手机?亲测三种方案,最后一个离谱', channel: '数码拆解局', views: 154000, durationSec: 887, publishedHoursAgo: 76 },
  { id: 'm06', title: '在岩浆海上生存100天,我终于悟了', channel: '方块生存笔记', views: 3480000, durationSec: 1502, publishedHoursAgo: 120 },
  { id: 'm07', title: '全服第一把红剑?开箱实录全程高能', channel: '阿伟游戏日志', views: 765000, durationSec: 655, publishedHoursAgo: 26 },
  { id: 'm08', title: '这游戏有多离谱?NPC会记仇一辈子', channel: '游戏显微镜', views: 1230000, durationSec: 542, publishedHoursAgo: 210 },
  { id: 'm09', title: '速通世界纪录被刷新!4分11秒看完直接跪了', channel: 'Speedrun研究所', views: 219000, durationSec: 503, publishedHoursAgo: 15 },
  { id: 'm10', title: '和朋友联机种田100小时之后,我们绝交了', channel: '联机小队', views: 968000, durationSec: 1310, publishedHoursAgo: 420 },
  { id: 'm11', title: '独居第365天,我把出租屋改成了这个样子', channel: '慢速生活', views: 1870000, durationSec: 1044, publishedHoursAgo: 600 },
  { id: 'm12', title: '50块钱在夜市能吃到什么?挑战开始', channel: '街头干饭王', views: 534000, durationSec: 733, publishedHoursAgo: 9 },
  { id: 'm13', title: '凌晨4点的菜市场,比你想的更卷', channel: '人间观察所', views: 2130000, durationSec: 1211, publishedHoursAgo: 96 },
  { id: 'm14', title: '搬去大理的第30天,我后悔了吗?', channel: '数字游民日记', views: 158000, durationSec: 689, publishedHoursAgo: 48 },
  { id: 'm15', title: '复刻米其林牛排?成本只要38块钱', channel: '厨房炼金术', views: 4520000, durationSec: 845, publishedHoursAgo: 260, danmaku: 86000 },
  { id: 'm16', title: '试吃全网最辣的泡面,警告:千万别模仿', channel: '辣度研究所', views: 723000, durationSec: 592, publishedHoursAgo: 33, danmaku: 21000 },
  { id: 'm17', title: '用一把吉他还原100首金曲?第37首来了', channel: '弦上时光', views: 342000, durationSec: 428, publishedHoursAgo: 150 },
  { id: 'm18', title: '这首歌的鼓手到底有多强?逐帧解析', channel: '耳朵经济', views: 126000, durationSec: 911, publishedHoursAgo: 88 },
  { id: 'm19', title: '十年前的神剧,现在看依然封神', channel: '影视考古队', views: 1650000, durationSec: 1102, publishedHoursAgo: 520 },
  { id: 'm20', title: '为什么高铁上没有安全带?答案没那么简单', channel: '万物研究所', views: 2870000, durationSec: 678, publishedHoursAgo: 410, danmaku: 54000 },
  { id: 'm21', title: '你的手机是怎么知道你想买什么的?', channel: '数据漫游指南', views: 894000, durationSec: 826, publishedHoursAgo: 175 },
  { id: 'm22', title: '一座桥的自我修养:港珠澳大桥有多难修?', channel: '工程巨物', views: 3120000, durationSec: 1358, publishedHoursAgo: 700 },
  { id: 'm23', title: '用300个快递箱做一台电脑机箱?还真点亮了', channel: '手工废人', views: 678000, durationSec: 967, publishedHoursAgo: 62, danmaku: 12000 },
  { id: 'm24', title: '挑战24小时不说谎,第3小时就崩了', channel: '社会实验所', views: 1980000, durationSec: 1120, publishedHoursAgo: 240 },
  { id: 'm25', title: '我被300条弹幕支配了一整天', channel: '互动实验室', views: 445000, durationSec: 1005, publishedHoursAgo: 18, danmaku: 32000 },
  { id: 'm26', title: '零基础跑完半马,9条血泪教训全在这里', channel: '跑步日志', views: 231000, durationSec: 879, publishedHoursAgo: 300 },
  { id: 'm27', title: '每周打球3小时,一年后身体有什么变化?', channel: '体育课代表', views: 519000, durationSec: 745, publishedHoursAgo: 380 },
  { id: 'm28', title: 'AI帮我上了7天班,结果老板把我开了?', channel: '未来打工人', views: 2760000, durationSec: 934, publishedHoursAgo: 45, danmaku: 47000 },
  { id: 'm29', title: '显微镜下的过期牛奶,画面过于震撼', channel: '显微世界', views: 1050000, durationSec: 611, publishedHoursAgo: 130 },
  { id: 'm30', title: '花3000块买回一台1998年的笔记本,值吗?', channel: '电子古董店', views: 367000, durationSec: 1012, publishedHoursAgo: 205 },
]

function toMockVideo(spec: BuiltinSpec): MockVideo {
  return {
    id: spec.id,
    title: spec.title,
    channel: spec.channel,
    views: spec.views,
    danmaku: spec.danmaku ?? Math.round(spec.views * 0.018),
    durationSec: spec.durationSec,
    publishedHoursAgo: spec.publishedHoursAgo,
    custom: false,
    enabled: true,
  }
}

export const BUILTIN_MOCK_VIDEOS: MockVideo[] = SPECS.map(toMockVideo)

/** Inline generated cover for a builtin mock (deterministic per id). */
export function builtinMockThumb(id: string, title: string): string {
  return generateMockThumbDataUrl(`builtin:${id}`, title)
}
