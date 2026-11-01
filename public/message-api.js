export function createMessageApi(config = window.ORBIT_CONFIG || {}) {
  let pending = null;
  let widget = null;
  let token = '';
  const live = config.mode === 'live';
  const enabled = live || config.mode === 'mock';
  if (!enabled) {
    const write = document.getElementById('sunWrite');
    if (write) {
      write.disabled = true;
      write.title = '留言审核服务配置完成后开放';
      const label = write.querySelector('span');
      if (label) label.textContent = '留言暂未开放';
    }
  }
  const base = (config.apiBase || '/api').replace(/\/$/, '');
  async function call(path, value) {
    const r = await fetch(base + path, { method: value ? 'POST' : 'GET', signal: AbortSignal.timeout(22000), headers: value ? {'Content-Type':'application/json'} : {}, ...(value ? {body:JSON.stringify(value)} : {}) });
    const data = await r.json();
    if(!r.ok) throw new Error(data.error || '服务暂不可用。');
    return data;
  }
  if(live && config.turnstileSiteKey) {
    const mount = document.createElement('div'); mount.id = 'orbitChallenge';
    document.getElementById('sunForm')?.append(mount);
    // Existing form ID differs across older ORBIT revisions.
    if(!mount.isConnected) document.getElementById('sunEditor')?.append(mount);
    window.orbitTurnstileReady = () => { widget = window.turnstile.render(mount, {sitekey:config.turnstileSiteKey,action:'orbit_message',callback:t=>{token=t;},'expired-callback':()=>{token='';},'error-callback':()=>{token='';}}); };
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=orbitTurnstileReady&render=explicit';script.async=true;document.head.append(script);
  }
  async function write(path,value) {
    if(!enabled) throw new Error('留言服务尚未启用，内容未保存。');
    if(live && !token) throw new Error('请先在留言框完成人机验证。');
    try { return await call(path,{...value,turnstileToken:live?token:'local-mock'}); }
    finally {token='';if(widget!==null) window.turnstile.reset(widget);}
  }
  return {
    mode: config.mode || 'offline',
    async list(){return enabled ? call('/messages') : {items:[],total:0};},
    async create({nickname,body}) {
      const signature=JSON.stringify({nickname,body});
      if(pending?.signature!==signature) pending={signature,id:crypto.randomUUID()};
      const x=await write('/messages',{nickname,body,requestId:pending.id});
      pending=null;
      return {mode:config.mode,item:null,status:x.status};
    },
    async report(id){return write('/reports',{id});}
  };
}
