import { useEffect, useRef, useState } from 'react';
import { Pause, Play, ArrowsOut, ArrowRight, X, Info, ArrowCounterClockwise } from '@phosphor-icons/react';
import Loom from './components/Loom';
import JevPanel from './components/JevPanel';
import SecurityPanel from './components/SecurityPanel';
import './styles.css';

const CASES=[
  {name:'EMAIL TRIAGE',cn:'邮件分流',type:'Choice',field:'folder',label:'billing',prob:.97,color:'#51efff',text:'I was charged twice for my subscription. Please refund the duplicate payment.',result:'billing → review queue',desc:'将重复扣费邮件分流到财务队列。'},
  {name:'YOUTUBE COMMENT',cn:'评论判断',type:'Noul',field:'worth_reply',label:'yes',prob:.93,color:'#ffd361',text:'Could you show how to connect this to a local database? A tutorial would be really useful.',result:'worth_reply → yes',desc:'识别值得回复的具体问题。'},
  {name:'INBOUND LEAD',cn:'销售线索',type:'Score',field:'lead_quality',label:'high',prob:.89,color:'#ff459d',text:'We run 40,000 support tickets a month and want to trial your enterprise plan next week.',result:'high → book_call',desc:'依据采购意向与规模判断线索质量。'},
  {name:'BROWSER AGENT',cn:'浏览器任务',type:'Choice',field:'action',label:'type_destination',prob:.96,color:'#51efff',text:'The travel page is open. The destination field is empty. Find flights to Tokyo.',result:'type_destination → queued',desc:'选择下一步浏览器操作；Demo 不操作外部网站。'},
  {name:'SUPPORT TICKET',cn:'客服工单',type:'Score',field:'urgency',label:'high',prob:.71,color:'#ff459d',text:'Our production export has failed three times today. We need the files before the reporting deadline.',result:'high → priority_queue',desc:'低于阈值的结果进入人工复核。'},
  {name:'AGENT ACTION',cn:'行动校验',type:'Noul',field:'safe_to_run',label:'yes',prob:.94,color:'#ffd361',text:'Draft a response for review. Do not send it until a team member approves.',result:'safe_to_run → draft_only',desc:'检查动作边界，仅展示待审批草稿。'},
];
const COLORS=['#51efff','#ff459d','#ffd361'];
function Chart({time,kind='lines'}){
 const ref=useRef(null);
 useEffect(()=>{const c=ref.current,ctx=c.getContext('2d'),r=c.getBoundingClientRect();c.width=r.width*2;c.height=r.height*2;ctx.scale(2,2);const w=r.width,h=r.height;
 ctx.strokeStyle='#1a2030';ctx.lineWidth=.5;for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(0,h*i/4);ctx.lineTo(w,h*i/4);ctx.stroke();}
 if(kind==='matrix'){let size=Math.min(w/27,h/13);for(let x=0;x<27;x++)for(let y=0;y<13;y++){const a=Math.sin(x*18.23+y*8.3);ctx.fillStyle=(x>12&&x<19&&y>2&&y<11)?`rgba(54,231,255,${.4+Math.sin(time*.6+y)*.3})`:`rgba(101,116,255,${a>.2?.65:.10})`;ctx.fillRect(x*size+(w-27*size)/2,y*size,size-2,size-2);}}
 else COLORS.forEach((color,j)=>{ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=3;ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<w;x++){const y=h*.5+Math.sin(x*.08+time*.35+j*2)*h*.2+Math.cos(x*.19+j+time*.2)*h*.09; x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();});
 },[time,kind]);return <canvas ref={ref} className="chart" />;
}
function Panel({title,tag,children,className=''}){return <section className={'panel '+className}><div className="panel-label"><span>{title}</span><span>{tag}</span></div>{children}</section>;}
export function App(){
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches),[auto,setAuto]=useState(true),[camera,setCamera]=useState('orbit'),[intensity,setIntensity]=useState(1),[time,setTime]=useState(0),[info,setInfo]=useState(false),[ready,setReady]=useState(null),[threshold,setThreshold]=useState(.85),[resetKey,setResetKey]=useState(0);
 const [mode,setMode]=useState('demo'),[apiOpen,setApiOpen]=useState(false),[status,setStatus]=useState(null),[text,setText]=useState(CASES[0].text),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null),[completed,setCompleted]=useState(0);
 const [securityOpen,setSecurityOpen]=useState(window.location.hash==='#security');
 const live=mode==='live';
 const current=live?{...CASES[index],prob:result?.probability??null,label:result?.label??'waiting',result:result?`${result.label} → review only`:'not evaluated'}:CASES[index];
 const pass=current.prob==null?null:current.prob>=threshold;
 const prob=(digits=2)=>current.prob==null?'—':current.prob.toFixed(digits);
 useEffect(()=>{setText(CASES[index].text);setResult(null);setError('');},[index]);
 async function checkStatus(){try{const r=await fetch('/api/health');if(!r.ok)throw Error();setStatus(await r.json());}catch{setStatus({offline:true});}}
 function openApi(){setMode('live');setAuto(false);setApiOpen(true);checkStatus();}
 async function runJev(){
   if(busy)return;setBusy(true);setError('');setResult(null);
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),130000);
   try{const response=await fetch('/api/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({case_id:index,text}),signal:controller.signal});
     const data=await response.json().catch(()=>null);
     if(!response.ok)throw Error(typeof data?.detail==='string'?data.detail:'后端无法处理请求，请检查本地服务。');
     if(data?.source!=='live'||data.case_id!==index||!Number.isFinite(data.probability))throw Error('后端返回的数据格式无效。');
     setResult(data);setCompleted(n=>n+1);setStatus(s=>({...s,configured:true,offline:false}));
   }catch(e){setError(e.name==='AbortError'?'请求等待超时。远端可能已经收到请求，请勿连续重复提交。':e.message==='Failed to fetch'?'无法连接本地后端，请检查服务是否运行。':e.message);}
   finally{clearTimeout(timeout);setBusy(false);}
 }
 function editText(value){setText(value);setResult(null);setError('');}
 useEffect(()=>{if(paused)return;const id=setInterval(()=>setTime(t=>t+.1),100);return()=>clearInterval(id);},[paused]);
 useEffect(()=>{if(!auto||paused||live)return;const id=setInterval(()=>setIndex(i=>(i+1)%CASES.length),7500);return()=>clearInterval(id);},[auto,paused,live]);
 useEffect(()=>{const fn=e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();setPaused(p=>!p);}if(e.key==='Escape')setInfo(false);};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[]);
 const selectCase=i=>{if(busy)return;setIndex(i);setAuto(false);};
 async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}}
 return <main className="dashboard" style={{'--accent':current.color}}>
  <header><div className="brand">JEV <span>/</span> SIGNAL LOOM</div><div className="version">SYSTEM ONE <span>·</span> jev / visual lab</div><div className="header-right"><button className="api-entry" onClick={()=>setSecurityOpen(true)}>SECURITY</button><button className="api-entry" onClick={openApi}>JEV API</button>{live&&<button disabled={busy} className="api-entry" onClick={()=>{setMode('demo');setResult(null);setError('');}}>演示</button>}<span className="demo-label">{live?(busy?'LIVE · RUNNING':result?'LIVE RESULT':'LIVE · WAIT'):'SIMULATED DATA'}</span><button title="Demo 说明" aria-label="Demo 说明" onClick={()=>setInfo(true)}><Info size={15}/></button><button title="全屏" aria-label="全屏" onClick={fullscreen}><ArrowsOut size={15}/></button></div></header>
  <section className="metrics">
   <div className="metric"><div className="eyebrow">DECISIONS / THIS RUN</div><strong>{live?completed:Math.floor(783+time*76).toLocaleString('en-US')}</strong><div className="meter">{Array.from({length:34},(_,i)=><i key={i} style={{opacity:i<(time*2)%34?1:.12}} />)}</div><small>{live?'completed live judgments · this session':'6 use cases · 3 typed heads'}</small></div>
   <div className="metric"><div className="eyebrow">{live?'LAST REQUEST / WALL TIME':'MEDIAN LATENCY / DEMO'}</div><strong>{live?(result?.elapsed_ms??'—'):'~256'}<span> ms</span></strong><div className="metric-chart"><Chart time={time}/></div><small>{live?'includes network and provider time':'illustrative value · not measured'}</small></div>
   <div className="metric cost"><div className="eyebrow">{live?'COST / PROVIDER BILLING':'COST / 10 000 DECISIONS · DEMO'}</div><strong>{live?'—':'≈ $0.42'}</strong><div className="cost-bar"><span>Jev</span><i/><b>{live?'not reported':'illustrative'}</b></div><small>{live?'check TypeSafe account for actual cost':'no API calls · no inference charges'}</small></div>
   <div className={'metric confidence '+(pass===false?'hold':'')}><div className="eyebrow">PROBABILITY / SELECTED ANSWER</div><strong>{prob()} <em>{pass===null?'WAIT':pass?'PASS':'HOLD'}</em></strong><div className="confidence-bar"><i style={{width:(current.prob??0)*100+'%'}}/><b style={{left:threshold*100+'%'}}/></div><small>review gate <span>≥ {threshold.toFixed(2)}</span></small></div>
  </section>
  <section className="scene-section">
   <div className="case-bar"><button className="case-number" onClick={()=>selectCase((index+1)%CASES.length)} title="下一个案例">CASE {String(index+1).padStart(2,'0')} / 06</button><div className="case-title"><h1>{current.name}</h1><p>{current.type} · {current.field} · {current.label} {prob()} <span>→ {pass===null?'not evaluated':pass?'gate passed':'human review'}</span></p></div><div className="stages">{['STATE','ASK','JEV','GATE','CODE'].map((s,i)=><span key={s} className={Math.floor(time*1.4)%5===i?'active':''}>{s}</span>)}</div></div>
   <div className="stage">
    <Loom key={resetKey} paused={paused} cameraMode={camera} intensity={intensity} onReady={setReady}/>
    {ready===false&&<div className="webgl-error">当前浏览器无法启动 WebGL。请在支持硬件加速的浏览器中打开此 Demo。</div>}
    <div className="scene-corner top-left"/><div className="scene-corner top-right"/><div className="scene-corner bottom-left"/><div className="scene-corner bottom-right"/>
    <div className="lane-label choice"><b>CHOICE</b><span>pick one label · visual</span></div><div className="lane-label score"><b>SCORE</b><span>ordered labels · visual</span></div><div className="lane-label noul"><b>NOUL</b><span>yes / no · visual</span></div>
    <div className="float-label float-one"><b>P(ANSWER) {prob(6)}</b><span>typed result · no generation</span></div><div className="float-label float-two"><b>CONTEXT → JUDGMENT</b><span>one state · parallel heads</span></div>
    <div className="scene-caption"><i className={paused?'paused':''}/>{paused?'PAUSED':camera==='orbit'?'CAM 01 · ORBIT / AUTO':camera==='front'?'CAM 02 · FRONT / GRID':'CAM 03 · SIDE / DEPTH'}<span>DRAG TO ROTATE</span></div>
    <div className="scene-toolbar"><button onClick={()=>setPaused(p=>!p)} title={paused?'播放':'暂停'} aria-label={paused?'播放':'暂停'}>{paused?<Play size={14} weight="fill"/>:<Pause size={14} weight="fill"/>}</button><button onClick={()=>setCamera(c=>c==='orbit'?'front':c==='front'?'side':'orbit')} title="切换镜头">{camera.toUpperCase()}</button><button onClick={()=>{if(busy)return;setTime(0);setIndex(0);setResult(null);setError('');setAuto(!live);setCamera('orbit');setPaused(false);setResetKey(k=>k+1);}} title="重新播放" aria-label="重新播放"><ArrowCounterClockwise size={14}/></button></div>
   </div>
  </section>
  <section className="telemetry">
   <Panel title="STREAMS · IN" tag="visual only"><div className="streams">{['CHOICE','SCORE','NOUL'].map((name,j)=><div key={name} style={{color:COLORS[j]}}><div>{name}<span>{live?'visual':`${[463,310,475][j]}/s`}</span></div><div className="stream-dots">{Array.from({length:26},(_,i)=><i key={i} style={{opacity:Math.sin(i*8+j*3+Math.floor(time*3))>.1?1:.12}}/>)}</div></div>)}</div><div className="panel-foot">Choice · Score · Noul in parallel</div></Panel>
   <Panel title="PROBABILITY STREAM" tag="visual only"><Chart time={time}/><div className="legend">{['Choice','Score','Noul'].map((s,i)=><span key={s} style={{color:COLORS[i]}}>{s}</span>)}<span>time →</span></div></Panel>
   <Panel title="ACTION MATRIX" tag="visual only"><Chart time={time} kind="matrix"/><div className="panel-foot">answers → typed actions</div></Panel>
   <Panel title="client.py" tag="example" className="code-panel"><pre><span>from</span> typesafe_sdk <span>import</span> Choice, Score, Noul{'\n'}<span>import</span> jevframe.pandas{'\n\n'}result = <span>await</span> df.jev.{current.type.toLowerCase()}({'\n'}  <mark>"{current.field.replaceAll('_',' ')}?"</mark>,{'\n'}  state=<mark>"text"</mark>{current.type==='Choice'&&index===3?',\n  choices=["type_destination", "click_search", "wait", "ask_user"]':current.type==='Choice'?',\n  choices=["billing", "sales", "support"]':current.type==='Score'?',\n  levels=["low", "medium", "high"]':''}{'\n'})</pre></Panel>
  </section>
  <section className="bottom-panels">
   <Panel title="RUN LOG" tag={live?(busy?'running':result?'live result':'not evaluated'):(paused?'paused':'replay')}><div className="log"><p><span>STATE</span>context received <b>{current.cn}</b></p><p><span>JEV</span>{current.field} <b>{prob()}</b></p><p><span>GATE</span>{pass===null?'waiting for Jev result':pass?'probability above threshold':'probability below threshold'}</p><p className={pass?'ok':'warning'}><span>CODE</span>{pass===null?'no action':pass?current.result:'held → human_review'}</p></div></Panel>
   <Panel title="THE SPLIT" tag="who does what"><div className="split"><div>LLM writes<span className="dim">······················</span></div><div>Jev decides<span>▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮</span></div><div>code acts<span>▮▮▮▮▮▮▮▮▮▮▮▮▮▮</span></div></div></Panel>
   <Panel title="GUARDRAILS" tag="always on"><div className="guard"><label htmlFor="threshold">review gate <input id="threshold" aria-label="人工复核阈值" type="range" min="50" max="99" value={Math.round(threshold*100)} onChange={e=>setThreshold(+e.target.value/100)}/><b>{threshold.toFixed(2)}</b></label><div>actions <span>draft only</span><b>0 sent</b></div><p>human approval before execution</p></div></Panel>
  </section>
  <footer><div className="case-tabs">{CASES.map((c,i)=><button className={i===index?'selected':''} onClick={()=>selectCase(i)} key={c.name} title={c.cn}>{String(i+1).padStart(2,'0')}<span>{c.cn}</span></button>)}</div><div className="footer-controls"><label className="glow-control">GLOW<input aria-label="辉光强度" type="range" min="0" max="2" step=".1" value={intensity} onChange={e=>setIntensity(+e.target.value)}/></label><button disabled={live} className={auto?'auto-on':''} onClick={()=>setAuto(a=>!a)}>{auto?'AUTO ON':'AUTO OFF'}</button><span className="local-tag">LOCAL DEMO</span></div></footer>
  {securityOpen&&<SecurityPanel close={()=>setSecurityOpen(false)}/>}
  {apiOpen&&<JevPanel name={current.cn} text={text} setText={editText} status={status} checkStatus={checkStatus} busy={busy} error={error} result={result} run={runJev} close={()=>setApiOpen(false)}/>}
  {info&&<div className="modal-backdrop" onClick={()=>setInfo(false)}><section className="info-modal" role="dialog" aria-modal="true" aria-label="关于这个 Demo" onClick={e=>e.stopPropagation()}><button className="close" aria-label="关闭说明" onClick={()=>setInfo(false)}><X size={20}/></button><div className="eyebrow">JEV / SIGNAL LOOM</div><h2>把判断，变成看得见的信号。</h2><p>根据你提供的视频制作的交互式视觉 Demo。粒子、数字矩阵和镜头均为实时 WebGL 渲染。</p><div className="info-note">演示模式使用合成数据。JEV API 面板可提交当前文本进行真实判断；真实结果显示返回概率和实测耗时，费用以 TypeSafe 账单为准。粒子与曲线始终为视觉演示，不代表模型内部计算。</div><h3>{current.cn}</h3><blockquote>{current.text}</blockquote><p>{current.desc}</p><div className="info-links"><a href="https://github.com/ktaletsk/jevframe" target="_blank" rel="noreferrer">jevframe 文档 <ArrowRight size={14}/></a></div><p className="shortcut">空格：暂停 / 播放 · 拖动：旋转 · 下方编号：切换案例</p></section></div>}
 </main>;
}
