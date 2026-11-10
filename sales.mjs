export function goalProgress(amount,target){
 if(!Number.isFinite(amount)||amount<0||!Number.isFinite(target)||target<=0)throw Error('Некорректные показатели продаж');
 return {amount,target,pct:Math.round(amount/target*1000)/10,fill:Math.min(100,amount/target*100),remaining:Math.max(0,Math.round((target-amount)*100)/100)};
}
export function salesProgress(data,targets){
 if(!data?.available)return null;
 const definitions=[{key:'friend',id:'1',title:'Подружись с Claude + ChatGPT',label:'ПЕРВАЯ СТУПЕНЬ',price:1490},{key:'coding',id:'2',title:'Вайбкодинг с Claude + ChatGPT',label:'ВТОРАЯ СТУПЕНЬ',price:49900}];
 if(!data.products)return null;
 const products=definitions.map((p,i)=>({...p,...goalProgress(data.products[p.key].month.amountRub,targets[i]),targetCount:Math.ceil(targets[i]/p.price),count:data.products[p.key].month.count,today:data.products[p.key].today}));
 return {products,...goalProgress(products.reduce((a,p)=>a+p.amount,0),targets.reduce((a,t)=>a+t,0)),count:products.reduce((a,p)=>a+p.count,0),todayAmount:products.reduce((a,p)=>a+p.today.amountRub,0),todayCount:products.reduce((a,p)=>a+p.today.count,0),unassigned:data.other?.month?.count||0};
}
