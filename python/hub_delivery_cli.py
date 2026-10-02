"""Persistent HUB import and template-preserving daily XLSX exports."""
import argparse
import colorsys
import copy
import json
import math
import os
import re
import shutil
import sys
import tempfile
import uuid
import zipfile
from datetime import date, datetime
from pathlib import Path
from xml.etree import ElementTree as ET

from openpyxl import load_workbook

NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PKG = 'http://schemas.openxmlformats.org/package/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
Q = lambda value: '{' + NS + '}' + value
COLORS = ['4472C4', '70AD47', 'ED7D31', '8064A2', '00A6A6']
DEFAULTS = dict(company='บริษัท แวลู่พลัส รีเทล จำกัด (สำนักงานใหญ่)', address='เลขที่ 1151/3 ถนนนครไชยศรี แขวงพญาไท เขตพญาไท กรุงเทพมหานคร 10400', vendor='2047094 บจ. แวลู่พลัส รีเทล', preparedBy='')
MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

def text(value):
    if value is None: return ''
    if isinstance(value, float) and value.is_integer(): return str(int(value))
    return str(value).strip()

def template_default():
    root = Path(getattr(sys, '_MEIPASS', Path(__file__).parent))
    return root / 'hub_delivery_template.xlsx'

def load_store(folder):
    path = folder / 'hub.json'
    if not path.exists(): return dict(settings=DEFAULTS.copy(), source=None, branches=[], history=[], templateName='เทมเพลต HUB ของ ValuePlus')
    with path.open(encoding='utf-8') as f: data = json.load(f)
    if not isinstance(data, dict) or not isinstance(data.get('branches'), list): raise ValueError('ข้อมูล HUB ที่บันทึกไว้เสียหาย กรุณาติดต่อผู้ดูแล')
    return data

def save_store(folder, data):
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / 'hub.json'
    fd, tmp = tempfile.mkstemp(dir=folder, suffix='.json.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f: json.dump(data, f, ensure_ascii=False, indent=2)
        if path.exists(): shutil.copy2(path, folder / 'hub.backup.json')
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)

def green(cell, themes):
    if cell.fill.patternType != 'solid': return False
    c = cell.fill.fgColor
    if c.type == 'rgb': rgb = c.rgb[-6:]
    elif c.type == 'theme' and c.theme < len(themes): rgb = themes[c.theme]
    else: return False
    if not rgb or not re.fullmatch('[0-9A-Fa-f]{6}', rgb): return False
    r,g,b = [int(rgb[i:i+2],16)/255 for i in (0,2,4)]
    hue,saturation,_ = colorsys.rgb_to_hsv(r,g,b)
    return 0.19 < hue < 0.48 and saturation > 0.12

def import_source(path):
    if Path(path).suffix.lower() != '.xlsx': raise ValueError('กรุณาเลือกไฟล์ Excel .xlsx')
    wb = load_workbook(path, data_only=True)
    names = [name for name in wb.sheetnames if name.strip() == 'Hub สินค้า Dry']
    if not names: raise ValueError('ไม่พบชีท Hub สินค้า Dry')
    s = wb[names[0]]
    themes=[]
    if wb.loaded_theme:
        root=ET.fromstring(wb.loaded_theme)
        scheme=root.find('.//{http://schemas.openxmlformats.org/drawingml/2006/main}clrScheme')
        if scheme is not None:
            for node in scheme: themes.append(next(iter(node)).get('val') if next(iter(node)).tag.endswith('srgbClr') else next(iter(node)).get('lastClr'))
    # The first SKU block is the recurring daily quantity block. Later date
    # blocks must not overwrite it with blank quantities.
    columns=[]; seen=set()
    for col in range(25, s.max_column+1):
        code=text(s.cell(2,col).value); name=text(s.cell(3,col).value)
        if not code or not name or not code.isdigit():
            if columns: break
            continue
        if code in seen: break
        seen.add(code);columns.append((col,code,name))
    if not columns or len(columns)>20: raise ValueError('ต้องมีสินค้า 1–20 รายการในชุดยอดประจำวันแรก')
    result=[];codes=set()
    for row in range(4,s.max_row+1):
        code=text(s.cell(row,3).value);name=text(s.cell(row,4).value)
        if not code or not code.isdigit() or not name: continue
        if code in codes: raise ValueError('รหัสสาขาซ้ำในไฟล์: '+code)
        codes.add(code);route=text(s.cell(row,8).value)
        flood='เสี่ยงน้ำท่วม' in route
        # Require green across the identifying row, not merely B/C highlights.
        ready=all(green(s.cell(row,col),themes) for col in [1,3,4,8]) and not flood
        items=[]
        for col,sku,product in columns:
            qty=s.cell(row,col).value
            if qty is None: qty=0
            if isinstance(qty,bool) or not isinstance(qty,(int,float)) or not math.isfinite(qty) or qty<0 or qty>999999:
                raise ValueError(f'ยอดสินค้าไม่ถูกต้อง สาขา {code} สินค้า {sku}')
            items.append(dict(code=sku,name=product,quantity=qty))
        result.append(dict(code=code,name=name,bdc=text(s.cell(row,5).value),route=route,ready=ready,flood=flood,items=items))
    if not result: raise ValueError('ไม่พบข้อมูลสาขาในไฟล์')
    return sorted(result,key=lambda b:(int(b['route']) if b['route'].isdigit() else 999,int(b['code'])))

def validate_settings(settings):
    out={k:text(settings.get(k)) for k in DEFAULTS}
    for k,maxlen in [('company',150),('address',250),('vendor',100),('preparedBy',80)]:
        if len(out[k])>maxlen: raise ValueError('ข้อความตั้งค่าเอกสารยาวเกินกำหนด')
    if not out['company'] or not out['vendor']: raise ValueError('กรุณาระบุบริษัทและ Vendor')
    return out

def validate_template(path):
    w=load_workbook(path,data_only=False);s=w.worksheets[0]
    for cell,word in [('B1','ชั่วคราว'),('B12','ลำดับ'),('C12','รหัสสินค้า'),('D12','รายการ'),('J12','ขนาดบรรจุ'),('M12','สั่ง'),('N12','ส่ง')]:
        if word not in text(s[cell].value): raise ValueError('เทมเพลตต้องใช้ผัง HUB เดิม ตรวจช่อง '+cell)
    # Reject content/formulas in output slots which could silently survive.
    if any(not m.coord.startswith(('B1:','B3:','B4:','B8:','N8:','D9:','M11:','D1','D2','D3','B36:','B37:')) for m in s.merged_cells.ranges):
        raise ValueError('เทมเพลตมีการรวมเซลล์ที่ไม่รองรับ กรุณาใช้แบบ HUB เดิม')
    return s.title

def write_cell(root, address, value=None, formula=None):
    sheetdata=root.find(Q('sheetData'));rownum=int(re.search(r'\d+',address)[0])
    row=next((r for r in sheetdata if int(r.get('r'))==rownum),None)
    if row is None: row=ET.SubElement(sheetdata,Q('row'),r=str(rownum))
    cell=next((c for c in row if c.get('r')==address),None)
    if cell is None: cell=ET.SubElement(row,Q('c'),r=address)
    for child in list(cell): cell.remove(child)
    cell.attrib.pop('t',None)
    if formula is not None:
        ET.SubElement(cell,Q('f')).text=formula;ET.SubElement(cell,Q('v')).text=str(value)
    elif isinstance(value,(int,float)):
        ET.SubElement(cell,Q('v')).text=str(value)
    elif value is not None:
        cell.set('t','inlineStr');ET.SubElement(ET.SubElement(cell,Q('is')),Q('t')).text=str(value)

def write_delivery(template, output, branches, chosen_date, settings):
    """Clone the template's worksheet XML; preserve fonts, styles and layout."""
    with zipfile.ZipFile(template) as z: files={n:z.read(n) for n in z.namelist()}
    book=ET.fromstring(files['xl/workbook.xml']);rels=ET.fromstring(files['xl/_rels/workbook.xml.rels'])
    sheet=book.find(Q('sheets'))[0];rid=sheet.get('{'+REL+'}id')
    relation=next(r for r in rels if r.get('Id')==rid)
    target=relation.get('Target');sheetpath=target.lstrip('/') if target.startswith('/') else 'xl/'+target
    prototype=ET.fromstring(files[sheetpath]);sheets=book.find(Q('sheets'));sheets.clear()
    for r in list(rels):
        if r.get('Type','').endswith('/worksheet'): rels.remove(r)
    types=ET.fromstring(files['[Content_Types].xml'])
    for t in list(types):
        if t.get('ContentType','').endswith('worksheet+xml'):types.remove(t)
    for n in list(files):
        if n.startswith('xl/worksheets/'):del files[n]
    defs=book.find(Q('definedNames'))
    if defs is not None:book.remove(defs)
    defs=ET.Element(Q('definedNames'));book.insert(list(book).index(sheets)+1,defs)
    for i,branch in enumerate(branches,1):
        root=copy.deepcopy(prototype);name=f'{chosen_date.day}_{branch["code"]}'
        ET.SubElement(sheets,Q('sheet'),name=name,sheetId=str(i),attrib={'{'+REL+'}id':'hubSheet'+str(i)})
        ET.SubElement(rels,'{'+PKG+'}Relationship',Id='hubSheet'+str(i),Type=REL+'/worksheet',Target=f'worksheets/sheet{i}.xml')
        ET.SubElement(types,'{'+CT+'}Override',PartName=f'/xl/worksheets/sheet{i}.xml',ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml')
        props=root.find(Q('sheetPr'))
        if props is None:props=ET.Element(Q('sheetPr'));root.insert(0,props)
        color=props.find(Q('tabColor'))
        if color is None:color=ET.SubElement(props,Q('tabColor'))
        route=int(branch['route']) if branch['route'].isdigit() else 1
        color.set('rgb','FF'+COLORS[(route-1)%len(COLORS)])
        setup=props.find(Q('pageSetUpPr'))
        if setup is None:setup=ET.SubElement(props,Q('pageSetUpPr'))
        setup.set('fitToPage','1')
        for tag in ['pageSetup','pageMargins']:
            old=root.find(Q(tag))
            if old is not None:root.remove(old)
        ET.SubElement(root,Q('pageMargins'),left='0.511811',right='0.511811',top='0.748031',bottom='0.748031',header='0.31496',footer='0.31496')
        ET.SubElement(root,Q('pageSetup'),paperSize='9',orientation='portrait',fitToWidth='1',fitToHeight='1')
        merges=root.find(Q('mergeCells'))
        if merges is None:merges=ET.SubElement(root,Q('mergeCells'))
        for m in list(merges):
            if m.get('ref')=='D9:P10':merges.remove(m)
        if not any(m.get('ref')=='D9:P9' for m in merges):ET.SubElement(merges,Q('mergeCell'),ref='D9:P9')
        merges.set('count',str(len(merges)))
        for r in range(13,33):
            for col in ['B','C','D','J','K','M','N']:write_cell(root,col+str(r))
        values={'B3':settings['company'],'B4':settings['address'],'B8':'Vendor : '+settings['vendor'],'C7':branch['bdc'],'C9':branch['code'],'D9':branch['name'],'N7':None,'N8':f'วันที่: {chosen_date.day} {MONTHS[chosen_date.month-1]} {chosen_date.year+543}','B36':'ผู้จัดทำ: '+(settings['preparedBy'] or '__________________'),'B37':settings['company']}
        # Keep the original retail-price heading without adding prices.
        values.update({'M11':'<-----ราคาขายปลีก------->','N11':None})
        for a,v in values.items():write_cell(root,a,v)
        for r,item in enumerate(branch['items'],13):
            for col,v in [('B',r-12),('C',item['code']),('D',item['name']),('J',1),('K',1),('M',item['quantity']),('N',item['quantity'])]:write_cell(root,col+str(r),v)
        total=sum(item['quantity'] for item in branch['items'])
        for col in ['M','N']:write_cell(root,col+'33',total,formula=f'SUM({col}13:{col}32)')
        # Inline cells created at the end of a row must still be in column order.
        def col_number(c):
            number=0
            for ch in re.match('[A-Z]+',c.get('r'))[0]:number=number*26+ord(ch)-64
            return number
        for row in root.find(Q('sheetData')):row[:]=sorted(row,key=col_number)
        files[f'xl/worksheets/sheet{i}.xml']=ET.tostring(root,encoding='utf-8',xml_declaration=True)
        ET.SubElement(defs,Q('definedName'),name='_xlnm.Print_Area',localSheetId=str(i-1)).text=f"'{name}'!$B$1:$P$41"
    for key,root in [('xl/workbook.xml',book),('xl/_rels/workbook.xml.rels',rels),('[Content_Types].xml',types)]:files[key]=ET.tostring(root,encoding='utf-8',xml_declaration=True)
    output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
        for n,b in files.items():z.writestr(n,b)

def handle(action, folder, output_folder, payload):
    folder.mkdir(parents=True,exist_ok=True);store=load_store(folder)
    if action=='load':return store
    if action=='import-source':
        path=Path(payload['path']);branches=import_source(path)
        store.update(branches=branches,source=dict(name=path.name,importedAt=datetime.now().isoformat(timespec='seconds')))
    elif action=='settings':store['settings']=validate_settings(payload['settings'])
    elif action=='import-template':
        path=Path(payload['path']);validate_template(path)
        shutil.copy2(path,folder/'template.xlsx');store['templateName']=path.name
    elif action=='reset-template':
        (folder/'template.xlsx').unlink(missing_ok=True);store['templateName']='เทมเพลต HUB ของ ValuePlus'
    elif action=='export':
        chosen=date.fromisoformat(payload['date'])
        if not 2000<=chosen.year<=2200:raise ValueError('วันที่ต้องอยู่ในปี 2000–2200')
        codes=payload['codes']
        if not isinstance(codes,list) or not codes or len(codes)!=len(set(codes)):raise ValueError('กรุณาเลือกสาขาอย่างน้อยหนึ่งสาขา')
        branches=[b for b in store['branches'] if b['code'] in codes]
        if len(branches)!=len(codes) or any(b['flood'] for b in branches):raise ValueError('พบสาขาที่ไม่อยู่ในข้อมูลหรือเสี่ยงน้ำท่วม')
        if any(not any(item['quantity']>0 for item in b['items']) for b in branches):raise ValueError('มีสาขาที่ยังไม่มียอดสินค้า กรุณาตรวจไฟล์ต้นฉบับ')
        settings=validate_settings(store['settings']);template=folder/'template.xlsx'
        if not template.exists():template=template_default()
        validate_template(template)
        number=uuid.uuid4().hex
        archive=folder/'exports'/(number+'.xlsx')
        write_delivery(template,archive,branches,chosen,settings)
        filename=f'ใบส่งของ_{chosen.strftime("%d-%m-")}{chosen.year+543}.xlsx'
        output_folder.mkdir(parents=True,exist_ok=True);target=output_folder/filename;counter=1
        while target.exists():counter+=1;target=output_folder/(Path(filename).stem+f'_{counter}.xlsx')
        shutil.copy2(archive,target)
        entry=dict(id=number,date=chosen.isoformat(),filename=target.name,path=str(target),branchCodes=codes,count=len(branches),sourceName=store['source']['name'],createdAt=datetime.now().isoformat(timespec='seconds'))
        store['history'].insert(0,entry);save_store(folder,store)
        return dict(store=store,path=str(target))
    elif action=='open-history':
        entry=next((h for h in store['history'] if h['id']==payload['id']),None)
        if not entry:raise ValueError('ไม่พบประวัติไฟล์')
        archive=folder/'exports'/(entry['id']+'.xlsx')
        if not archive.is_file():raise ValueError('ไม่พบไฟล์ที่บันทึกไว้')
        target=output_folder/entry['filename'];output_folder.mkdir(parents=True,exist_ok=True)
        if not target.exists():shutil.copy2(archive,target)
        return dict(path=str(target))
    else:raise ValueError('คำสั่ง HUB ไม่ถูกต้อง')
    save_store(folder,store);return store

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--action',required=True);parser.add_argument('--data-dir',required=True);parser.add_argument('--output-dir',required=True)
    args=parser.parse_args()
    try:
        payload=json.loads(sys.stdin.read() or '{}');data=handle(args.action,Path(args.data_dir),Path(args.output_dir),payload)
        print(json.dumps(dict(success=True,data=data),ensure_ascii=False));return 0
    except Exception as error:
        print(json.dumps(dict(success=False,message=str(error)),ensure_ascii=False));return 1

if __name__=='__main__':raise SystemExit(main())
