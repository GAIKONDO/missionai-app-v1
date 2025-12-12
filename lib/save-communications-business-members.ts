/**
 * 通信ビジネス部とその配下の課のメンバー情報をデータベースに保存するスクリプト
 */

import { callTauriCommand } from './localFirebase';
import { addOrgMember, getOrgMembers, deleteOrgMember } from './orgApi';
import type { MemberInfo } from '@/components/OrgChart';

// 通信ビジネス部のメンバー情報
const communicationsBusinessDeptMembers: MemberInfo[] = [
  {
    name: '太田 英利',
    nameRomaji: 'オオタ ヒデトシ',
    title: '部長',
    department: '通信ビジネス部',
    companyPhone: '08092065151',
    itochuEmail: 'oota-hid@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '(兼)通信ビジネス部長',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '松本 雄吾',
    nameRomaji: 'マツモト ユウゴ',
    title: '部長代行',
    department: '通信ビジネス部',
    extension: '9317541',
    companyPhone: '08092065240',
    email: '+81334977541',
    mobilePhone: '+818092065240',
    itochuEmail: 'matsumoto-yug@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部長代行',
    indicator: 'TOKIC',
    location: '伊藤忠商事 青山本社 / ITOCHU Corporation',
    floorDoorNo: '17F S5',
    previousName: undefined,
  },
  {
    name: '野波 宏安',
    nameRomaji: 'ノナミ ヒロヤス',
    department: '通信ビジネス部',
    extension: '931',
    companyPhone: '09080285317',
    email: '0334973654',
    itochuEmail: 'nonami@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部',
    indicator: 'TOKIC',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '石井 恵子',
    nameRomaji: 'イシイ ケイコ',
    department: '通信ビジネス部',
    companyPhone: '09080285267',
    itochuEmail: 'ishii-keiko@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '(兼)通信ビジネス部',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
];

// デジタルマーケティングビジネス課のメンバー情報
const digitalMarketingBusinessSectionMembers: MemberInfo[] = [
  {
    name: '清原 延高',
    nameRomaji: 'キヨハラ ノブタカ',
    title: '課長',
    department: 'デジタルマーケティングビジネス課',
    email: '09048177254',
    mobilePhone: '09048177254',
    itochuEmail: 'kiyohara-n@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部デジタルマーケティングビジネス課長',
    indicator: 'TOKIQ',
    location: '東京都港区北青山2-5-1 / Tokyo',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '竹上 貴之',
    nameRomaji: 'タケガミ タカユキ',
    title: '課長代行',
    department: 'デジタルマーケティングビジネス課',
    extension: '2462',
    companyPhone: '08022263925',
    email: '0334972462',
    itochuEmail: 'takegami-t@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部デジタルマーケティングビジネス課長代行',
    indicator: 'TOKKQ',
    location: '青山17F / TOKYO',
    floorDoorNo: '17S3',
    previousName: undefined,
  },
  {
    name: '荻野 知也',
    nameRomaji: 'オギノ トモヤ',
    department: 'デジタルマーケティングビジネス課',
    extension: '9313648',
    companyPhone: '07041168104',
    email: '0334973648',
    mobilePhone: '09068130601',
    itochuEmail: 'ogino-t@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部デジタルマーケティングビジネス課',
    indicator: 'TOKKU',
    location: '東京本社 / TOKYO',
    floorDoorNo: '17S5',
    previousName: undefined,
  },
  {
    name: '澤口 彩',
    nameRomaji: 'サワグチ アヤ',
    department: 'デジタルマーケティングビジネス課',
    extension: '9312434',
    companyPhone: '08092065268',
    email: '0334972434',
    mobilePhone: '08092065268',
    itochuEmail: 'sawaguchi-a@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部デジタルマーケティングビジネス課',
    indicator: 'TOKIQ',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '西尾 佳奈子',
    nameRomaji: 'ニシオ カナコ',
    department: 'デジタルマーケティングビジネス課',
    extension: '6566',
    companyPhone: '08095587551',
    email: '0334976566',
    itochuEmail: 'yamada-ka@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部デジタルマーケティングビジネス課',
    indicator: 'TOKVZ',
    location: '東京 / TOKYO',
    floorDoorNo: '16F',
    previousName: '山田 / ヤマダ / YAMADA',
  },
  {
    name: '古田 海斗',
    nameRomaji: 'フルタ カイト',
    department: 'デジタルマーケティングビジネス課',
    companyPhone: '09080285264',
    itochuEmail: 'furuta-ka@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部デジタルマーケティングビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '山崎 賢太郎',
    nameRomaji: 'ヤマザキ ケンタロウ',
    department: 'デジタルマーケティングビジネス課',
    extension: '9313098',
    companyPhone: '08092065267',
    email: '0334973098',
    itochuEmail: 'yamazaki-ken@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部デジタルマーケティングビジネス課',
    indicator: 'TOKNW',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '渡邊 陽太',
    nameRomaji: 'ワタナベ ヨウタ',
    department: 'デジタルマーケティングビジネス課',
    extension: '93177708',
    companyPhone: '09080285266',
    email: '0334977708',
    itochuEmail: 'watanabe-yot@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部デジタルマーケティングビジネス課',
    indicator: undefined,
    location: '東京都港区北青山2-5-1 /',
    floorDoorNo: '17F 17S7',
    previousName: undefined,
  },
  {
    name: '石井 恵子',
    nameRomaji: 'イシイ ケイコ',
    department: 'デジタルマーケティングビジネス課',
    extension: '9317802',
    companyPhone: '09080285267',
    email: '0334977802',
    itochuEmail: 'ishii-keiko@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部デジタルマーケティングビジネス課',
    indicator: 'TOKIQ',
    location: '本社 / Tokyo',
    floorDoorNo: '17F S7',
    previousName: undefined,
  },
  {
    name: '宮脇 彰吾',
    nameRomaji: 'ミヤワキ ショウゴ',
    department: 'デジタルマーケティングビジネス課',
    companyPhone: '08092065266',
    itochuEmail: 'miyawaki-s@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部デジタルマーケティングビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
];

// BPOビジネス課のメンバー情報
export const bpoBusinessSectionMembers: MemberInfo[] = [
  {
    name: '松下 祐生',
    nameRomaji: 'マツシタ ユウキ',
    title: '課長',
    department: 'BPOビジネス課',
    extension: '7004',
    companyPhone: '08092065255',
    email: '0334977004',
    mobilePhone: '08092065255',
    itochuEmail: 'matsushita-yu@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部BPOビジネス課長',
    indicator: 'TOKIO',
    location: '東京 / TOKYO',
    floorDoorNo: '17F S5',
    previousName: undefined,
  },
  {
    name: '薬師寺 健二',
    nameRomaji: 'ヤクシジ ケンジ',
    title: '課長代行',
    department: 'BPOビジネス課',
    extension: '7691',
    companyPhone: '08092065257',
    email: '+819014386415',
    itochuEmail: 'yakushiji-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部BPOビジネス課長代行',
    indicator: 'TOKIO',
    location: '東京都港区北青山２－５－１ / 5-1,Kita-Aoyama 2-Chome, Minato-ku,Tokyo 107-8077 Japan',
    floorDoorNo: '17',
    previousName: undefined,
  },
  {
    name: '髙木 咲良',
    nameRomaji: 'タカギ サラ',
    department: 'BPOビジネス課',
    companyPhone: '08095532465',
    itochuEmail: 'takagi-s@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部BPOビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '田中 啓士郎',
    nameRomaji: 'タナカ ケイシロウ',
    department: 'BPOビジネス課',
    extension: '9313845',
    companyPhone: '08095532464',
    email: '0334973845',
    mobilePhone: '09062343262',
    itochuEmail: 'tanaka-keis@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部BPOビジネス課',
    indicator: '-',
    location: '東京 / Tokyo',
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '藤井 健太',
    nameRomaji: 'フジイ ケンタ',
    department: 'BPOビジネス課',
    companyPhone: '08095532457',
    itochuEmail: 'fujii-ken@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部BPOビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '阿曽 直実',
    nameRomaji: 'アソ ナオミ',
    department: 'BPOビジネス課',
    extension: '7317647',
    companyPhone: '08095532466',
    email: '0334977647',
    itochuEmail: 'aso@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部BPOビジネス課',
    indicator: 'TOKIO',
    location: '東京 / Tokyo',
    floorDoorNo: '17S5',
    previousName: undefined,
  },
  {
    name: '熊谷 豪晃',
    nameRomaji: 'クマガイ タケアキ',
    department: 'BPOビジネス課',
    companyPhone: '08095532461',
    itochuEmail: 'kumagai-ta@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部BPOビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '横山 大輔',
    nameRomaji: 'ヨコヤマ ダイスケ',
    department: 'BPOビジネス課',
    extension: '9313465',
    companyPhone: '08095532459',
    email: '0334973465',
    mobilePhone: '08033487919',
    itochuEmail: 'yokoyama-da@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部BPOビジネス課',
    indicator: 'TOCNV',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
];

// モバイルビジネス課のメンバー情報
const mobileBusinessSectionMembers: MemberInfo[] = [
  {
    name: '山口 恭史',
    nameRomaji: 'ヤマグチ ヤスフミ',
    title: '課長',
    department: 'モバイルビジネス課',
    extension: '9317284',
    companyPhone: '08092785895',
    email: '0334977284',
    itochuEmail: 'yamaguchi-y@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課長',
    indicator: 'TOKNP',
    location: '東京本社 / Tokyo',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '井上 大輔',
    nameRomaji: 'イノウエ ダイスケ',
    title: '課長代行',
    department: 'モバイルビジネス課',
    extension: '9313588',
    companyPhone: '08092065249',
    email: '08092065249',
    itochuEmail: 'inoue-da@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課長代行',
    indicator: 'TOKIZ',
    location: '東京 / Tokyo',
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '朝倉 拓海',
    nameRomaji: 'アサクラ タクミ',
    department: 'モバイルビジネス課',
    extension: '2413',
    companyPhone: '09080285277',
    email: '0334972413',
    mobilePhone: '08065795945',
    itochuEmail: 'asakura-ta@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'IZ',
    location: '伊藤忠商事株式会社 / ITOCHU Corporation',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '大村 雄輝',
    nameRomaji: 'オオムラ ユウキ',
    department: 'モバイルビジネス課',
    extension: '9317695',
    companyPhone: '08092065254',
    email: '+810334977695',
    mobilePhone: '05031432332',
    itochuEmail: 'omura-y@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'toknw',
    location: '東京 / TOKYO',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '菊池 隆宏',
    nameRomaji: 'キクチ タカヒロ',
    department: 'モバイルビジネス課',
    extension: '+818092065244',
    companyPhone: '08092065244',
    email: '+818092065244',
    mobilePhone: '+818092065244',
    itochuEmail: 'kikuchi-tak@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'TOKIZ',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '小枝 珠里',
    nameRomaji: 'コエダ ジユリ',
    department: 'モバイルビジネス課',
    extension: '7238',
    companyPhone: '09080285289',
    email: '0334977238',
    itochuEmail: 'mochizuki-j@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'TOKIZ',
    location: undefined,
    floorDoorNo: undefined,
    previousName: '望月 / モチヅキ / Mochizuki',
  },
  {
    name: '杉谷 知剛',
    nameRomaji: 'スギタニ トモタカ',
    department: 'モバイルビジネス課',
    extension: '3650',
    companyPhone: '09080285280',
    email: '0334973650',
    itochuEmail: 'sugitani-t@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'TOKIZ',
    location: '東京本社 / ITOCHU Headquarters',
    floorDoorNo: '17F S',
    previousName: undefined,
  },
  {
    name: '曽和 俊二',
    nameRomaji: 'ソワ シユンジ',
    department: 'モバイルビジネス課',
    extension: '0334973729',
    companyPhone: '08092065316',
    email: '0334973729',
    mobilePhone: '08092065316',
    itochuEmail: 'sowa-s@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'TOKNW',
    location: '東京 / Tokyo',
    floorDoorNo: '17S',
    previousName: undefined,
  },
  {
    name: '萩岡 侑祐',
    nameRomaji: 'ハギオカ ユウスケ',
    department: 'モバイルビジネス課',
    extension: '0334972285',
    companyPhone: '09080285275',
    email: '08083299134',
    mobilePhone: '08083299134',
    itochuEmail: 'hagioka-y@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課(育児休業)',
    indicator: 'tokkv',
    location: '日本 / Japan',
    floorDoorNo: '17F',
    previousName: undefined,
  },
  {
    name: '藤芳 香帆',
    nameRomaji: 'フジヨシ カホ',
    department: 'モバイルビジネス課',
    companyPhone: '09080285287',
    itochuEmail: 'fujiyoshi-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '山田 勇樹',
    nameRomaji: 'ヤマダ ユウキ',
    department: 'モバイルビジネス課',
    extension: '+819080285288',
    companyPhone: '09080285288',
    email: '+819080285288',
    itochuEmail: 'yamada-yuki1@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'TOKNW',
    location: '東京本社 / Tokyo',
    floorDoorNo: '17F S',
    previousName: undefined,
  },
  {
    name: '山本 秋',
    nameRomaji: 'ヤマモト シユウ',
    department: 'モバイルビジネス課',
    extension: '0',
    companyPhone: '08092065355',
    email: '0',
    mobilePhone: '09038659350',
    itochuEmail: 'yamamoto-shu1@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'TOKIO',
    location: '東京都港区北青山２－５－１ / 5-1,Kita-Aoyama 2-Chome, Minato-ku,Tokyo 107-8077 Japan',
    floorDoorNo: 'F17',
    previousName: undefined,
  },
  {
    name: '米澤 悠聖',
    nameRomaji: 'ヨネザワ ユウセイ',
    department: 'モバイルビジネス課',
    extension: '3098',
    companyPhone: '09080285279',
    email: '0334973098',
    itochuEmail: 'yonezawa-y@itochu.co.jp',
    teams: 'Teams',
    employeeType: '総合職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'IZ',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '鎌田 奏音',
    nameRomaji: 'カマタ カノン',
    department: 'モバイルビジネス課',
    extension: '3763',
    companyPhone: '09080285281',
    email: '0334973763',
    itochuEmail: 'kamata-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'S333',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '情家 香織',
    nameRomaji: 'ジヨウケ カオリ',
    department: 'モバイルビジネス課',
    extension: '9317224',
    companyPhone: '09080285282',
    email: '0334977224',
    itochuEmail: 'jyoke-k@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'TOKNP',
    location: '東京本社 / TOKYO',
    floorDoorNo: '17S5',
    previousName: undefined,
  },
  {
    name: '田村 あや子',
    nameRomaji: 'タムラ アヤコ',
    department: 'モバイルビジネス課',
    extension: '9313696',
    email: '0334973696',
    itochuEmail: 'tamura-ay@itochu.co.jp',
    teams: 'Teams',
    employeeType: 'BX職 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課(育児休業)',
    indicator: 'TOKNP',
    location: '東京本社 / TOKYO',
    floorDoorNo: '17S7',
    previousName: undefined,
  },
  {
    name: '稲岡 宣輔',
    nameRomaji: 'イナオカ センスケ',
    department: 'モバイルビジネス課',
    extension: '9317653',
    companyPhone: '07041168118',
    email: '0334977653',
    mobilePhone: '07041168118',
    itochuEmail: 'inaoka-se@itochu.co.jp',
    teams: 'Teams',
    employeeType: '嘱託(継続雇用) /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'TOKNP',
    location: undefined,
    floorDoorNo: '17S7',
    previousName: undefined,
  },
  {
    name: '黒田 佐知子',
    nameRomaji: 'クロダ サチコ',
    department: 'モバイルビジネス課',
    extension: '9313213',
    companyPhone: '08028677225',
    email: '0334973213',
    itochuEmail: 'kuroda@itochu.co.jp',
    teams: 'Teams',
    employeeType: '嘱託(継続雇用) /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: 'TOKIZ',
    location: '東京 / TOKYO',
    floorDoorNo: '17S5',
    previousName: undefined,
  },
  {
    name: '足立 楽斗',
    nameRomaji: 'アダチ ガクト',
    department: 'モバイルビジネス課',
    companyPhone: '08092065318',
    itochuEmail: 'adachi-g@itochu.co.jp',
    teams: 'Teams',
    employeeType: '受入出向 /社員 / ITOCHU Employee',
    roleName: '通信ビジネス部モバイルビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '伊藤 未来',
    nameRomaji: 'イトウ ミキ',
    department: 'モバイルビジネス課',
    extension: '7286',
    companyPhone: '09080285283',
    email: '0334977286',
    itochuEmail: 'ito-miki2@itochu.co.jp',
    teams: 'Teams',
    employeeType: '社員外 /派遣社員 / Temp Staff',
    roleName: 'モバイルビジネス課',
    indicator: 'TOKIZ',
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '今西 望',
    nameRomaji: 'イマニシ ノゾミ',
    department: 'モバイルビジネス課',
    itochuEmail: 'imanishi-nozomi1@itochu.co.jp',
    teams: 'Teams',
    employeeType: '社員外 /業務委託（非常駐） / Subcontractor\'s staff',
    roleName: 'モバイルビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '大崎 純子',
    nameRomaji: 'オオサキ ジュンコ',
    department: 'モバイルビジネス課',
    extension: '2526',
    companyPhone: '09080285174',
    email: '0334972526',
    itochuEmail: 'oosaki-junko@itochu.co.jp',
    teams: 'Teams',
    employeeType: '社員外 /派遣社員 / Temp Staff',
    roleName: 'モバイルビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '大島 小百合',
    nameRomaji: 'オオシマ サユリ',
    department: 'モバイルビジネス課',
    itochuEmail: 'ooshima-sayuri@itochu.co.jp',
    teams: 'Teams',
    employeeType: '社員外 /業務委託（非常駐） / Subcontractor\'s staff',
    roleName: 'モバイルビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '森 亜紀子',
    nameRomaji: 'モリ アキコ',
    department: 'モバイルビジネス課',
    extension: '3177',
    companyPhone: '09080285197',
    email: '0334973177',
    itochuEmail: 'mori-akiko1@itochu.co.jp',
    teams: 'Teams',
    employeeType: '社員外 /派遣社員 / Temp Staff',
    roleName: 'モバイルビジネス課',
    indicator: undefined,
    location: undefined,
    floorDoorNo: undefined,
    previousName: undefined,
  },
  {
    name: '山ノ上 実弥子',
    nameRomaji: 'ヤマノウエ ミヤコ',
    department: 'モバイルビジネス課',
    itochuEmail: undefined,
    teams: 'Teams',
    employeeType: '社員外 /業務委託（非常駐） / Subcontractor\'s staff',
    roleName: 'モバイルビジネス課',
    indicator: undefined,
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
 * 通信ビジネス部とその配下の課のメンバー情報を保存
 */
export async function saveCommunicationsBusinessMembers() {
  try {
    console.log('通信ビジネス部とその配下の課のメンバー情報を保存します...\n');
    
    // 通信ビジネス部の組織IDを取得
    const deptId = await getOrganizationId(['通信ビジネス部', 'Communications Business Department']);
    if (!deptId) {
      throw new Error('通信ビジネス部が見つかりません');
    }
    
    // 通信ビジネス部のメンバーを保存
    await saveMembersForOrganization(deptId, communicationsBusinessDeptMembers, '通信ビジネス部');
    
    // デジタルマーケティングビジネス課の組織IDを取得
    const digitalMarketingSectionId = await getOrganizationId(['デジタルマーケティングビジネス課', 'Digital Marketing Business Section']);
    if (digitalMarketingSectionId) {
      await saveMembersForOrganization(digitalMarketingSectionId, digitalMarketingBusinessSectionMembers, 'デジタルマーケティングビジネス課');
    } else {
      console.warn('⚠️ デジタルマーケティングビジネス課が見つかりませんでした');
    }
    
    // BPOビジネス課の組織IDを取得
    console.log('BPOビジネス課の組織IDを取得中...');
    const bpoSectionId = await getOrganizationId(['BPOビジネス課', 'BPO Business Section']);
    console.log('BPOビジネス課の組織ID:', bpoSectionId);
    if (bpoSectionId) {
      console.log(`BPOビジネス課のメンバー数: ${bpoBusinessSectionMembers.length}名`);
      await saveMembersForOrganization(bpoSectionId, bpoBusinessSectionMembers, 'BPOビジネス課');
      
      // 保存後に確認
      const savedMembers = await getOrgMembers(bpoSectionId);
      console.log(`✅ BPOビジネス課 - 保存後のメンバー数: ${savedMembers.length}名`);
    } else {
      console.warn('⚠️ BPOビジネス課が見つかりませんでした');
      console.log('組織構造を確認してください。デバッグ用: await debugOrgStructure()');
    }
    
    // モバイルビジネス課の組織IDを取得
    const mobileSectionId = await getOrganizationId(['モバイルビジネス課', 'Mobile Business Section']);
    if (mobileSectionId) {
      await saveMembersForOrganization(mobileSectionId, mobileBusinessSectionMembers, 'モバイルビジネス課');
    } else {
      console.warn('⚠️ モバイルビジネス課が見つかりませんでした');
    }
    
    console.log('\n✅ 全てのメンバー情報の保存が完了しました');
  } catch (error: any) {
    console.error('❌ メンバー情報の保存に失敗しました:', error);
    throw error;
  }
}

/**
 * BPOビジネス課のメンバー情報を確認
 */
export async function checkBpoBusinessMembers(): Promise<{ count: number; members: any[]; organizationId: string | null } | null> {
  try {
    console.log('=== BPOビジネス課のメンバー情報確認 ===\n');
    
    // BPOビジネス課の組織IDを取得
    const organizationId = await getOrganizationId(['BPOビジネス課', 'BPO Business Section']);
    
    if (!organizationId) {
      console.log('❌ BPOビジネス課が見つかりませんでした');
      return { count: 0, members: [], organizationId: null };
    }
    
    console.log(`✅ BPOビジネス課の組織ID: ${organizationId}\n`);
    
    // メンバー情報を取得
    const members = await getOrgMembers(organizationId);
    
    console.log(`📊 登録されているメンバー数: ${members.length}名\n`);
    
    if (members.length === 0) {
      console.log('⚠️ メンバーが登録されていません');
      return { count: 0, members: [], organizationId };
    }
    
    // メンバー情報を表示
    console.log('=== 登録されているメンバー一覧 ===\n');
    members.forEach((member: any, index: number) => {
      console.log(`${index + 1}. ${member.name}${member.nameRomaji ? ` (${member.nameRomaji})` : ''}`);
      if (member.position) {
        console.log(`   役職: ${member.position}`);
      }
      if (member.department) {
        console.log(`   部署: ${member.department}`);
      }
      console.log('');
    });
    
    console.log('=== 確認完了 ===');
    return { count: members.length, members, organizationId };
  } catch (error: any) {
    console.error('❌ 確認中にエラーが発生しました:', error);
    console.error('エラー詳細:', error);
    return null;
  }
}

// スクリプトとして実行する場合
if (typeof window === 'undefined') {
  // Node.js環境での実行
  saveCommunicationsBusinessMembers().catch(console.error);
}
