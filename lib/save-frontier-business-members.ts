/**
 * フロンティアビジネス部とその配下の課のメンバー情報をデータベースに保存するスクリプト
 */

import { callTauriCommand } from './localFirebase';
import { addOrgMember, getOrgMembers, deleteOrgMember } from './orgApi';
import type { MemberInfo } from '@/components/OrgChart';

// フロンティアビジネス部のメンバー情報
const frontierBusinessDeptMembers: MemberInfo[] = [
  {
    name: '髙部 公彦',
    nameRomaji: 'タカベ キミヒコ',
    title: '部長',
    department: 'フロンティアビジネス部',
    extension: '9312464',
    companyPhone: '07041168124',
    email: '0334972464',
    itochuEmail: 'takabe-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部長',
    indicator: 'TOKIF',
    location: '伊藤忠商事 / ITOCHU Corporation',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '窪田 隆平',
    nameRomaji: 'クボタ リュウヘイ',
    department: 'フロンティアビジネス部',
    companyPhone: '09080285315',
    itochuEmail: 'kubota-ry@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '(兼)フロンティアビジネス部',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '酒井 亮',
    nameRomaji: 'サカイ リヨウ',
    department: 'フロンティアビジネス部',
    extension: '7301',
    companyPhone: '07041168122',
    email: '0334977301',
    itochuEmail: 'sakai-r@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部',
    indicator: 'TOKFR',
    location: '港区北青山2-5-1 / 5-1 Kita-Aoyama 2-chome, MInatoku,Tokyo',
    floorDoorNo: '17',
    previousName: undefined,
  },
  {
    name: '中尾 久仁央樹',
    nameRomaji: 'ナカオ クニオキ',
    department: 'フロンティアビジネス部',
    extension: '34972758',
    companyPhone: '08028677299',
    email: '0334974152',
    mobilePhone: '08028677299',
    itochuEmail: 'nakao-ku@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部',
    indicator: 'TOKIH',
    location: '東京 / TOKYO',
    floorDoorNo: '17',
    previousName: undefined,
  },
  {
    name: '久田 尚子',
    nameRomaji: 'ヒサタ ナオコ',
    department: 'フロンティアビジネス部',
    companyPhone: '08095532505',
    itochuEmail: 'kubota-na@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '(兼)フロンティアビジネス部',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
];

// 衛星・IPコンテンツビジネス課のメンバー情報
const satelliteIpContentBusinessSectionMembers: MemberInfo[] = [
  {
    name: '荒巻 裕史',
    nameRomaji: 'アラマキ ヒロシ',
    title: '課長',
    department: '衛星・IPコンテンツビジネス課',
    extension: '9312408',
    companyPhone: '08095532509',
    email: '+81334972408',
    mobilePhone: '+819071607178',
    itochuEmail: 'aramaki-h@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課長',
    indicator: 'TOKIP',
    location: '東京 / Tokyo',
    floorDoorNo: '17F S3',
    previousName: undefined,
  },
  {
    name: '稲留 光',
    nameRomaji: 'イナドメ ヒカル',
    title: '課長代行',
    department: '衛星・IPコンテンツビジネス課',
    extension: '4170',
    companyPhone: '08095532516',
    email: '0334974170',
    itochuEmail: 'inadome-h@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課長代行',
    indicator: 'TOKNU',
    location: '東京（17F） / Tokyo office',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '尾曽 幸平',
    nameRomaji: 'オソ コウヘイ',
    department: '衛星・IPコンテンツビジネス課',
    extension: '3077',
    companyPhone: '08095532515',
    email: '0334973077',
    itochuEmail: 'oso-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '阪田 将輝',
    nameRomaji: 'サカタ マサキ',
    department: '衛星・IPコンテンツビジネス課',
    extension: '4833',
    companyPhone: '08092065232',
    email: '0334974833',
    mobilePhone: '08092065232',
    itochuEmail: 'sakata-m@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: undefined,
    floorDoorNo: '17S3',
    previousName: undefined,
  },
  {
    name: '谷川 真人',
    nameRomaji: 'タニガワ マサト',
    department: '衛星・IPコンテンツビジネス課',
    extension: '9312615',
    companyPhone: '08092065363',
    email: '0334972615',
    itochuEmail: 'tanigawa-m@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '中江 瞭介',
    nameRomaji: 'ナカエ リヨウスケ',
    department: '衛星・IPコンテンツビジネス課',
    companyPhone: '08092065239',
    itochuEmail: 'nakae-r@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '(兼)フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '中村 優作',
    nameRomaji: 'ナカムラ ユウサク',
    department: '衛星・IPコンテンツビジネス課',
    extension: '2484',
    companyPhone: '08092065231',
    email: '0334972484',
    mobilePhone: '08092065231',
    itochuEmail: 'nakamura-yusa@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: '東京 / Tokyo',
    floorDoorNo: '17F 17S7',
    previousName: undefined,
  },
  {
    name: '福島 万有',
    nameRomaji: 'フクシマ マユ',
    department: '衛星・IPコンテンツビジネス課',
    extension: '3934',
    companyPhone: '08092065237',
    email: '0334973934',
    itochuEmail: 'kobayashi-may@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: undefined,
    floorDoorNo: undefined,
    previousName: '小林 / コバヤシ / KOBAYASHI',
  },
  {
    name: '藤巻 亮太',
    nameRomaji: 'フジマキ リヨウタ',
    department: '衛星・IPコンテンツビジネス課',
    extension: '9312446',
    companyPhone: '07041168141',
    email: '0334972446',
    mobilePhone: '07041168141',
    itochuEmail: 'fujimaki-r@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: '東京 / Tokyo',
    floorDoorNo: '17S3',
    previousName: undefined,
  },
  {
    name: '牧尾 貴宏',
    nameRomaji: 'マキオ タカヒロ',
    department: '衛星・IPコンテンツビジネス課',
    extension: '9317485',
    companyPhone: '08092065233',
    email: '0334977485',
    mobilePhone: '08092065233',
    itochuEmail: 'makio-ta@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: '107-8077 東京都港区北青山2-5-1 / 5-1, Kitaaoyama 2-chome, Minato-ku, Tokyo 107-8077, Japan',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '松田 萌香',
    nameRomaji: 'マツダ モエカ',
    department: '衛星・IPコンテンツビジネス課',
    extension: '9318685',
    companyPhone: '08024001178',
    email: '0334978685',
    itochuEmail: 'matsuda-mo@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: 'TOKYO / TOKYO',
    floorDoorNo: '17S3',
    previousName: undefined,
  },
  {
    name: '吉澤 樹',
    nameRomaji: 'ヨシザワ イツキ',
    department: '衛星・IPコンテンツビジネス課',
    extension: '2479',
    companyPhone: '08095532513',
    email: '0334972479',
    itochuEmail: 'yoshizawa-i@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: '東京本社 /',
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '小池 真里奈',
    nameRomaji: 'コイケ マリナ',
    department: '衛星・IPコンテンツビジネス課',
    extension: '9312612',
    companyPhone: '08095419646',
    email: '0334972612',
    itochuEmail: 'kamiya-ma@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: '外苑前 / gaiemmae',
    floorDoorNo: '17',
    previousName: '神谷 / カミヤ / KAMIYA',
  },
  {
    name: '野口 みゆき',
    nameRomaji: 'ノグチ ミユキ',
    department: '衛星・IPコンテンツビジネス課',
    extension: '9317660',
    companyPhone: '08095532519',
    email: '0334977660',
    itochuEmail: 'noguchi-mi@itochu.co.jp',
    teams: 'Teams',
    employeeType: '嘱託(継続雇用) /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: undefined,
    floorDoorNo: '17S7',
    previousName: undefined,
  },
  {
    name: '種倉 平晃',
    nameRomaji: 'タネクラ ナルアキ',
    department: '衛星・IPコンテンツビジネス課',
    extension: '0334972456',
    email: '08010377007',
    itochuEmail: 'tanekura-n@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '王 青',
    nameRomaji: 'オウ セイ',
    department: '衛星・IPコンテンツビジネス課',
    extension: '9312491',
    companyPhone: '08095532514',
    email: '0334972491',
    itochuEmail: 'wang-qing@itochu.co.jp',
    teams: 'Teams',
    employeeType: '社員外 /派遣社員 / Temp Staff',
    roleName: '衛星・IPコンテンツビジネス課',
    indicator: 'TOKIP',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
];

// インキュベーション推進課のメンバー情報
const incubationPromotionSectionMembers: MemberInfo[] = [
  {
    name: '倉島 慶',
    nameRomaji: 'クラシマ ケイ',
    title: '課長',
    department: 'インキュベーション推進課',
    extension: '9312403',
    companyPhone: '08092065269',
    email: '0334972403',
    mobilePhone: '08092065269',
    itochuEmail: 'kurashima-ke@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部インキュベーション推進課長',
    indicator: 'TOKII',
    location: '東京本社 /',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '笹生 朋樹アイザック',
    nameRomaji: 'サソウ トモキ アイザツク',
    title: '課長代行',
    department: 'インキュベーション推進課',
    extension: '3573',
    email: '0334973573',
    mobilePhone: '+6281554807316',
    itochuEmail: 'saso-t@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部インキュベーション推進課長代行',
    indicator: 'TOKII',
    location: '外苑前本社 / Gaienmae',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '金原 武尊',
    nameRomaji: 'カナハラ タケル',
    department: 'インキュベーション推進課',
    extension: '9314949',
    companyPhone: '08092065278',
    email: '08092065278',
    itochuEmail: 'kanahara-t@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部インキュベーション推進課',
    indicator: 'TOKII',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '佐藤 由佳',
    nameRomaji: 'サトウ ユカ',
    department: 'インキュベーション推進課',
    extension: '9317251',
    companyPhone: '08092065277',
    email: '0334977251',
    mobilePhone: '08092065277',
    itochuEmail: 'nakamatsu-y@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部インキュベーション推進課',
    indicator: 'TOKII',
    location: '17F / 17F',
    floorDoorNo: '17F S5',
    previousName: '中松 / ナカマツ / NAKAMATSU',
  },
  {
    name: '東馬 健太郎',
    nameRomaji: 'トウマ ケンタロウ',
    department: 'インキュベーション推進課',
    extension: '9312918',
    companyPhone: '07041168126',
    email: '+81334972918',
    mobilePhone: '07041168126',
    itochuEmail: 'toma-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部インキュベーション推進課',
    indicator: 'TOKII',
    location: '東京 / TOKYO',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '野中 丈弘',
    nameRomaji: 'ノナカ タケヒロ',
    department: 'インキュベーション推進課',
    extension: '9317457',
    companyPhone: '09056638333',
    email: '+819056638333',
    itochuEmail: 'nonaka-t@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部インキュベーション推進課',
    indicator: 'TOKNW',
    location: '港区北青山２の５の１ /',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '堀田 峻平',
    nameRomaji: 'ホリタ シュンペイ',
    department: 'インキュベーション推進課',
    extension: '9313628',
    companyPhone: '08092065271',
    email: '0334973628',
    mobilePhone: '08092065271',
    itochuEmail: 'horita-s@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部インキュベーション推進課',
    indicator: 'TOKII',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '佐々木 尊正',
    nameRomaji: 'ササキ タカマサ',
    department: 'インキュベーション推進課',
    extension: '9313631',
    email: '0334973631',
    mobilePhone: '09027622780',
    itochuEmail: 'sasaki-t@itochu.co.jp',
    teams: 'Teams',
    employeeType: '嘱託 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部インキュベーション推進課',
    indicator: 'TOKII',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '直井 豊美',
    nameRomaji: 'ナオイ トヨミ',
    department: 'インキュベーション推進課',
    extension: '9312402',
    companyPhone: '08095532482',
    email: '0334972402',
    itochuEmail: 'naoi-toyomi1@itochu.co.jp',
    teams: 'Teams',
    employeeType: '社員外 /派遣社員 / Temp Staff',
    roleName: 'インキュベーション推進課',
    indicator: 'TOKII',
    location: undefined,
    floorDoorNo: '17S3',
    previousName: undefined,
  },
];

// 医療・ヘルスケアビジネス課のメンバー情報
const healthcareBusinessSectionMembers: MemberInfo[] = [
  {
    name: '児玉 裕幸',
    nameRomaji: 'コダマ ヒロユキ',
    title: '課長',
    department: '医療・ヘルスケアビジネス課',
    extension: '9312627',
    companyPhone: '07041168130',
    email: '0334972627',
    mobilePhone: '09035266839',
    itochuEmail: 'kodama-h@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課長',
    indicator: 'TOKIH',
    location: '日本/東京 / Japan, Tokyo',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '清村 篤志',
    nameRomaji: 'キヨムラ アツシ',
    title: '課長代行',
    department: '医療・ヘルスケアビジネス課',
    extension: '9312423',
    companyPhone: '08092065187',
    email: '0334972423',
    mobilePhone: '09093827542',
    itochuEmail: 'kiyomura-a@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課長代行',
    indicator: 'TOKIH',
    location: '東京青山 / 2-5-1 Kita-Aoyama, Minato-ku, Tokyo Japan',
    floorDoorNo: '17 S03',
    previousName: undefined,
  },
  {
    name: '石川 凌士',
    nameRomaji: 'イシカワ リヨウジ',
    department: '医療・ヘルスケアビジネス課',
    extension: '0334972357',
    email: '0334972357',
    itochuEmail: 'ishikawa-ry@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: 'TOKIH',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '磯部 凪',
    nameRomaji: 'イソベ ナギ',
    department: '医療・ヘルスケアビジネス課',
    extension: '9313594',
    companyPhone: '09080285313',
    email: '0334973594',
    itochuEmail: 'isobe-n@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: 'TOKIH',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '黒谷 京叶',
    nameRomaji: 'クロタニ キョウカ',
    department: '医療・ヘルスケアビジネス課',
    extension: '08092065186',
    companyPhone: '08092065186',
    email: '08092065186',
    mobilePhone: '08092065186',
    itochuEmail: 'kurotani-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: 'IH',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '酒井 亮',
    nameRomaji: 'サカイ リヨウ',
    department: '医療・ヘルスケアビジネス課',
    companyPhone: '07041168122',
    itochuEmail: 'sakai-r@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '(兼)フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '傳谷 麗二',
    nameRomaji: 'デンヤ レイジ',
    department: '医療・ヘルスケアビジネス課',
    extension: '2793',
    companyPhone: '07041168137',
    email: '070411168137',
    mobilePhone: '07041168137',
    itochuEmail: 'denya-r@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: 'KF',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '中尾 久仁央樹',
    nameRomaji: 'ナカオ クニオキ',
    department: '医療・ヘルスケアビジネス課',
    companyPhone: '08028677299',
    itochuEmail: 'nakao-ku@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '(兼)フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '深川 麻里香',
    nameRomaji: 'フカガワ マリカ',
    department: '医療・ヘルスケアビジネス課',
    extension: '9312406',
    email: '0334972406',
    mobilePhone: '07041168132',
    itochuEmail: 'arai-ma@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: 'TOKIH',
    location: '東京本社 /',
    floorDoorNo: '17S7',
    previousName: '荒井 / アライ / ARAI',
  },
  {
    name: '舟越 慧',
    nameRomaji: 'フナコシ ケイ',
    department: '医療・ヘルスケアビジネス課',
    extension: '2085',
    companyPhone: '09080285109',
    email: '0334972085',
    itochuEmail: 'funakoshi-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: 'TOKIH',
    location: '東京 / Tokyo',
    floorDoorNo: '11F',
    previousName: undefined,
  },
  {
    name: '古川 智也',
    nameRomaji: 'フルカワ トモヤ',
    department: '医療・ヘルスケアビジネス課',
    extension: '0334972364',
    companyPhone: '08092065183',
    email: '08092065183',
    mobilePhone: '08092065183',
    itochuEmail: 'furukawa-to@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: 'TOKIH',
    location: '東京 / Tokyo',
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '三谷 響子',
    nameRomaji: 'ミタニ キヨウコ',
    department: '医療・ヘルスケアビジネス課',
    extension: '2357',
    email: '0334974181',
    itochuEmail: 'masuda-ky@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課(育児休業)',
    indicator: '-',
    location: '東京 / TOKYO',
    floorDoorNo: undefined,
    previousName: '増田 / マスダ / MASUDA',
  },
  {
    name: '小原 有希',
    nameRomaji: 'オハラ ユキ',
    department: '医療・ヘルスケアビジネス課',
    extension: '931',
    email: '03',
    itochuEmail: 'kimura-yuk@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: 'TOKIH',
    location: '東京 / TOKYO',
    floorDoorNo: '17S5',
    previousName: '木村 / キムラ / KIMURA',
  },
  {
    name: '久田 尚子',
    nameRomaji: 'ヒサタ ナオコ',
    department: '医療・ヘルスケアビジネス課',
    extension: '9313723',
    companyPhone: '08095532505',
    email: '0334973723',
    itochuEmail: 'kubota-na@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: 'TOKIH',
    location: '東京本社 / tokyo',
    floorDoorNo: '17S7',
    previousName: undefined,
  },
  {
    name: '玉城 諭',
    nameRomaji: 'タマキ サトル',
    department: '医療・ヘルスケアビジネス課',
    companyPhone: '07041168133',
    itochuEmail: 'tamaki-sa@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '趙 澄絵',
    nameRomaji: 'チョウ スミエ',
    department: '医療・ヘルスケアビジネス課',
    extension: '9313242',
    companyPhone: '07041168138',
    email: '0334973242',
    itochuEmail: 'zhao-c@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: 'フロンティアビジネス部医療・ヘルスケアビジネス課',
    indicator: 'TOKIH',
    location: undefined,
    floorDoorNo: '17S7',
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
 * フロンティアビジネス部とその配下の課のメンバー情報を保存
 */
export async function saveFrontierBusinessMembers() {
  try {
    console.log('フロンティアビジネス部とその配下の課のメンバー情報を保存します...\n');
    
    // フロンティアビジネス部の組織IDを取得
    const deptId = await getOrganizationId(['フロンティアビジネス部', 'Frontier Business Department']);
    if (!deptId) {
      throw new Error('フロンティアビジネス部が見つかりません');
    }
    
    // フロンティアビジネス部のメンバーを保存
    await saveMembersForOrganization(deptId, frontierBusinessDeptMembers, 'フロンティアビジネス部');
    
    // 衛星・IPコンテンツビジネス課の組織IDを取得
    const satelliteSectionId = await getOrganizationId(['衛星・IPコンテンツビジネス課', 'Satellite & IP Content Business Section']);
    if (satelliteSectionId) {
      await saveMembersForOrganization(satelliteSectionId, satelliteIpContentBusinessSectionMembers, '衛星・IPコンテンツビジネス課');
    } else {
      console.warn('⚠️ 衛星・IPコンテンツビジネス課が見つかりませんでした');
    }
    
    // インキュベーション推進課の組織IDを取得
    const incubationSectionId = await getOrganizationId(['インキュベーション推進課', 'Incubation Promotion Section']);
    if (incubationSectionId) {
      await saveMembersForOrganization(incubationSectionId, incubationPromotionSectionMembers, 'インキュベーション推進課');
    } else {
      console.warn('⚠️ インキュベーション推進課が見つかりませんでした');
    }
    
    // 医療・ヘルスケアビジネス課の組織IDを取得
    const healthcareSectionId = await getOrganizationId(['医療・ヘルスケアビジネス課', 'Healthcare Business Section']);
    if (healthcareSectionId) {
      await saveMembersForOrganization(healthcareSectionId, healthcareBusinessSectionMembers, '医療・ヘルスケアビジネス課');
    } else {
      console.warn('⚠️ 医療・ヘルスケアビジネス課が見つかりませんでした');
    }
    
    console.log('\n✅ 全てのメンバー情報の保存が完了しました');
  } catch (error: any) {
    console.error('❌ メンバー情報の保存に失敗しました:', error);
    throw error;
  }
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  (window as any).saveFrontierBusinessMembers = saveFrontierBusinessMembers;
}
