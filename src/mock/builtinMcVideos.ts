import type { MockVideo } from '../types'
import { generateMcThumbDataUrl } from './generators'

interface McSpec {
  id: string
  title: string
  channel: string
  views: number
  durationSec: number
  publishedHoursAgo: number
  danmaku?: number
}

// 我的世界分区内置干扰视频 —— 标题风格贴近 MC 区真实生态(生存/红石/建筑/速通/模组/整活),
// 频道名均为虚构;封面为像素方块风程序生成。用于「我的世界」分区模式下的封面竞争测试。
const SPECS: McSpec[] = [
  { id: 'mc01', title: '我在MC里复刻了整座故宫,整整两年', channel: '像素营造署', views: 1860000, durationSec: 1421, publishedHoursAgo: 52 },
  { id: 'mc02', title: '红石计算机:从零搭建一台8位CPU', channel: '红石实验室', views: 942000, durationSec: 1104, publishedHoursAgo: 120 },
  { id: 'mc03', title: 'MC生存100天,我把下界改成了花园', channel: '方块生存笔记', views: 3270000, durationSec: 1628, publishedHoursAgo: 74, danmaku: 62000 },
  { id: 'mc04', title: '1.21版本必玩的10个模组,文件都打包好了', channel: '模组精选柜', views: 438000, durationSec: 815, publishedHoursAgo: 28 },
  { id: 'mc05', title: '不挖矿通关MC?全过程教科书级操作', channel: '极限挑战组', views: 1210000, durationSec: 1330, publishedHoursAgo: 190 },
  { id: 'mc06', title: '我的世界:5个离谱到举报都没用的种子', channel: '种子研究所', views: 567000, durationSec: 642, publishedHoursAgo: 66 },
  { id: 'mc07', title: '两分钟学会全自动西瓜农场,新手友好', channel: '红石实验室', views: 296000, durationSec: 158, publishedHoursAgo: 12 },
  { id: 'mc08', title: '现代别墅建筑教程,从地基到屋顶', channel: '像素营造署', views: 152000, durationSec: 1006, publishedHoursAgo: 300 },
  { id: 'mc09', title: '打进末地只用5分58秒?逐帧解析新纪录', channel: '速通切片机', views: 892000, durationSec: 722, publishedHoursAgo: 40 },
  { id: 'mc10', title: '联机整活:趁朋友下线把基地全改成羊毛', channel: '联机小队', views: 678000, durationSec: 918, publishedHoursAgo: 96, danmaku: 14000 },
  { id: 'mc11', title: '盘点MC十年来的十大改动,老玩家泪目', channel: '方块编年史', views: 445000, durationSec: 1044, publishedHoursAgo: 420 },
  { id: 'mc12', title: '在MC里开一家披萨店是什么体验?', channel: '像素营造署', views: 723000, durationSec: 867, publishedHoursAgo: 130 },
  { id: 'mc13', title: '生存第1天就被苦力怕炸家?重开!', channel: '方块生存笔记', views: 268000, durationSec: 662, publishedHoursAgo: 20 },
  { id: 'mc14', title: '用命令方块做出一个完整RPG地图', channel: '命令方块大师', views: 389000, durationSec: 1183, publishedHoursAgo: 260 },
  { id: 'mc15', title: '第一人称走遍主世界一万格,从海岸到冰原', channel: '旅行的史蒂夫', views: 956000, durationSec: 2045, publishedHoursAgo: 520 },
  { id: 'mc16', title: '20年老玩家才认识的MC冷知识', channel: '方块编年史', views: 1340000, durationSec: 733, publishedHoursAgo: 88, danmaku: 28000 },
  { id: 'mc17', title: '教你做一个室友绝对找不到的隐藏基地', channel: '红石实验室', views: 512000, durationSec: 587, publishedHoursAgo: 150 },
  { id: 'mc18', title: 'MC里最没用的10种方块,第1名毫无争议', channel: '方块百科组', views: 233000, durationSec: 498, publishedHoursAgo: 34 },
  { id: 'mc19', title: '挖到钻石的正确姿势,新手千万别乱挖', channel: '方块生存笔记', views: 347000, durationSec: 419, publishedHoursAgo: 46 },
  { id: 'mc20', title: '把MC玩成赛车游戏?这张地图绝了', channel: '模组精选柜', views: 188000, durationSec: 536, publishedHoursAgo: 72 },
  { id: 'mc21', title: '生存实验:不出洞穴能活几天?', channel: '极限挑战组', views: 874000, durationSec: 1219, publishedHoursAgo: 240, danmaku: 17000 },
  { id: 'mc22', title: '一格宽的基地你见过吗?全套自动化', channel: '像素营造署', views: 629000, durationSec: 892, publishedHoursAgo: 180 },
  { id: 'mc23', title: '新手到高手的7个习惯,最后一条最重要', channel: '新手村长', views: 91000, durationSec: 668, publishedHoursAgo: 9 },
  { id: 'mc24', title: 'MC音效有多讲究?逐个拆给你听', channel: '方块百科组', views: 156000, durationSec: 775, publishedHoursAgo: 310 },
]

function toMockVideo(spec: McSpec): MockVideo {
  return {
    id: spec.id,
    title: spec.title,
    channel: spec.channel,
    views: spec.views,
    danmaku: spec.danmaku ?? Math.round(spec.views * 0.02),
    durationSec: spec.durationSec,
    publishedHoursAgo: spec.publishedHoursAgo,
    thumbSrcUrl: builtinMcThumb(spec.id, spec.title),
    custom: false,
    enabled: true,
  }
}

export const BUILTIN_MC_MOCK_VIDEOS: MockVideo[] = SPECS.map(toMockVideo)

export function builtinMcThumb(id: string, title: string): string {
  return generateMcThumbDataUrl(`builtin-mc:${id}`, title)
}
