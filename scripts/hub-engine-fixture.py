"""Synthetic data for checking the frozen engine without user source files."""
import json
from pathlib import Path
root=Path('build/hub-engine-data');root.mkdir(parents=True,exist_ok=True)
store=dict(settings=dict(company='บริษัททดสอบ',address='ที่อยู่ทดสอบ',vendor='Vendor TEST',preparedBy='ผู้ทดสอบ'),source=dict(name='Hub_TEST.xlsx',importedAt='2026-10-02T06:00:00'),templateName='มาตรฐาน',history=[],branches=[dict(code='10001',name='สาขาทดสอบ',bdc='WB07',route='1',ready=True,flood=False,items=[dict(code='6000001',name='สินค้าทดสอบ',quantity=50)])])
(root/'hub.json').write_text(json.dumps(store,ensure_ascii=False),encoding='utf-8')
