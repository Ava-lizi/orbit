/* Read-only photography UI. No uploads, database writes, HTML from work records, or credentials. */
window.createEarthGallery = function(data) {
  const works=[...data.works].sort((a,b)=>a.displayOrder-b.displayOrder);
  const root=document.createElement('section');root.id='earthWorld';root.className='earth-world';root.hidden=true;root.tabIndex=-1;root.setAttribute('aria-label','人间 · 地球摄影馆');
  root.innerHTML=`<header class="earth-top"><button class="earth-brand" data-foyer><strong>人间。</strong><small class="caption-3">EARTH / PHOTOGRAPHY</small></button><nav aria-label="摄影馆导航"><button data-archive>影像档案</button><button data-return>返回 ORBIT ↗</button></nav></header>
  <main><section class="earth-hero"><div class="earth-hero-copy"><h1 class="heading-1">人间。</h1><div><p class="body-3">世界很大，我只记录眼前。</p><button class="earth-cta body-3" data-archive>进入影像档案 ↗</button></div></div><figure class="earth-hero-figure"><img alt="" fetchpriority="high"><figcaption class="earth-caption caption-3"><span>01 / 山的另一面</span><span>占位摄影 · Unsplash</span></figcaption></figure></section>
  <section class="earth-archive" id="earthArchive"><header class="earth-archive-head"><div><span class="caption-3">01 / 影像档案</span><h2 class="heading-3">目光停留的地方。</h2></div><div class="earth-filters" role="group" aria-label="摄影分类"></div></header><p class="earth-count caption-3" aria-live="polite"></p><div class="earth-grid"></div></section></main>
  <footer class="earth-footer"><p class="body-3">照片尚待归档。<br>这里暂用第三方占位摄影预览展陈，非站主本人作品。<br>标题与随笔为示例文字。</p><button data-return>返回 ORBIT ↗</button></footer>
  <section class="earth-reader" role="dialog" aria-modal="true" aria-labelledby="earthPhotoTitle" hidden><header class="earth-reader-head"><span class="caption-3" data-position></span><div><button data-prev aria-label="上一张照片">← 上一张</button><button data-next aria-label="下一张照片">下一张 →</button><button data-zoom aria-pressed="false">放大</button><button data-close aria-label="退出照片详情">关闭 ×</button></div></header><div class="earth-reader-stage"><img alt=""></div><div class="earth-reader-note"><div><h2 id="earthPhotoTitle"></h2><p class="caption-3" data-meta></p></div><div><p class="caption-3" data-note-label></p><p class="body-3" data-description></p></div></div></section>`;
  document.body.append(root);
  const $=s=>root.querySelector(s),reader=$('.earth-reader'),stage=$('.earth-reader-stage');
  let selected='全部',visible=works,loaded=false,current=null,trigger=null,portal=null;
  function picture(img,work,detail=false,retryQuery=''){
    img.hidden=false;img.alt=`${work.title}${work.placeholder?'（第三方占位摄影）':''}`;img.width=work.width;img.height=work.height;img.decoding='async';
    img.onload=()=>{img.hidden=false;img.parentElement.querySelector('.earth-failure')?.remove();};
    img.onerror=()=>{img.hidden=true;let p=img.parentElement.querySelector('.earth-failure');if(!p){p=document.createElement('p');p.className='earth-failure';img.after(p);}p.textContent='照片暂时无法载入，请稍后重新打开。';};
    img.sizes=detail?'100vw':'(max-width:700px) calc(100vw - 48px), 45vw';
    img.srcset=(work.sources||[]).map(x=>`${x.url}${retryQuery} ${x.width}w`).join(', ');img.src=(detail?work.image:work.thumbnail)+retryQuery;
  }
  function render(){
    visible=works.filter(x=>selected==='全部'||x.category===selected);$('.earth-grid').replaceChildren();$('.earth-count').textContent=`${selected} / ${String(visible.length).padStart(2,'0')} 张影像`;
    for(const button of $('.earth-filters').children)button.setAttribute('aria-pressed',String(button.textContent===selected));
    if(!visible.length){const p=document.createElement('p');p.className='earth-empty body-3';p.textContent='这个分类还没有影像。';$('.earth-grid').append(p);}
    visible.forEach((work,i)=>{const figure=document.createElement('figure');figure.className='earth-work';const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`查看 ${work.title}`);const img=document.createElement('img');img.loading='lazy';picture(img,work);const caption=document.createElement('figcaption'),text=document.createElement('div'),title=document.createElement('h3'),meta=document.createElement('p'),number=document.createElement('span');title.textContent=work.title;meta.className='caption-3';meta.textContent=[work.category,work.date,work.placeholder?'占位摄影':''].filter(Boolean).join(' / ');number.className='earth-photo-number caption-3';number.textContent=String(i+1).padStart(2,'0');text.append(title,meta);caption.append(text,number);button.append(img,caption);button.onclick=()=>{trigger=button;portal.photo(work.id);};figure.append(button);$('.earth-grid').append(figure);});
  }
  function hidePhoto(){reader.hidden=true;root.style.overflow='';current=null;stage.classList.remove('is-zoomed');const img=stage.querySelector('img');img.removeAttribute('src');img.removeAttribute('srcset');trigger?.focus({preventScroll:true});}
  function showPhoto(id){
    const work=works.find(x=>x.id===id);if(!work){hidePhoto();$('.earth-count').textContent='未找到这张照片，请从档案重新选择。';return;}
    current=work;reader.hidden=false;root.style.overflow='hidden';stage.classList.remove('is-zoomed');stage.scrollTo(0,0);$('[data-zoom]').setAttribute('aria-pressed','false');$('[data-zoom]').textContent='放大';
    picture(stage.querySelector('img'),work,true);$('#earthPhotoTitle').textContent=work.title;$('[data-description]').textContent=work.description||'';$('[data-note-label]').textContent=work.descriptionLabel||'摄影随笔';$('[data-meta]').textContent=[work.category,work.date,work.location,work.placeholder?work.credit:''].filter(Boolean).join(' / ');
    const list=visible.includes(work)?visible:works;$('[data-position]').textContent=`${String(list.indexOf(work)+1).padStart(2,'0')} / ${String(list.length).padStart(2,'0')}`;$('[data-close]').focus({preventScroll:true});
  }
  function step(delta){if(!current)return;const list=visible.includes(current)?visible:works;portal.photo(list[(list.indexOf(current)+delta+list.length)%list.length].id,true);}
  for(const label of ['全部',...data.categories]){const b=document.createElement('button');b.type='button';b.textContent=label;b.className='body-3';b.onclick=()=>{selected=label;render();};$('.earth-filters').append(b);}
  root.querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>$('#earthArchive').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}));
  $('[data-foyer]').onclick=()=>root.scrollTo({top:0,behavior:'auto'});
  root.querySelectorAll('[data-return]').forEach(b=>b.onclick=()=>portal.requestClose());
  $('[data-close]').onclick=()=>portal.photo(null);$('[data-prev]').onclick=()=>step(-1);$('[data-next]').onclick=()=>step(1);
  $('[data-zoom]').onclick=()=>{const on=stage.classList.toggle('is-zoomed');$('[data-zoom]').setAttribute('aria-pressed',String(on));$('[data-zoom]').textContent=on?'还原':'放大';stage.querySelector('img').sizes=on?'200vw':'100vw';stage.scrollTo(0,0);};
  let touch=null;stage.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')touch={x:e.clientX,y:e.clientY};});stage.addEventListener('pointerup',e=>{if(touch&&!stage.classList.contains('is-zoomed')&&Math.abs(e.clientX-touch.x)>70&&Math.abs(e.clientY-touch.y)<50)step(e.clientX<touch.x?1:-1);touch=null;});stage.addEventListener('pointercancel',()=>touch=null);
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();reader.hidden?portal.requestClose():portal.photo(null);}if(!reader.hidden&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();step(e.key==='ArrowRight'?1:-1);}if(e.key==='Tab'){const scope=reader.hidden?root:reader;const buttons=[...scope.querySelectorAll('button:not(:disabled),a[href]')].filter(b=>b.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===root)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
  function prepareHero(retry=false) {
    const hero=works[0];
    const img=$('.earth-hero-figure img');
    if(hero){
      if(!img.hasAttribute('src'))picture(img,hero,true);
      else if(retry&&img.complete&&!img.naturalWidth)picture(img,hero,true,'?retry='+Date.now());
    }
    return hero?img:null;
  }
  return {root,connect:p=>portal=p,prepareEntry:()=>prepareHero(true)?.decode(),activate(id){if(!loaded){const hero=works[0];if(hero){prepareHero();$('.earth-caption span').textContent='01 / '+hero.title;$('.earth-caption span:last-child').textContent=hero.placeholder?hero.credit:[hero.date,hero.location].filter(Boolean).join(' / ');}else{$('.earth-hero-figure').hidden=true;}$('.earth-footer p').textContent=works.some(w=>w.placeholder)?'这里暂有第三方占位摄影预览展陈，已逐图标记，非站主本人作品。标题与随笔为示例文字。':'世界很大，我只记录眼前。';render();loaded=true;}if(id)showPhoto(id);else if(!reader.hidden)hidePhoto();},deactivate(){hidePhoto();}};
};
