/**
 * 情報産業ビジネス部とその配下の課のメンバー情報をデータベースに保存するスクリプト
 */

import { callTauriCommand } from './localFirebase';
import { addOrgMember, getOrgMembers, deleteOrgMember } from './orgApi';
import type { MemberInfo } from '@/components/OrgChart';

// 情報産業ビジネス部のメンバー情報
const itBusinessDeptMembers: MemberInfo[] = [
  {
    name: '関川 潔',
    nameRomaji: 'セキカワ キヨシ',
    title: '部長',
    department: '情報産業ビジネス部',
    extension: '9317265',
    companyPhone: '07041168101',
    email: '0334977265',
    itochuEmail: 'sekikawa-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部長',
    indicator: 'TOKZR',
    location: undefined,
    floorDoorNo: '20F',
    previousName: undefined,
  },
  {
    name: '大元 伸一',
    nameRomaji: 'オオモト シンイチ',
    title: '部長代行',
    department: '情報産業ビジネス部',
    extension: '4328',
    companyPhone: '09080285126',
    email: '4328',
    itochuEmail: 'oomoto-s@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部長代行',
    indicator: 'Tokkv',
    location: '東京 / Tokyo',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '上信 陽太郎',
    nameRomaji: 'ウエノブ ヨウタロウ',
    department: '情報産業ビジネス部',
    companyPhone: '09080285310',
    itochuEmail: 'uenobu-y@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '(兼)情報産業ビジネス部',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '並木 佳子',
    nameRomaji: 'ナミキ ヨシコ',
    department: '情報産業ビジネス部',
    companyPhone: '08095532475',
    itochuEmail: 'hoshino.yoshiko@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '(兼)情報産業ビジネス部',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: '星野 / ホシノ / HOSHINO',
  },
  {
    name: '畔上 沙織',
    nameRomaji: 'アゼガミ サオリ',
    department: '情報産業ビジネス部',
    companyPhone: '08082216112',
    itochuEmail: 'inohana-s@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '(兼)情報産業ビジネス部',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: '猪鼻 / イノハナ / INOHANA',
  },
  {
    name: '岩本 亮介',
    nameRomaji: 'イワモト リョウスケ',
    department: '情報産業ビジネス部',
    companyPhone: '08082216036',
    itochuEmail: 'iwamoto-ry@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '(兼)情報産業ビジネス部',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '牧野 大希',
    nameRomaji: 'マキノ ダイキ',
    department: '情報産業ビジネス部',
    companyPhone: '08082213168',
    itochuEmail: 'makino-daiki@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '(兼)情報産業ビジネス部',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '米原 楓佳',
    nameRomaji: 'ヨネハラ フウカ',
    department: '情報産業ビジネス部',
    companyPhone: '07048095038',
    itochuEmail: 'hara-f@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '(兼)情報産業ビジネス部',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: '原 / ハラ / HARA',
  },
  {
    name: '和田 翔太郎',
    nameRomaji: 'ワダ ショウタロウ',
    department: '情報産業ビジネス部',
    companyPhone: '08082213304',
    itochuEmail: 'wada-sh@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '(兼)情報産業ビジネス部',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
];

// ITビジネス課のメンバー情報
const itBusinessSectionMembers: MemberInfo[] = [
  {
    name: '山田 哲生',
    nameRomaji: 'ヤマダ テツオ',
    title: '課長',
    department: 'ITビジネス課',
    extension: '9313317',
    companyPhone: '08092065215',
    email: '0334973317',
    mobilePhone: '08092065215',
    itochuEmail: 'yamada-t@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課長',
    indicator: 'TOKKV',
    location: '東京 / Tokyo',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '工藤 嘉也',
    nameRomaji: 'クドウ カツヤ',
    title: '課長代行',
    department: 'ITビジネス課',
    extension: '08092065224',
    companyPhone: '08092065224',
    email: '08092065224',
    mobilePhone: '08092065224',
    itochuEmail: 'kudo-kat@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課長代行',
    indicator: 'TOKIV',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '池田 祐亮',
    nameRomaji: 'イケダ ユウスケ',
    department: 'ITビジネス課',
    extension: '9312426',
    companyPhone: '08092065211',
    itochuEmail: 'ikeda-yus@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課',
    indicator: 'TOKIV',
    location: '青山 /',
    floorDoorNo: '-',
    previousName: undefined,
  },
  {
    name: '板橋 望',
    nameRomaji: 'イタバシ ノゾミ',
    department: 'ITビジネス課',
    extension: '9312531',
    companyPhone: '08092065230',
    email: '0334972531',
    mobilePhone: '08092065230',
    itochuEmail: 'maruyama-no@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課',
    indicator: 'TOKIV',
    location: '東京 / TOKYO',
    floorDoorNo: '17F-S7',
    previousName: '丸山 / マルヤマ / MARUYAMA',
  },
  {
    name: '黄 優怡',
    nameRomaji: 'コウ ユウイ',
    department: 'ITビジネス課',
    extension: '9313799',
    companyPhone: '08092065370',
    email: '0334973799',
    mobilePhone: '08092065370',
    itochuEmail: 'huang-yo@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課',
    indicator: 'TOKIV',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '小堀 眞理香',
    nameRomaji: 'コボリ マリカ',
    department: 'ITビジネス課',
    extension: '9313193',
    companyPhone: '08092065214',
    email: '0334974181',
    itochuEmail: 'kobori-m@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課',
    indicator: 'TOKIV',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '末宗 隆志',
    nameRomaji: 'スエムネ タカシ',
    department: 'ITビジネス課',
    extension: '9312443',
    companyPhone: '08092065213',
    email: '08092065213',
    itochuEmail: 'suemune-t@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課',
    indicator: 'TOKIV',
    location: '東京本社 / Tokyo HQ',
    floorDoorNo: '17S',
    previousName: undefined,
  },
  {
    name: '原田 拓弥',
    nameRomaji: 'ハラダ タクヤ',
    department: 'ITビジネス課',
    extension: '7697',
    email: '0334977697',
    mobilePhone: '05031436151',
    itochuEmail: 'harada-ta@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課',
    indicator: 'TOKKV',
    location: '東京 / TOKYO',
    floorDoorNo: '17S7',
    previousName: undefined,
  },
  {
    name: '平田 奈保美',
    nameRomaji: 'ヒラタ ナオミ',
    department: 'ITビジネス課',
    extension: '08092065386',
    companyPhone: '08092065386',
    email: '0334972425',
    itochuEmail: 'hirata-n@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課',
    indicator: 'SCNGV',
    location: '東京 / TOKYO',
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '森谷 将憲',
    nameRomaji: 'モリヤ マサノリ',
    department: 'ITビジネス課',
    extension: '9317698',
    companyPhone: '08092065220',
    email: '81334977698',
    mobilePhone: '818092065220',
    itochuEmail: undefined,
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課',
    indicator: 'TOKIV',
    location: '東京都 / Tokyo',
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '佐川 沙和',
    nameRomaji: 'サガワ サワ',
    department: 'ITビジネス課',
    extension: '9313271',
    companyPhone: '08095532478',
    email: '0334973271',
    itochuEmail: 'ueki-sa@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課',
    indicator: 'TOKIV',
    location: '東京 / TOKYO',
    floorDoorNo: '17FS7',
    previousName: '植木 / ウエキ / UEKI',
  },
  {
    name: '後藤 誠一',
    nameRomaji: 'ゴトウ セイイチ',
    department: 'ITビジネス課',
    extension: '9312533',
    companyPhone: '08092065223',
    email: '0334972533',
    mobilePhone: '08012498033',
    itochuEmail: 'goto-se@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課',
    indicator: 'TOKIV',
    location: undefined,
    floorDoorNo: '17FS7',
    previousName: undefined,
  },
  {
    name: '佐藤 和貴',
    nameRomaji: 'サトウ カズキ',
    department: 'ITビジネス課',
    extension: '9314408',
    companyPhone: '08092065227',
    email: '0334974408',
    mobilePhone: '08092065227',
    itochuEmail: 'sato-kaz@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部ITビジネス課',
    indicator: 'TOKIV',
    location: undefined,
    floorDoorNo: '17F',
    previousName: undefined,
  },
];

// デジタルバリューチェーン課のメンバー情報
const digitalValueChainSectionMembers: MemberInfo[] = [
  {
    name: '小泉 圭巧',
    nameRomaji: 'コイズミ ケイタ',
    title: '課長',
    department: 'デジタルバリューチェーン課',
    extension: '9313890',
    companyPhone: '07041168103',
    email: '0334973890',
    mobilePhone: '07041168103',
    itochuEmail: 'koizumi-ke@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部デジタルバリューチェーン課長',
    indicator: 'TOKIX',
    location: '東京 / Tokyo',
    floorDoorNo: '17',
    previousName: undefined,
  },
  {
    name: '松原 弘貴',
    nameRomaji: 'マツバラ ヒロキ',
    title: '課長代行',
    department: 'デジタルバリューチェーン課',
    extension: '7543',
    companyPhone: '07041168115',
    email: '07041168115',
    itochuEmail: 'matsubara-h@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部デジタルバリューチェーン課長代行',
    indicator: 'TOKIX',
    location: '東京 / Tokyo',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '伊豆田 圭吾',
    nameRomaji: 'イズタ ケイゴ',
    department: 'デジタルバリューチェーン課',
    extension: '9317260',
    companyPhone: '08028677209',
    email: '08028677209',
    itochuEmail: 'izuta-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部デジタルバリューチェーン課',
    indicator: 'TOKIX',
    location: '伊藤忠商事株式会社 / Itochu Corporation',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '川村 秋大',
    nameRomaji: 'カワムラ アキヒロ',
    department: 'デジタルバリューチェーン課',
    extension: '3224',
    companyPhone: '08092065194',
    email: '0334973224',
    mobilePhone: '08092065194',
    itochuEmail: 'kawamura-ak@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部デジタルバリューチェーン課',
    indicator: 'TOKIX',
    location: '東京 / Tokyo',
    floorDoorNo: '17S7',
    previousName: undefined,
  },
  {
    name: '木村 雅史',
    nameRomaji: 'キムラ マサシ',
    department: 'デジタルバリューチェーン課',
    extension: '9317803',
    companyPhone: '08092065200',
    email: '0334977803',
    mobilePhone: '08092065200',
    itochuEmail: 'kimura-mas@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部デジタルバリューチェーン課',
    indicator: 'TOKIX',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '小久保 大暉',
    nameRomaji: 'コクボ ヒロキ',
    department: 'デジタルバリューチェーン課',
    extension: '9312459',
    companyPhone: '08092065191',
    email: '0334972459',
    mobilePhone: '08092065191',
    itochuEmail: 'kokubo-h@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部デジタルバリューチェーン課',
    indicator: 'TOKIX',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '齊藤 篤輝',
    nameRomaji: 'サイトウ アツキ',
    department: 'デジタルバリューチェーン課',
    extension: '9314287',
    companyPhone: '08092065196',
    email: '+819018478216',
    itochuEmail: 'saito-at@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部デジタルバリューチェーン課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '中山 和哉',
    nameRomaji: 'ナカヤマ カズヤ',
    department: 'デジタルバリューチェーン課',
    extension: '7699',
    companyPhone: '08092065210',
    email: '0334977699',
    mobilePhone: '08092065210',
    itochuEmail: 'nakayama-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部デジタルバリューチェーン課',
    indicator: 'TOKIX',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '三澤 崇治',
    nameRomaji: 'ミサワ シユウジ',
    department: 'デジタルバリューチェーン課',
    extension: '2859',
    companyPhone: '08092065193',
    email: '0334972859',
    itochuEmail: 'misawa-s@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部デジタルバリューチェーン課',
    indicator: 'TOKIX',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '酒川 令子',
    nameRomaji: 'サカガワ レイコ',
    department: 'デジタルバリューチェーン課',
    extension: '9313175',
    companyPhone: '08095532489',
    email: '0334973175',
    itochuEmail: 'sakagawa-reiko@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部デジタルバリューチェーン課',
    indicator: 'TOKIX',
    location: '東京本社 / TOKYO',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '境 哲教',
    nameRomaji: 'サカイ テツノリ',
    department: 'デジタルバリューチェーン課',
    extension: '9314337',
    companyPhone: '08092065198',
    email: '0334974337',
    mobilePhone: '08059370948',
    itochuEmail: 'sakai-te@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部デジタルバリューチェーン課',
    indicator: 'TOKIX',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
];

// DXコンサルティング課のメンバー情報
const dxConsultingSectionMembers: MemberInfo[] = [
  {
    name: '山崎 祐',
    nameRomaji: 'ヤマザキ タスク',
    title: '課長',
    department: 'DXコンサルティング課',
    extension: '9313627',
    companyPhone: '08092065181',
    email: '0334973627',
    mobilePhone: '08092065181',
    itochuEmail: 'yamazaki-ta@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部DXコンサルティング課長',
    indicator: 'TOKID',
    location: '東京都港区北青山2-5-1 / Tokyo',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '渡部 晃史',
    nameRomaji: 'ワタベ アキフミ',
    title: '課長代行',
    department: 'DXコンサルティング課',
    extension: '08092065171',
    companyPhone: '08092065171',
    email: '08092065171',
    mobilePhone: '08092065171',
    itochuEmail: 'watabe-a@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部DXコンサルティング課長代行',
    indicator: 'TOKKX',
    location: '東京本社 / Tokyo',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '伊藤 圭祐',
    nameRomaji: 'イトウ ケイスケ',
    department: 'DXコンサルティング課',
    extension: '9312421',
    companyPhone: '07041168109',
    email: '0334972421',
    mobilePhone: '07041168109',
    itochuEmail: 'itoh-ke@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部DXコンサルティング課',
    indicator: 'TOKKQ',
    location: '東京 / Tokyo',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '小峰 徹也',
    nameRomaji: 'コミネ テツヤ',
    department: 'DXコンサルティング課',
    extension: '3697',
    companyPhone: '08092065161',
    email: '0334973697',
    itochuEmail: 'komine-te@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部DXコンサルティング課',
    indicator: 'TOKID',
    location: '東京 / Tokyo',
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '定森 貴大',
    nameRomaji: 'サダモリ タカヒロ',
    department: 'DXコンサルティング課',
    extension: '9314683',
    companyPhone: '08028677197',
    email: '0334974683',
    mobilePhone: '09020190715',
    itochuEmail: 'sadamori-t@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部DXコンサルティング課',
    indicator: 'TOKKQ',
    location: '〒107-8077 東京都港区北青山2-5-1 / 5-1, Kita-Aoyama 2-chome, Minato-ku',
    floorDoorNo: '5F',
    previousName: undefined,
  },
  {
    name: '高山 捷太',
    nameRomaji: 'タカヤマ シヨウタ',
    department: 'DXコンサルティング課',
    extension: '9313669',
    email: '0334973669',
    mobilePhone: '08092065322',
    itochuEmail: 'takayama-sho@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部DXコンサルティング課',
    indicator: 'TOKID',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '田中 悠登',
    nameRomaji: 'タナカ ユウト',
    department: 'DXコンサルティング課',
    extension: '9314838',
    companyPhone: '08092065164',
    email: '0334974838',
    mobilePhone: '08092065164',
    itochuEmail: 'tanaka-yut@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部DXコンサルティング課',
    indicator: 'TOKID',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '丸川 瑛',
    nameRomaji: 'マルカワ アキラ',
    department: 'DXコンサルティング課',
    extension: '9312407',
    companyPhone: '08092065159',
    email: '+81334972407',
    mobilePhone: '+818092065159',
    itochuEmail: 'marukawa-a@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部DXコンサルティング課',
    indicator: 'TOKID',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '並木 佳子',
    nameRomaji: 'ナミキ ヨシコ',
    department: 'DXコンサルティング課',
    extension: '9313225',
    companyPhone: '08095532475',
    email: '0334973225',
    itochuEmail: 'hoshino.yoshiko@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部DXコンサルティング課',
    indicator: 'TOKID',
    location: '東京 / TOKYO',
    floorDoorNo: '17F(S)7',
    previousName: '星野 / ホシノ / HOSHINO',
  },
  {
    name: '戴 心甜',
    nameRomaji: 'ダイ シンティエン',
    department: 'DXコンサルティング課',
    extension: '9313877',
    companyPhone: '08028677207',
    email: '034973877',
    itochuEmail: 'dai-x@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部DXコンサルティング課',
    indicator: 'TOKKQ',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '藤野 祐里佳',
    nameRomaji: 'フジノ ユリカ',
    department: 'DXコンサルティング課',
    extension: '9313417',
    companyPhone: '08092065170',
    email: '0334973417',
    mobilePhone: '08092065170',
    itochuEmail: 'fujino-y@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '情報産業ビジネス部DXコンサルティング課',
    indicator: 'TOKID',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '永井 里枝',
    nameRomaji: 'ナガイ リエ',
    department: 'DXコンサルティング課',
    extension: '9317027',
    companyPhone: '09080285111',
    email: '0334977027',
    itochuEmail: undefined,
    teams: 'Teams',
    employeeType: '社員外 /派遣社員 / Temp Staff',
    roleName: 'DXコンサルティング課',
    indicator: 'TOKID',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
];

/**
 * 組織IDを取得（汎用関数）
 */
async function getOrganizationId(orgName: string | string[]): Promise<string | null> {
  try {
    const tree = await callTauriCommand('get_org_tree', { rootId: null });
    
    if (!tree || tree.length === 0) {
      return null;
    }
    
    const searchNames = Array.isArray(orgName) ? orgName : [orgName];
    
    // 組織を探す（再帰的に検索）
    function findOrganization(org: any): any {
      const orgData = org.organization || org;
      if (!orgData || !orgData.name) {
        return null;
      }
      
      for (const name of searchNames) {
        if (orgData.name === name || orgData.name.includes(name) || name.includes(orgData.name)) {
          return org;
        }
      }
      
      if (org.children) {
        for (const child of org.children) {
          const found = findOrganization(child);
          if (found) return found;
        }
      }
      return null;
    }
    
    for (const root of tree) {
      const foundOrg = findOrganization(root);
      if (foundOrg) {
        const orgData = foundOrg.organization || foundOrg;
        return orgData.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`組織「${Array.isArray(orgName) ? orgName.join(' / ') : orgName}」の取得に失敗しました:`, error);
    return null;
  }
}

/**
 * メンバー情報を保存（汎用関数）
 */
async function saveMembersForOrganization(organizationId: string, members: MemberInfo[], orgName: string) {
  try {
    // 既存のメンバーを取得
    try {
      const existingMembers = await getOrgMembers(organizationId);
      console.log(`${orgName} - 既存のメンバー数: ${existingMembers.length}`);
      
      // 既存のメンバーを削除
      for (const member of existingMembers) {
        try {
          await deleteOrgMember(member.id);
          console.log(`${orgName} - 既存メンバー ${member.name} を削除しました`);
        } catch (error: any) {
          console.warn(`${orgName} - 既存メンバー ${member.name} の削除に失敗しました:`, error.message);
        }
      }
    } catch (error: any) {
      console.warn(`${orgName} - 既存メンバーの取得に失敗しました（初回実行の可能性があります）:`, error.message);
    }
    
    // 各メンバーを保存
    for (const member of members) {
      try {
        await addOrgMember(organizationId, member);
        console.log(`✅ ${orgName} - ${member.name} を保存しました`);
      } catch (error: any) {
        console.error(`❌ ${orgName} - ${member.name} の保存に失敗しました:`, error.message);
      }
    }
    
    console.log(`✅ ${orgName} - 全てのメンバー情報の保存が完了しました`);
  } catch (error: any) {
    console.error(`❌ ${orgName} - メンバー情報の保存に失敗しました:`, error);
    throw error;
  }
}

/**
 * 情報産業ビジネス部とその配下の課のメンバー情報を保存
 */
export async function saveItBusinessMembers() {
  try {
    console.log('情報産業ビジネス部とその配下の課のメンバー情報を保存します...\n');
    
    // 情報産業ビジネス部の組織IDを取得
    const deptId = await getOrganizationId(['情報産業ビジネス部', 'Information Technology Business Department']);
    if (!deptId) {
      throw new Error('情報産業ビジネス部が見つかりません');
    }
    
    // 情報産業ビジネス部のメンバーを保存
    await saveMembersForOrganization(deptId, itBusinessDeptMembers, '情報産業ビジネス部');
    
    // ITビジネス課の組織IDを取得
    const itBusinessSectionId = await getOrganizationId(['ITビジネス課', 'IT Business Section']);
    if (itBusinessSectionId) {
      await saveMembersForOrganization(itBusinessSectionId, itBusinessSectionMembers, 'ITビジネス課');
    } else {
      console.warn('⚠️ ITビジネス課が見つかりませんでした');
    }
    
    // デジタルバリューチェーン課の組織IDを取得
    const digitalValueChainSectionId = await getOrganizationId(['デジタルバリューチェーン課', 'Digital Value Chain Section']);
    if (digitalValueChainSectionId) {
      await saveMembersForOrganization(digitalValueChainSectionId, digitalValueChainSectionMembers, 'デジタルバリューチェーン課');
    } else {
      console.warn('⚠️ デジタルバリューチェーン課が見つかりませんでした');
    }
    
    // DXコンサルティング課の組織IDを取得
    const dxConsultingSectionId = await getOrganizationId(['DXコンサルティング課', 'DX Consulting Section']);
    if (dxConsultingSectionId) {
      await saveMembersForOrganization(dxConsultingSectionId, dxConsultingSectionMembers, 'DXコンサルティング課');
    } else {
      console.warn('⚠️ DXコンサルティング課が見つかりませんでした');
    }
    
    console.log('\n✅ 全てのメンバー情報の保存が完了しました');
  } catch (error: any) {
    console.error('❌ メンバー情報の保存に失敗しました:', error);
    throw error;
  }
}

// スクリプトとして実行する場合
if (typeof window === 'undefined') {
  // Node.js環境での実行
  saveItBusinessMembers().catch(console.error);
}
