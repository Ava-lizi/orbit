/* Reusable shell for future planet sites; host supplies the existing ORBIT camera lifecycle. */
(() => {
  const portals = [];

  function dispatchRoute() {
    // Close the previous world before opening or updating the matching one.
    for (const portal of portals) {
      if (!portal.matches()) portal.close();
    }
    for (const portal of portals) {
      if (portal.matches()) portal.sync();
    }
  }

  window.createPlanetPortal = function({key,gallery,gate,hooks,title='人间。 · EARTH / PHOTOGRAPHY',detailSegment='photo'}) {
    let active=false,entry=false,timers=[],savedTitle='',originEntry=false;
    const route=`#/${key}`;
    const detailPrefix=route+'/'+detailSegment+'/';
    const stateKey=key+'World',entryKey=key+'Entry',detailKey=key+'Photo';
    const isDetailRoute=()=>location.hash.startsWith(detailPrefix);
    const matches=()=>location.hash===route||isDetailRoute();
    const photoId=()=>{try{return isDetailRoute()?decodeURIComponent(location.hash.slice(detailPrefix.length)):null;}catch{return null;}};
    const returnButtons = Array.from(gallery.root.querySelectorAll('[data-return]'), button => ({button, label:button.textContent}));
    let renderedHash = null;
    let detailTrigger = null;
    let returningToCatalog = false;
    function renderRoute() {
      const fromDetail = renderedHash?.startsWith(detailPrefix);
      const detail = isDetailRoute();
      renderedHash = location.hash;
      returningToCatalog = false;
      gallery.activate(photoId());
      for (const {button, label} of returnButtons) button.textContent = detail ? '← 返回上一级' : label;
      if (fromDetail && !detail) {
        const focusTarget = detailTrigger?.isConnected ? detailTrigger : gallery.root;
        focusTarget.focus({preventScroll:true});
      }
    }
    function clear(){timers.forEach(clearTimeout);timers=[];gate.classList.remove('is-active');gate.hidden=true;}
    function show(){if(!active)return;gallery.root.hidden=false;gallery.root.classList.add('is-open');hooks.shown();document.body.classList.remove(key+'-transitioning');document.body.classList.add(key+'-world-open');hooks.hud.inert=true;gallery.root.focus({preventScroll:true});renderRoute();}
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
    function close(){if(!active)return;clear();active=false;entry=false;renderedHash=null;detailTrigger=null;returningToCatalog=false;gallery.deactivate();gallery.root.hidden=true;gallery.root.classList.remove('is-open');document.body.classList.remove(key+'-world-open',key+'-transitioning');hooks.hud.inert=false;document.title=savedTitle;hooks.restore();}
    function requestClose(){
      if(!active)return;
      if(isDetailRoute()){photo(null);return;}
      history.replaceState({[key+'Selected']:true},'',location.pathname+location.search);close();
    }
    function sync(){if(matches()){if(!active)open({deep:true,fromPop:true});else if(!entry&&renderedHash!==location.hash)renderRoute();}else if(active)close();}
    function photo(id, replace = false) {
      if (returningToCatalog) return;
      if (!id) {
        if (isDetailRoute() && history.state?.[detailKey]) {
          returningToCatalog = true;
          history.back();
          return;
        }
        history.replaceState({[stateKey]:true,[entryKey]:originEntry}, '', route);
        renderRoute();
        return;
      }
      const fromCatalog = location.hash === route;
      if (fromCatalog && gallery.root.contains(document.activeElement)) detailTrigger = document.activeElement;
      // Record a catalog predecessor only when we pushed the detail from the catalog.
      const hasCatalogPredecessor = replace ? !!history.state?.[detailKey] : fromCatalog;
      history[replace?'replaceState':'pushState']({[stateKey]:true,[detailKey]:hasCatalogPredecessor,[entryKey]:originEntry}, '', detailPrefix+encodeURIComponent(id));
      renderRoute();
    }
    portals.push({ matches, sync, close });
    if (portals.length === 1) {
      window.addEventListener('popstate', dispatchRoute);
      window.addEventListener('hashchange', dispatchRoute);
    }
    function leaveTo(hash){close();history.pushState(null,'',hash);window.dispatchEvent(new HashChangeEvent('hashchange'));}
    const api={open,prepareEntry:()=>gallery.prepareEntry?.(),openDeepLink:()=>open({deep:true,fromPop:true}),requestClose,photo,detail:photo,leaveTo,isActive:()=>active,isOpen:()=>active&&!entry};gallery.connect(api);return api;
  };
})();
