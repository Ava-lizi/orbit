/* Structured prose is rendered using DOM nodes and textContent, never rich-text HTML. */
window.OrbitWritingsView = (()=>{
 const imagePath=/^\.\/public\/(earth|neptune)\/images\/[a-z0-9][a-z0-9_-]*\.(jpg|jpeg|png|webp|avif)$/;
 function image(block){
  if(typeof block.src!=='string'||!imagePath.test(block.src))return null;
  const figure=document.createElement('figure'),img=document.createElement('img');img.loading='lazy';img.decoding='async';img.alt=String(block.alt||'文章配图');img.width=Number(block.width)>0?Math.min(Number(block.width),10000):960;img.height=Number(block.height)>0?Math.min(Number(block.height),10000):640;img.src=block.src;
  img.onerror=()=>{img.hidden=true;let p=figure.querySelector('[data-error]');if(!p){p=document.createElement('p');p.dataset.error='';figure.prepend(p);}p.textContent='配图暂时无法载入，文字仍可继续阅读。';};
  figure.append(img);if(block.caption){const caption=document.createElement('figcaption');caption.className='nep-caption';caption.textContent=String(block.caption);figure.append(caption);}return figure;
 }
 function renderBlocks(target,blocks){target.replaceChildren();for(const block of blocks||[]){let node;if(block.type==='image'){node=image(block);}else if(['paragraph','heading','quote'].includes(block.type)){node=document.createElement(block.type==='heading'?(block.level===3?'h3':'h2'):block.type==='quote'?'blockquote':'p');node.textContent=String(block.text||'');}if(node)target.append(node);}}
 return {renderBlocks,imagePath};
})();

window.createNeptuneReader = function(data){
 const articles=data.articles.filter(a=>a.status==='published').sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
 const root=document.createElement('section');root.id='neptuneWorld';root.className='neptune-world';root.hidden=true;root.tabIndex=-1;root.setAttribute('aria-label','深蓝 · 文学馆');
 root.innerHTML=`<header class="neptune-header"><button class="neptune-brand" data-foyer><strong>深蓝。</strong><span class="nep-caption">NEPTUNE / WRITINGS</span></button><nav aria-label="文学馆导航"><button data-directory>文字档案</button><button data-return>← 返回 ORBIT</button></nav></header>
 <div data-index><main><section class="neptune-foyer"><div><span class="nep-caption">文学序厅</span><h1>深蓝。</h1><p class="neptune-subtitle">在世界的尽头，<br>听见自己的回声。</p><div class="neptune-volume nep-caption" data-volume></div></div><div class="neptune-intro"><p>一些故事没有结局。<br>一些告别没有回音。<br>而我只是在这里，<br>记录那些曾经经过生命的瞬间。</p><button class="neptune-start" data-directory>开始阅读 ↗</button></div></section>
 <section class="neptune-directory" id="neptuneDirectory"><header class="neptune-directory-head"><div><span class="nep-caption">文字档案</span><h2>写在时间的留白里。</h2></div><div class="neptune-filters" role="group" aria-label="文章分类"></div></header><p class="nep-caption" data-count aria-live="polite"></p><div data-list></div></section></main></div>
 <main class="neptune-reader" data-reader hidden><div class="neptune-reader-toolbar"><button data-catalog>← 返回文章目录</button><button data-focus aria-pressed="false">专注阅读</button></div><article><header class="neptune-article-header"><p class="nep-caption" data-meta></p><h1 data-title tabindex="-1"></h1><p class="neptune-demo" data-demo></p></header><div class="neptune-prose" data-prose></div><aside class="neptune-related" data-related></aside></article><nav class="neptune-article-nav" aria-label="文章切换"><button data-prev><small>上一篇</small><span></span></button><button data-next><small>下一篇</small><span></span></button></nav></main>
 <footer class="neptune-footer"><p data-footer>一处留给文字的地方。</p><button data-return>← 返回 ORBIT</button></footer>`;
 document.body.append(root);const $=s=>root.querySelector(s);let portal=null,current=null,filter='全部',catalogScroll=0,focus=false,active=false,indexDestination=null;
 const viewport=document.querySelector('meta[name=viewport]');let savedViewport='';
 const scrollTop=()=>root.scrollTo({top:0,behavior:'auto'});
 function focusMode(on){focus=on;root.classList.toggle('is-focused',on);$('[data-focus]').textContent=on?'退出专注':'专注阅读';$('[data-focus]').setAttribute('aria-pressed',String(on));}
 function list(){
  const visible=articles.filter(a=>filter==='全部'||a.category===filter);$('[data-list]').replaceChildren();$('[data-count]').textContent=`${filter} / ${String(visible.length).padStart(2,'0')} 篇`;
  for(const b of $('.neptune-filters').children)b.setAttribute('aria-pressed',String(b.textContent===filter));
  if(!visible.length){const p=document.createElement('p');p.className='neptune-empty';p.textContent='这一页还留着空白。';$('[data-list]').append(p);}
  for(const [i,a] of visible.entries()){
   const row=document.createElement('article');row.className='neptune-row';const number=document.createElement('span');number.className='nep-caption';number.textContent=String(i+1).padStart(2,'0');const main=document.createElement('div'),h=document.createElement('h3'),link=document.createElement('a'),summary=document.createElement('p'),read=document.createElement('a'),meta=document.createElement('aside');
   const open=e=>{e.preventDefault();catalogScroll=root.scrollTop;portal.detail(a.slug);};link.href=`#/neptune/article/${a.slug}`;link.textContent=a.title;link.onclick=open;h.append(link);summary.textContent=a.summary;read.href=link.href;read.className='nep-read';read.textContent='阅读全文 ↗';read.onclick=open;main.append(h,summary,read);meta.className='nep-caption';for(const text of [a.category,a.publishedAt,a.demo?'演示内容 · 示例日期':'']){if(!text)continue;const span=document.createElement('span');span.textContent=text;meta.append(span);}row.append(number,main,meta);$('[data-list]').append(row);
  }
 }
 function showIndex(){const fromReader=!$('[data-reader]').hidden;current=null;focusMode(false);$('[data-reader]').hidden=true;$('[data-index]').hidden=false;document.title='深蓝。 · NEPTUNE / WRITINGS';const top=fromReader&&indexDestination!=='foyer'?(catalogScroll||$('#neptuneDirectory').offsetTop):catalogScroll;root.scrollTo({top,behavior:'auto'});indexDestination=null;}
 function showArticle(slug){
  const article=articles.find(a=>a.slug===slug);$('[data-index]').hidden=true;$('[data-reader]').hidden=false;scrollTop();
  if(!article){current=null;focusMode(false);$('[data-title]').textContent='这一页暂未公开。';$('[data-meta]').textContent='未找到公开文章';$('[data-demo]').textContent='请返回目录，选择已公开的文字。';$('[data-prose]').replaceChildren();$('[data-related]').replaceChildren();$('[data-prev]').hidden=true;$('[data-next]').hidden=true;$('[data-title]').focus({preventScroll:true});return;}
  current=article;document.title=article.title+' · 深蓝';$('[data-title]').textContent=article.title;$('[data-meta]').textContent=[article.category,article.publishedAt].filter(Boolean).join(' / ');$('[data-demo]').textContent=article.demo?'演示文章 · 日期为示例，不代表作者真实经历或已发表作品。':'';
  window.OrbitWritingsView.renderBlocks($('[data-prose]'),article.content);$('[data-related]').replaceChildren();
  if(article.coverImage){const cover=typeof article.coverImage==='string'?{type:'image',src:article.coverImage,alt:article.title}:article.coverImage;const wrap=document.createElement('div');window.OrbitWritingsView.renderBlocks(wrap,[{...cover,type:'image'}]);$('[data-prose]').prepend(wrap);}
  for(const id of article.relatedPhotoIds||[]){if(!/^[a-z0-9_-]+$/.test(id))continue;const photo=window.ORBIT_PHOTOGRAPHY?.works.find(p=>p.id===id);if(!photo)continue;const link=document.createElement('a');link.href='#/earth/photo/'+encodeURIComponent(id);link.textContent='到「人间」查看影像：'+photo.title+(photo.placeholder?'（占位摄影）':'');link.onclick=e=>{e.preventDefault();portal.leaveTo(link.hash);};$('[data-related]').append(link);}
  const i=articles.indexOf(article);for(const [selector,n] of [['[data-prev]',i-1],['[data-next]',i+1]]){const b=$(selector),next=articles[n];b.hidden=!next;if(next){b.querySelector('span').textContent=next.title;b.onclick=()=>portal.detail(next.slug,true);}}
  $('[data-title]').focus({preventScroll:true});
 }
 for(const label of ['全部',...data.categories]){const b=document.createElement('button');b.textContent=label;b.type='button';b.onclick=()=>{filter=label;list();};$('.neptune-filters').append(b);}
 root.querySelectorAll('[data-return]').forEach(b=>b.onclick=()=>portal.requestClose());
 root.querySelectorAll('[data-directory]').forEach(b=>b.onclick=()=>{if(!$('[data-reader]').hidden){indexDestination='catalog';portal.detail(null);}else $('#neptuneDirectory').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});});
 $('[data-foyer]').onclick=()=>{if(!$('[data-reader]').hidden){catalogScroll=0;indexDestination='foyer';portal.detail(null);}else scrollTop();};
 $('[data-catalog]').onclick=()=>{indexDestination='catalog';portal.detail(null);};$('[data-focus]').onclick=()=>focusMode(!focus);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(focus){focusMode(false);return;}if(!$('[data-reader]').hidden){portal.detail(null);return;}portal.requestClose();}if(e.key==='Tab'){const buttons=[...root.querySelectorAll('button:not([hidden]),a[href]')].filter(n=>n.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===root)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
 $('[data-volume]').textContent=articles.some(a=>a.demo)?'演示文集 / '+String(articles.length).padStart(2,'0')+' 篇':'文字收藏 / '+String(articles.length).padStart(2,'0')+' 篇';$('[data-footer]').textContent=articles.some(a=>a.demo)?'本馆包含已标记的演示文章。示例日期、情节与随笔不代表作者真实经历。':'一处留给文字的地方。';list();
 return {root,connect:p=>portal=p,activate(slug){if(!active){active=true;savedViewport=viewport?.getAttribute('content')||'';viewport?.setAttribute('content','width=device-width, initial-scale=1, viewport-fit=cover');}if(slug)showArticle(slug);else showIndex();},deactivate(){active=false;current=null;catalogScroll=0;focusMode(false);$('[data-reader]').hidden=true;$('[data-index]').hidden=false;if(viewport&&savedViewport)viewport.setAttribute('content',savedViewport);}};
};
