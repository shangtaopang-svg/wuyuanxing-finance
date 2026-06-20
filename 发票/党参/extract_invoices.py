#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""批量提取党参发票信息"""

import os
import re
import json
import pdfplumber

FOLDER = r"C:\Users\P1368\Desktop\甘洛项目\发票\党参"

def extract_invoice_info(pdf_path):
    """从PDF中提取发票关键信息"""
    info = {
        "文件名": os.path.basename(pdf_path),
        "发票号码": "",
        "开票日期": "",
        "购买方名称": "",
        "销售方名称": "",
        "货物名称": "",
        "金额": "",
        "税额": "",
        "价税合计": "",
        "备注": ""
    }
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"
            
            info["_raw"] = full_text[:2000]  # 保留原文用于调试
            
            # 提取发票号码（8位数字）
            m = re.search(r'发票号码[：:]\s*(\d{8,20})', full_text)
            if m:
                info["发票号码"] = m.group(1)
            else:
                # 尝试找独立的长数字串
                m = re.search(r'号\s*码[：:\s]*(\d{8,20})', full_text)
                if m:
                    info["发票号码"] = m.group(1)
            
            # 提取开票日期
            m = re.search(r'开票日期[：:\s]*(\d{4}年\d{1,2}月\d{1,2}日)', full_text)
            if m:
                info["开票日期"] = m.group(1)
            else:
                m = re.search(r'(\d{4}年\d{1,2}月\d{1,2}日)', full_text)
                if m:
                    info["开票日期"] = m.group(1)
            
            # 提取购买方名称
            m = re.search(r'购\s*买\s*方.*?名\s*称[：:\s]*([^\n\r]{2,30})', full_text, re.DOTALL)
            if m:
                info["购买方名称"] = m.group(1).strip()[:30]
            
            # 提取销售方名称
            m = re.search(r'销\s*售\s*方.*?名\s*称[：:\s]*([^\n\r]{2,30})', full_text, re.DOTALL)
            if m:
                info["销售方名称"] = m.group(1).strip()[:30]
            
            # 提取货物名称（党参相关）
            m = re.search(r'(党参[^\n\r]{0,20})', full_text)
            if m:
                info["货物名称"] = m.group(1).strip()[:30]
            
            # 提取价税合计（大写金额行）
            m = re.search(r'价税合计.*?[（(]大写[）)].*?([壹贰叁肆伍陆柒捌玖拾佰仟万亿元角分整零][^\n\r]{0,30})', full_text)
            if m:
                info["价税合计"] = m.group(1).strip()
            
            # 提取小写金额 ¥XXX.XX
            amounts = re.findall(r'[¥￥]\s*([\d,]+\.?\d*)', full_text)
            if amounts:
                # 最大的那个通常是价税合计
                try:
                    max_amount = max(float(a.replace(',', '')) for a in amounts)
                    info["金额"] = f"¥{max_amount:,.2f}"
                except:
                    info["金额"] = "¥" + amounts[-1]
            
            # 如果还没有金额，尝试其他模式
            if not info["金额"]:
                m = re.search(r'合\s*计[：:\s]*[¥￥]?\s*([\d,]+\.?\d*)', full_text)
                if m:
                    info["金额"] = "¥" + m.group(1)
                    
    except Exception as e:
        info["备注"] = f"解析错误: {e}"
    
    return info

def main():
    pdf_files = sorted([
        f for f in os.listdir(FOLDER) 
        if f.endswith('.pdf') and not f.startswith('.')
    ])
    
    results = []
    for i, fname in enumerate(pdf_files, 1):
        path = os.path.join(FOLDER, fname)
        print(f"[{i}/{len(pdf_files)}] 处理: {fname}")
        info = extract_invoice_info(path)
        info["序号"] = i
        results.append(info)
    
    # 输出JSON
    out_path = os.path.join(FOLDER, "发票汇总.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n完成！结果保存至: {out_path}")
    print(f"共处理 {len(results)} 份发票")
    
    # 打印摘要
    print("\n=== 提取摘要 ===")
    for r in results:
        print(f"[{r['序号']:2d}] {r['文件名'][:20]:<22} 号码:{r['发票号码']:<20} 金额:{r['金额']:<15} 日期:{r['开票日期']}")
    
    return results

if __name__ == "__main__":
    main()
