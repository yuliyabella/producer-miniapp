const add=(day,n)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export function publicationAward(count){return count>=3?{icon:'🏆',label:'Максимум'}:count===2?{icon:'⭐',label:'Оптимум'}:count===1?{icon:'👏',label:'Базовый минимум'}:{icon:'',label:'Пока без публикаций'};}
export function adaptivePlan(state,day){
 const month=day.slice(0,7),goal=state.content.find(r=>r.goalType==='content-output'&&r.goalMonth===month);if(!goal)return null;
 const end=add(month+'-01',new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate()-1),start=[day,goal.planningFrom||month+'-01'].sort().at(-1);
 const rest=d=>(goal.restDays||[]).includes(d)||(goal.weeklyRestDays||[0]).includes(new Date(d+'T12:00:00Z').getUTCDay());
 const published=state.content.filter(r=>r.format==='Reels'&&r.stage==='Опубликовано'&&(r.publishedDate||r.date||'').startsWith(month));
 const remaining=Math.max(0,goal.reelsTarget-published.length),all=[];for(let d=start;d<=end;d=add(d,1))if(!rest(d))all.push(d);
 if(!all.length||!remaining)return {remaining,days:[],needed:0,shortfall:remaining&&!all.length?remaining:0};
 const first=all[0],weekStart=add(first,-((new Date(first+'T12:00:00Z').getUTCDay()+6)%7)),weekEnd=add(weekStart,6),days=all.filter(d=>d<=weekEnd).map(date=>({date,count:0,published:published.filter(r=>(r.publishedDate||r.date)===date).length}));
 const doneWeek=published.filter(r=>(r.publishedDate||r.date)>=weekStart&&(r.publishedDate||r.date)<=weekEnd).length;
 const nominalWeek=Math.min(Number(goal.weeklyReels)||5,Math.max(0,(Number(goal.reelsTarget)||0)-published.filter(r=>(r.publishedDate||r.date)<weekStart).length));
 const needed=Math.min(remaining,Math.max(0,nominalWeek-doneWeek,Math.ceil((remaining+doneWeek)*days.length/all.length)-doneWeek));
 let left=needed;while(left){let changed=false;for(const d of days){if(left&&d.count+d.published<3){d.count++;left--;changed=true;}}if(!changed)break;}
 return {remaining,days,needed,shortfall:left,weekStart,weekEnd};
}
