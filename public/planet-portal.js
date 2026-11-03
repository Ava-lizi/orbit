/* Reusable shell for future planet sites; host supplies the existing ORBIT camera lifecycle. */
window.createPlanetPortal = function({key,gallery,gate,hooks,title='人间。 · EARTH / PHOTOGRAPHY',detailSegment='photo'}) {
  let active=false,entry=false,timers=[],savedTitle='',originEntry=false;
  const route=`#/${key}`;
  const detailPrefix=route+'/'+detailSegment+'/';
  const stateKey=key+'World',entryKey=key+'Entry',detailKey=key+'Photo';
  const matches=()=>location.hash===route||location.hash.startsWith(detailPrefix);
  const photoId=()=>{try{return location.hash.startsWith(detailPrefix)?decodeURIComponent(location.hash.slice(detailPrefix.length)):null;}catch{return null;}};
  function clear(){timers.forEach(clearTimeout);timers=[];gate.classList.remove('is-active');gate.hidden=true;}
  function show(){if(!active)return;gallery.root.hidden=false;gallery.root.classList.add('is-open');gallery.activate(photoId());hooks.shown();document.body.classList.remove(key+'-transitioning');document.body.classList.add(key+'-world-open');hooks.hud.inert=true;gallery.root.focus({preventScroll:true});if(photoId())gallery.activate(photoId());}
  function open({deep=false,fromPop=false,instant=false}={}){
    if(active||(!deep&&!hooks.canOpen()))return false;
    clear();if(deep)hooks.prepare();hooks.save();savedTitle=document.title;active=true;entry=true;originEntry=!deep;hooks.enter();
    if(!fromPop)history[deep?'replaceState':'pushState']({[stateKey]:true,[entryKey]:!deep},'',deep?location.hash:route);
    document.title=title;
    if(deep||instant||matchMedia('(prefers-reduced-motion:reduce)').matches){entry=false;show();return true;}
    // Same gate markup, CSS timings and camera-flight mechanism as the established Venus entry.
    document.body.classList.add(key+'-transitioning');gate.hidden=false;hooks.approach();
    timers.push(setTimeout(()=>gate.classList.add('is-active'),240));
    timers.push(setTimeout(()=>{entry=false;show();},900));
    timers.push(setTimeout(()=>{gate.classList.remove('is-active');timers.push(setTimeout(()=>gate.hidden=true,700));},1600));
    return true;
  }
  function close(){if(!active)return;clear();active=false;entry=false;gallery.deactivate();gallery.root.hidden=true;gallery.root.classList.remove('is-open');document.body.classList.remove(key+'-world-open',key+'-transitioning');hooks.hud.inert=false;document.title=savedTitle;hooks.restore();}
  function requestClose(){
    if(!active)return;
    // Return directly to the selected planet even after several detail routes.
    history.replaceState({[key+'Selected']:true},'',location.pathname+location.search);close();
  }
  function sync(){if(matches()){if(!active)open({deep:true,fromPop:true});else if(!entry)gallery.activate(photoId());}else if(active)close();}
  function photo(id,replace=false){
    if(!id){if(history.state?.[detailKey]){history.back();return;}history.replaceState({[stateKey]:true,[entryKey]:originEntry},'',route);gallery.activate(null);return;}
    history[replace?'replaceState':'pushState']({[stateKey]:true,[detailKey]:true,[entryKey]:originEntry},'',detailPrefix+encodeURIComponent(id));gallery.activate(id);
  }
  const registry=window.__orbitPlanetPortals ||= [];
  registry.push({matches,sync,close});
  if(registry.length===1){const dispatch=()=>{for(const p of registry)if(!p.matches())p.close();for(const p of registry)if(p.matches())p.sync();};window.addEventListener('popstate',dispatch);window.addEventListener('hashchange',dispatch);}
  function leaveTo(hash){close();history.pushState(null,'',hash);window.dispatchEvent(new HashChangeEvent('hashchange'));}
  const api={open,prepareEntry:()=>gallery.prepareEntry?.(),openDeepLink:()=>open({deep:true,fromPop:true}),requestClose,photo,detail:photo,leaveTo,isActive:()=>active,isOpen:()=>active&&!entry};gallery.connect(api);return api;
};
