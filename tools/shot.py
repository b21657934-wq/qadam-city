import sys, json
from playwright.sync_api import sync_playwright
# usage: shot.py name query [phone|desk] [actions-js]
def run(jobs):
    with sync_playwright() as p:
        b=p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        for name,q,dev,js,wait in jobs:
            vp={'phone':dict(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True),'desk':dict(viewport={'width':1440,'height':900},device_scale_factor=1),'lap':dict(viewport={'width':1366,'height':768},device_scale_factor=1)}[dev]
            ctx=b.new_context(**vp); pg=ctx.new_page()
            errs=[]; pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in('error','warning') else None); pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
            pg.goto('http://localhost:8801/index.html'+q); pg.wait_for_function("window.__ready===true",timeout=120000)
            pg.wait_for_timeout(1500)
            if js:
                for step in js:
                    if isinstance(step,(int,float)): pg.wait_for_timeout(step)
                    else: pg.evaluate(step)
            pg.wait_for_timeout(wait)
            over=pg.evaluate("""()=>{const W=innerWidth,H=innerHeight,o=[];document.querySelectorAll('.ui *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&(r.right>W+0.5||r.left<-0.5||r.bottom>H+0.5)&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('.hide'))o.push(e.className+' '+Math.round(r.left)+','+Math.round(r.right)+','+Math.round(r.bottom))});document.querySelectorAll('.ui button,.ui .lbl,.ui .h3,.ui .sub,.ui .card,.ui .opt').forEach(e=>{if(e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflow!=='hidden')o.push('clip:'+e.className+':'+e.textContent.slice(0,30))});return o}""")
            pg.screenshot(path=f'shots/{name}.png')
            print(name,'errs:',errs[:5],'overflow:',over[:6])
            ctx.close()
        b.close()
if __name__=='__main__':
    run(json.load(open(sys.argv[1])))
