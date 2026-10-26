from pathlib import Path
from PIL import Image
import json,hashlib,io
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'public/assets';WEB.mkdir(parents=True,exist_ok=True)
ORIGINALS=ROOT/'artwork/originals'
def web(im,p,q=88):
 b=io.BytesIO();im.save(b,format='WEBP',quality=q,method=6);p.write_bytes(b.getvalue())
records=[]
for name in ['hero-approved','logo','journey-map']+[f'chapter-{i:02}' for i in range(1,11)]:
 p=ORIGINALS/(name+'.png')
 with Image.open(p) as original:original.load();im=original.copy()
 record={'id':name,'original':str(p.relative_to(ROOT)),'width':im.width,'height':im.height,'mode':im.mode,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'variants':[]}
 def note(dest,export,**extra):record['variants'].append({'file':str(dest.relative_to(ROOT)),'width':export.width,'height':export.height,'bytes':dest.stat().st_size,**extra})
 if name=='logo':
  record['transparentOutside']='A' in im.getbands() and im.getchannel('A').getextrema()[0]==0
  assert record['transparentOutside']
  for filename,size in [('logo.png',512),('logo-96.png',96),('favicon.png',32),('apple-touch-icon.png',180)]:
   small=im.copy();small.thumbnail((size,size),Image.Resampling.LANCZOS);dest=WEB/filename;b=io.BytesIO();small.save(b,format='PNG',optimize=True);dest.write_bytes(b.getvalue());note(dest,small)
 else:
  im=im.convert('RGB');stem='hero' if name=='hero-approved' else name;dest=WEB/(stem+'.webp');web(im,dest);note(dest,im)
  if name!='journey-map':
   small=im.copy();small.thumbnail((960,960),Image.Resampling.LANCZOS);dest=WEB/(stem+'-960.webp');web(small,dest,85);note(dest,small)
  if name=='hero-approved':
   for label,box in [('blue-portrait',(80,120,720,900)),('red-portrait',(1030,120,1670,900))]:
    crop=im.crop(box);dest=WEB/(label+'.webp');web(crop,dest);note(dest,crop,crop=box)
   width=im.width-im.width%3;height=width//3;crop=im.crop((0,125,width,125+height));b=io.BytesIO();crop.save(b,format='PNG');(ORIGINALS/'banner-3x1.png').write_bytes(b.getvalue());dest=WEB/'banner.webp';web(crop,dest);note(dest,crop,ratio='3:1')
 records.append(record)
manifest={'artDirection':'Approved dark matte 3D twin sisters; no rejected bright artwork.','assetCount':len(records),'missing':[],'assets':records,'totalWebAssetBytes':sum(p.stat().st_size for p in WEB.iterdir() if p.is_file())}
(ROOT/'docs/ASSET_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'originals':len(records),'webBytes':manifest['totalWebAssetBytes']}))
