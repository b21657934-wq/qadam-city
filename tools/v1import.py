import json,re
V='/home/claude/v1src/'
d=json.load(open(V+'v1data.json')); meta=json.load(open(V+'meta.json')); back=json.load(open(V+'back.json')); labs=json.load(open(V+'labs.json'))
EMO=re.compile('[\U0001F300-\U0001FAFF☀-⛿✀-➿️]')
def clean(o):
    if isinstance(o,str):
        s=EMO.sub('',o.replace('☂ ','').replace('✓','✓'))
        s=s.replace(' (and our Reward Reefs island)','').replace(' (и наш остров Reward Reefs)','').replace(' (және біздің Reward Reefs аралы)','')
        s=s.replace('Prompt injection','Промпт-инъекция') if False else s
        return s
    if isinstance(o,list): return [clean(x) for x in o]
    if isinstance(o,dict): return {k:clean(v) for k,v in o.items()}
    return o
ch=[]
for i,c in enumerate(d['ch']):
    c=clean(dict(c)); lab=c.pop('lab')
    ch.append({'en':c,'ru':clean(d['pv']['ru'][str(i+1)]),'kk':clean(d['pv']['kk'][str(i+1)]),'lab':{'code':lab['code'],'params':lab['params'],'intro':lab.get('intro','')}})
for L in ['ru','kk']:
    for c in ch:
        s=json.dumps(c[L],ensure_ascii=False).replace('Prompt injection','Промпт-инъекция'); c[L]=json.loads(s)
M=[{'n':p['n'],'title':{'en':p['title'],'ru':meta['op']['ru'][k][0],'kk':meta['op']['kk'][k][0]},'topic':{'en':p['topic'],'ru':meta['op']['ru'][k][1],'kk':meta['op']['kk'][k][1]}} for k,p in enumerate(meta['Pn'])]
K=d['Ks']
BACK={'ai':{'en':back['ai_en'],'ru':K['ai']['ru'],'kk':K['ai']['kk']},'refs':back['refs'],
 'aiTitle':K['aiTitle'],'refsT':K['refs'],'team':K['team'],'contrib':K['contrib'],'member':K['member'],'c1':K['c1'],'c2':K['c2'],'c3':K['c3'],'both':K['both']}
out=['// Generated from version 1 (qadam-archipelago) by tools/v1import.py — do not edit by hand.']
out.append('export const META = '+json.dumps(M,ensure_ascii=False)+';')
out.append('export const CH = '+json.dumps(ch,ensure_ascii=False)+';')
out.append('export const BACK = '+json.dumps(BACK,ensure_ascii=False)+';')
out.append('export const RUN = [\n'+',\n'.join('(function () {\n'+l['code']+'\n})()' for l in labs)+'\n];')
open('src/book/data.js','w').write('\n'.join(out))
print('ok', sum(len(x) for x in out)//1024,'KB')
