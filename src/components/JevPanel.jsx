import { X } from '@phosphor-icons/react';
export default function JevPanel({ name, text, setText, status, checkStatus, busy, error, result, run, close }) {
 return <div className="modal-backdrop" onClick={close}><section className="info-modal jev-panel" role="dialog" aria-modal="true" aria-label="Jev API 连接" onClick={e=>e.stopPropagation()}>
  <button className="close" aria-label="关闭 API 面板" onClick={close}><X size={20}/></button>
  <div className="eyebrow">LOCAL BACKEND → TYPESAFE JEV</div><h2>运行真实 Jev 判断</h2>
  <div className="api-status"><span>{status===null?'正在检查后端…':status.offline?'后端未连接':status.configured?'Key 已配置 · 尚未验证有效性':'未配置 Key'}</span><button onClick={checkStatus} disabled={busy}>重新检查</button></div>
  <p>本仓库仅包含前端。真实调用需另行部署兼容后端，并在服务端配置 API Key；不要把 Key 填入网页或提交到 GitHub。</p>
  <label htmlFor="jev-text">{name} · 输入文本</label><textarea id="jev-text" value={text} maxLength={8000} disabled={busy} onChange={e=>setText(e.target.value)} />
  <p className="api-note">点击运行会将这段文本发送给 TypeSafe，可能产生 API 费用。一次运行仅判断当前案例；自动轮播不会调用 API。</p>
  {error&&<div className="api-error" role="alert">{error}</div>}
  {result&&<div className="api-result" role="status"><b>{result.label} · {(result.probability*100).toFixed(1)}%</b><span>选项概率 · {result.elapsed_ms} ms</span><div>{Object.entries(result.probabilities).map(([k,v])=><p key={k}>{k}<span>{(v*100).toFixed(1)}%</span></p>)}</div>{result.confidence!=null&&<small>SDK confidence：{result.confidence.toFixed(4)}（与选项概率分开）</small>}{result.score!=null&&<small>期望评分：{result.score.toFixed(3)}</small>}</div>}
  <button className="run-jev" disabled={busy||!text.trim()} onClick={run}>{busy?'Jev 正在判断…':'运行 Jev'}</button>
  <p className="shortcut">{result?'真实结果已同步到主面板。':'未运行时显示 WAIT，不会以模拟概率代替。'} 粒子与曲线仍为视觉演示。</p>
 </section></div>;
}
