const KINDS=['tasks','events','payments','content','notes'];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function diffRecords(before,after){
  const changes=[];
  for(const kind of KINDS){
    const old=kind==='notes'?before.notes:Object.fromEntries(before[kind].map(r=>[r.id,r]));
    const next=kind==='notes'?after.notes:Object.fromEntries(after[kind].map(r=>[r.id,r]));
    for(const key of new Set([...Object.keys(old),...Object.keys(next)])){
      const a=old[key]??null,b=next[key]??null;
      if(!same(a,b))changes.push({kind,key,before:a,after:b});
    }
  }
  return changes;
}
export class PlannerSync{
  constructor({key,onState,onStatus}){
    this.key=key+'-server-queue-v1';this.cacheKey=key;this.onState=onState;this.onStatus=onStatus;
    this.apiRoots=['https://clodya.201-10-80-14.sslip.io/planner-api',location.origin==='https://video.belyaevayulia.ru'?'/planner-api':'https://video.belyaevayulia.ru/planner-api'];this.apiRoot=this.apiRoots[0];this.endpointConfirmed=false;this.queue=[];this.busy=false;this.ready=false;this.conflict=false;this.revision=-1;
  }
  status(kind,message){this.onStatus({kind,message,pending:this.queue.length});}
  async requestAt(root,path,body,controller=new AbortController()){
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const r=await fetch(root+path,{method:body?'POST':'GET',headers:{Authorization:'tma '+this.auth,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});
      if(!r.ok){const err=Error(r.status===401?'Открой приложение заново через кнопку Клоди.':r.status===409?'Эта запись изменилась в другом окне.':'Сервер пока не подтвердил сохранение.');err.status=r.status;throw err;}
      return await r.json();
    }catch(err){
      if(err.name==='AbortError')throw Error('Не удалось подключиться за 12 секунд. Нажми «Повторить подключение».');
      if(err instanceof TypeError)throw Error('Нет соединения с записями Клоди. Нажми «Повторить подключение».');
      throw err;
    }finally{clearTimeout(timeout);}
  }
  async readAvailable(path){
    const controllers=this.apiRoots.map(()=>new AbortController());
    try{
      const result=await new Promise((resolve,reject)=>{
        let pending=this.apiRoots.length;const errors=[];
        this.apiRoots.forEach((root,i)=>this.requestAt(root,path,undefined,controllers[i]).then(value=>resolve({root,value}),err=>{errors.push(err);if(!--pending)reject(errors.find(e=>e.status===401)||errors[0]);}));
      });
      this.apiRoot=result.root;this.endpointConfirmed=true;return result.value;
    }finally{controllers.forEach(c=>c.abort());}
  }
  async request(path,body){
    if(!this.endpointConfirmed){if(!body)return this.readAvailable(path);await this.readAvailable('/state');}
    try{return await this.requestAt(this.apiRoot,path,body);}
    catch(err){if(!err.status){this.endpointConfirmed=false;if(!body)return this.readAvailable(path);}throw err;}
  }
  async connect(local){
    this.auth=window.Telegram?.WebApp?.initData||'';
    if(!this.auth)throw Error('Открой «Нейросферу» кнопкой в личном чате с Клодей. Демо доступно отдельно.');
    this.status('loading','Подключаю твоё расписание…');
    const stored=localStorage.getItem(this.key);
    if(stored){const saved=JSON.parse(stored);if(!Array.isArray(saved.queue))throw Error('Очередь сохранения требует восстановления из копии.');this.queue=saved.queue;}
    let remote=await this.request('/state');
    if(!localStorage.getItem(this.cacheKey+'-cloud-connected')){
      // Preserve the original local copy before first migration. Never erase it silently.
      localStorage.setItem(this.cacheKey+'-before-cloud',JSON.stringify(local));
      const merged=structuredClone(remote.state);
      for(const kind of KINDS){
        if(kind==='notes'){for(const [d,v] of Object.entries(local.notes))if(!(d in merged.notes))merged.notes[d]=v;}
        else for(const r of local[kind])if(!merged[kind].some(x=>x.id===r.id))merged[kind].push(r);
      }
      const changes=diffRecords(remote.state,merged);
      if(changes.length&&!this.queue.length)this.queue.push({id:crypto.randomUUID(),changes});
      this.persist();
    }
    while(this.queue.length){
      try{remote=await this.request('/changes',this.queue[0]);this.queue.shift();this.persist();}
      catch(err){if(err.status===409){this.conflict=true;this.ready=true;this.status('conflict','Есть несогласованные изменения. Локальная копия сохранена.');return local;}throw err;}
    }
    localStorage.setItem(this.cacheKey+'-cloud-connected','1');this.revision=remote.revision;this.ready=true;
    this.status('saved','Синхронизировано с Клодей');
    this.timer=setInterval(()=>this.refresh(),15000);
    window.addEventListener('online',()=>this.refresh());
    window.Telegram?.WebApp?.onEvent('activated',()=>this.refresh());
    return remote.state;
  }
  persist(){localStorage.setItem(this.key,JSON.stringify({queue:this.queue}));}
  enqueue(before,after){
    if(!this.ready||this.conflict)throw Error('Сначала восстанови соединение с расписанием.');
    const changes=diffRecords(before,after);if(!changes.length)return;
    this.queue.push({id:crypto.randomUUID(),changes});this.persist();
    this.status('pending','Сохраняю на сервер…');this.drain();
  }
  async drain(){
    if(this.busy||this.conflict||!this.ready)return;
    this.busy=true;
    try{
      let latest;
      while(this.queue.length){latest=await this.request('/changes',this.queue[0]);this.queue.shift();this.persist();}
      if(latest&&this.onState(latest.state)!==false)this.revision=latest.revision;
      this.status('saved','Синхронизировано с Клодей');
    }catch(err){
      if(err.status===409){this.conflict=true;this.status('conflict','Запись изменилась в другом окне. Копия твоих правок сохранена.');}
      else this.status('offline',err.status===401?err.message:'Нет подтверждения сервера. Правки сохранены здесь и ждут отправки.');
    }finally{this.busy=false;}
  }
  async refresh(){
    if(!this.ready||this.busy||this.conflict||document.hidden)return;
    if(this.queue.length)return this.drain();
    this.busy=true;
    try{const r=await this.request('/state');if(r.revision!==this.revision&&this.onState(r.state)!==false)this.revision=r.revision;this.status('saved','Синхронизировано с Клодей');}
    catch(err){this.status('offline',err.status===401?err.message:'Не удалось обновить расписание. Проверю снова.');}
    finally{this.busy=false;}
  }
  async acceptServer(local){
    const r=await this.request('/state');
    localStorage.setItem(this.cacheKey+'-recovery-'+Date.now(),JSON.stringify(local));
    this.queue=[];this.persist();this.conflict=false;this.ready=true;this.revision=r.revision;
    this.onState(r.state);this.status('saved','Серверная версия загружена; прежние правки сохранены в копии.');
    if(!this.timer)this.timer=setInterval(()=>this.refresh(),15000);
  }
}
