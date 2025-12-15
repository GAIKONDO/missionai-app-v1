#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDFファイルをTXTとMDファイルに変換するスクリプト
"""

import os
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("PyMuPDFがインストールされていません。インストール中...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "PyMuPDF"])
    import fitz

def extract_text_from_pdf(pdf_path):
    """PDFからテキストを抽出"""
    try:
        doc = fitz.open(pdf_path)
        text_parts = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                text_parts.append(f"--- ページ {page_num + 1} ---\n{text}\n")
        
        doc.close()
        return "\n".join(text_parts)
    except Exception as e:
        print(f"エラー: PDFの読み込みに失敗しました ({pdf_path}): {e}")
        return None

def convert_pdf_to_txt_md(pdf_path, txt_dir, md_dir):
    """PDFファイルをTXTとMDファイルに変換"""
    pdf_file = Path(pdf_path)
    
    # ファイル名（拡張子なし）
    base_name = pdf_file.stem
    
    # 出力ファイルパス
    txt_path = Path(txt_dir) / f"{base_name}.txt"
    md_path = Path(md_dir) / f"{base_name}.md"
    
    # PDFからテキストを抽出
    print(f"処理中: {pdf_file.name}...")
    text = extract_text_from_pdf(str(pdf_path))
    
    if text is None:
        print(f"  ⚠️  スキップ: {pdf_file.name}")
        return False
    
    # TXTファイルとして保存
    try:
        txt_path.parent.mkdir(parents=True, exist_ok=True)
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"  ✅ TXT保存: {txt_path.name}")
    except Exception as e:
        print(f"  ❌ TXT保存エラー: {e}")
        return False
    
    # MDファイルとして保存（テキストをそのまま保存）
    try:
        md_path.parent.mkdir(parents=True, exist_ok=True)
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(f"# {base_name}\n\n")
            f.write(text)
        print(f"  ✅ MD保存: {md_path.name}")
    except Exception as e:
        print(f"  ❌ MD保存エラー: {e}")
        return False
    
    return True

def main():
    # パス設定
    pdf_dir = "/Users/gaikondo/Library/CloudStorage/Box-Box/PC20/04_定例・CTC共有資料/00_ITC共有資料/01_議事録・共有資料/FY25/MissionAI/pdf"
    txt_dir = "/Users/gaikondo/Library/CloudStorage/Box-Box/PC20/04_定例・CTC共有資料/00_ITC共有資料/01_議事録・共有資料/FY25/MissionAI/txt"
    md_dir = "/Users/gaikondo/Library/CloudStorage/Box-Box/PC20/04_定例・CTC共有資料/00_ITC共有資料/01_議事録・共有資料/FY25/MissionAI/md"
    
    # PDFファイルを検索
    pdf_files = list(Path(pdf_dir).glob("*.pdf"))
    
    if not pdf_files:
        print(f"PDFファイルが見つかりません: {pdf_dir}")
        return
    
    print(f"見つかったPDFファイル: {len(pdf_files)}個\n")
    
    # 各PDFファイルを変換
    success_count = 0
    fail_count = 0
    
    for pdf_file in sorted(pdf_files):
        if convert_pdf_to_txt_md(pdf_file, txt_dir, md_dir):
            success_count += 1
        else:
            fail_count += 1
    
    print(f"\n完了: 成功 {success_count}個, 失敗 {fail_count}個")

if __name__ == "__main__":
    main()
