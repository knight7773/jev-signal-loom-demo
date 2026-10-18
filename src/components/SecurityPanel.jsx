import {useEffect,useState} from 'react';
import {X,ArrowSquareOut,DownloadSimple} from '@phosphor-icons/react';
export default function SecurityPanel({close}){
 const [data,setData]=useState(null),[selected,setSelected]=useState('edgeX'),[filter,setFilter]=useState('all'),[error,setError]=useState(''),[judgment,setJudgment]=useState(null),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch('/security-review.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(setData).catch(()=>setError('无法读取核验记录，请刷新后重试。'));},[]);
 const current=data?.programs.find(p=>p.name===selected);
 async function review(){setBusy(true);setJudgment(null);setError('');try{const r=await fetch('/api/security/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({program_id:current.id})});const v=await r.json();if(!r.ok)throw Error(typeof v.detail==='string'?v.detail:'服务暂不可用');setJudgment(v);}catch(e){setError(e.message);}finally{setBusy(false);}}
 function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='dex-scope-review-2026-10-18.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <div className="modal-backdrop security-backdrop"><section className="security-panel" role="dialog" aria-modal="true" aria-label="DEX 安全范围核验">
 <div className="security-heading"><div><div className="eyebrow">JEV / SECURITY WORKSPACE</div><h2>DEX 账号安全评估</h2><p>公开计划核验 · {data?.review_date??'加载中'} · 不代表漏洞检测结果</p></div><button aria-label="关闭安全看板" onClick={close}><X size={22}/></button></div>
 {data&&<><div className="security-metrics"><div><b>15</b><span>评估清单</span></div><div><b>{data.programs.filter(p=>p.reviewed).length}</b><span>已查阅官方计划</span></div><div><b>0</b><span>主动测试 / 注册账户</span></div><div><b>—</b><span>漏洞结论尚不可得</span></div></div>
 <div className="security-flow"><span className="done">01 公开政策</span><span className="partial">02 资产与环境</span><span>03 受控账户</span><span>04 最小验证</span><span>05 人工复核</span></div>
 <div className="security-body"><aside><label htmlFor="security-filter">筛选计划</label><select id="security-filter" disabled={busy} value={filter} onChange={e=>{const f=e.target.value;setFilter(f);const items=data.programs.filter(p=>f==='all'||(f==='reviewed'?p.reviewed:!p.reviewed));if(!items.some(p=>p.name===selected)){setSelected(items[0].name);setJudgment(null);setError('')}}}><option value="all">全部 15 家</option><option value="reviewed">已查阅 7 家</option><option value="pending">尚待核验 8 家</option></select><div className="security-list">{data.programs.filter(p=>filter==='all'||(filter==='reviewed'?p.reviewed:!p.reviewed)).map(p=><button disabled={busy} className={p.name===selected?'selected':''} key={p.id} onClick={()=>{setSelected(p.name);setJudgment(null);setError('')}}><b>{p.name}</b><span>{p.scope}</span></button>)}</div></aside>
 <article><div className="security-target"><h3>{current.name}</h3><span>未测试 · 无漏洞结论</span></div><p className="scope-summary">{current.summary}</p>
 <dl><dt>账号相关性</dt><dd>{current.relevance}</dd><dt>公开列出的资产</dt><dd>{current.assets.length?current.assets.map(a=><div key={a}>{a}</div>):'未确认'}</dd><dt>测试环境与限制</dt><dd>{current.environment}</dd><dt>下一步</dt><dd>{current.next_step}</dd></dl>
 <div className="security-sources"><h4>官方证据来源</h4>{current.sources.length?current.sources.map((url,i)=><a key={url} href={url} target="_blank" rel="noreferrer">{i+1}. {new URL(url).hostname}<ArrowSquareOut size={13}/></a>):<p>尚未核验官方政策；不表示不存在计划。</p>}</div>
 <div className="security-ai"><div><h4>Jev 辅助分类</h4><p>仅发送上方公开摘要，不包含账户、邮箱或 Token。结果不能覆盖官方规则或证明漏洞。</p></div><button disabled={busy||!current.reviewed} onClick={review}>{busy?'正在分析…':'分析公开摘要'}</button></div>
 {judgment&&<div className="api-result"><b>{judgment.label} · {(judgment.probability*100).toFixed(1)}%</b><span>{judgment.elapsed_ms} ms · 真实 Jev 返回，非授权判定</span></div>}
 {error&&<div className="api-error" role="alert">{error}</div>}
 </article></div><div className="security-bottom"><span>未访问私人数据 · 未发送越权请求 · 未创建第三方交易账户</span><button onClick={download}><DownloadSimple size={15}/>导出核验记录</button></div></>}
 {!data&&<p>{error||'正在加载公开核验记录…'}</p>}
 </section></div>;
}
