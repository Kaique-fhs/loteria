// Aba "Escolher números" e aba "Resultados".
// Usa VIRADAS (dados/viradas.js) e as funções C, TOTAL, fmt, brl, pct, $ do index.html.

const PRIMOS = new Set([2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59]);
const PRECO_SIMPLES = () => Math.max(0.5, parseFloat(document.getElementById('preco').value) || 6);

let escolha = new Set();   // números marcados no volante
let fixos = new Set();     // números que vieram de "devem entrar" ou da data

// ---------- utilidades ----------
function lerLista(txt){
  return [...new Set((txt.match(/\d+/g) || []).map(Number).filter(n => n >= 1 && n <= 60))];
}
function numsDaData(txt){
  const m = txt.match(/^\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?\s*$/);
  if(!m) return { nums: [], erro: txt.trim() ? 'Data inválida. Use o formato dd/mm/aaaa.' : '' };
  const dia = +m[1], mes = +m[2];
  if(dia < 1 || dia > 31 || mes < 1 || mes > 12) return { nums: [], erro: 'Data inválida: confira o dia e o mês.' };
  const nums = [dia, mes];
  if(m[3]){ const a2 = +m[3] % 100; if(a2 >= 1 && a2 <= 60) nums.push(a2); }
  return { nums: [...new Set(nums)], erro: '' };
}
function maiorSequencia(arr){
  const s = [...arr].sort((a,b)=>a-b); let best = s.length ? 1 : 0, cur = 1;
  for(let i=1;i<s.length;i++){ cur = s[i]===s[i-1]+1 ? cur+1 : 1; best = Math.max(best,cur); }
  return best;
}

// ---------- regras dos filtros ----------
// Contador exato: quantos jogos atendem a todos os filtros juntos.
// Percorre os números de 1 a 60 decidindo "entra" ou "fica de fora", guardando só o que os
// filtros ativos precisam (quantidade, pares, primos, números acima de 31, sequência atual).
// Total 0 = combinação impossível. Também sorteia um jogo uniforme entre os válidos.
const MEMO = new Float64Array(61*16*16*4*3*3);

function lerFiltros(over){
  return Object.assign({ qtd: +$('fQtd').value, par: $('fPar').value, primo: $('fPrimo').value,
    acima: $('fAcima').checked, seq: $('fSeq').checked }, over || {});
}
function lerNumeros(){
  const data = numsDaData($('fData').value);
  const fora = new Set(lerLista($('fFora').value));
  const obrig = [...new Set([...lerLista($('fFixo').value), ...data.nums])];
  return { data, fora, obrig };
}

function resolver(f, obrig, fora){
  const forcado = new Uint8Array(61), pode = new Uint8Array(61);
  obrig.forEach(n => forcado[n] = 1);
  for(let n=1;n<=60;n++){
    let ok = !fora.has(n);
    if(f.par === 'sp' && n%2) ok = false;
    if(f.par === 'si' && !(n%2)) ok = false;
    if(f.primo === 'so' && !PRIMOS.has(n)) ok = false;
    if(f.primo === '0' && PRIMOS.has(n)) ok = false;
    pode[n] = ok ? 1 : 0;
  }
  const usaPar = ['eq','mp','mi'].includes(f.par), usaPrimo = f.primo === 'ate2' || f.primo === 'min2';
  MEMO.fill(-1);
  const chave = (i,k,ev,pr,ac,run) => ((((i*16+k)*16+ev)*4+pr)*3+ac)*3+run;
  function fim(k,ev,pr,ac){
    if(k !== f.qtd) return 0;
    const od = k - ev;
    if(f.par === 'eq' && Math.abs(ev-od) > 1) return 0;
    if(f.par === 'mp' && ev <= od) return 0;
    if(f.par === 'mi' && od <= ev) return 0;
    if(f.primo === 'ate2' && pr > 2) return 0;
    if(f.primo === 'min2' && pr < 2) return 0;
    if(f.acima && ac < 2) return 0;
    return 1;
  }
  function pula(i,k,ev,pr,ac){ return forcado[i] ? 0 : w(i+1,k,ev,pr,ac,0); }
  function pega(i,k,ev,pr,ac,run){
    if(!pode[i] || k >= f.qtd || (f.seq && run >= 2)) return 0;
    return w(i+1, k+1, usaPar ? ev + (i%2===0) : 0, usaPrimo ? Math.min(3, pr + PRIMOS.has(i)) : 0,
      f.acima ? Math.min(2, ac + (i>31)) : 0, f.seq ? run+1 : 0);
  }
  function w(i,k,ev,pr,ac,run){
    if(i > 60) return fim(k,ev,pr,ac);
    const id = chave(i,k,ev,pr,ac,run);
    if(MEMO[id] >= 0) return MEMO[id];
    return MEMO[id] = pula(i,k,ev,pr,ac) + pega(i,k,ev,pr,ac,run);
  }
  const total = w(1,0,0,0,0,0);
  return {
    total,
    sortear(){
      const jogo = []; let k=0, ev=0, pr=0, ac=0, run=0;
      for(let i=1;i<=60;i++){
        const wp = pega(i,k,ev,pr,ac,run), ws = pula(i,k,ev,pr,ac);
        if(Math.random()*(wp+ws) < wp){
          jogo.push(i); k++;
          if(usaPar) ev += (i%2===0);
          if(usaPrimo) pr = Math.min(3, pr + PRIMOS.has(i));
          if(f.acima) ac = Math.min(2, ac + (i>31));
          if(f.seq) run++;
        } else run = 0;
      }
      return jogo;
    }
  };
}

// Por que não dá: mensagem para o usuário quando o total é zero.
function motivo(f, nums){
  const { data, fora, obrig } = nums;
  if(data.erro) return data.erro;
  const conflito = obrig.filter(n => fora.has(n));
  if(conflito.length) return `O número ${conflito.join(', ')} está em "devem entrar" e em "não podem entrar".`;
  if(obrig.length > f.qtd) return `Você fixou ${obrig.length} números, mais do que os ${f.qtd} do jogo. Aumente a quantidade ou tire algum.`;
  return 'Os números fixos ou excluídos não combinam com os filtros escolhidos. Mude os números ou algum filtro.';
}

// Apaga as opções que levariam a uma combinação impossível.
function atualizarBloqueios(){
  const nums = lerNumeros(), base = lerFiltros();
  const viavel = over => !nums.data.erro && resolver(lerFiltros(over), nums.obrig, nums.fora).total > 0;
  let algumBloqueado = false;
  [['fQtd','qtd',Number],['fPar','par',String],['fPrimo','primo',String]].forEach(([id,campo,conv]) => {
    const sel = $(id);
    [...sel.options].forEach(o => {
      if(!o.dataset.t) o.dataset.t = o.textContent;
      const ok = o.value === sel.value || viavel({ [campo]: conv(o.value) });
      o.disabled = !ok;
      o.textContent = o.dataset.t + (ok ? '' : ' (impossível)');
      if(!ok) algumBloqueado = true;
    });
  });
  [['fAcima','lAcima','acima'],['fSeq','lSeq','seq']].forEach(([id,lab,campo]) => {
    const cb = $(id);
    const ok = cb.checked || viavel({ [campo]: true });
    cb.disabled = !ok; $(lab).classList.toggle('bloq', !ok);
    $(lab).title = ok ? '' : 'Impossível junto com os outros filtros';
    if(!ok) algumBloqueado = true;
  });
  $('fNota').hidden = !algumBloqueado;
  const total = nums.data.erro ? 0 : resolver(base, nums.obrig, nums.fora).total;
  const atual = total > 0;
  mostrarConta(total, base.qtd);
  $('fGerar').disabled = !atual;
  if(!atual) $('fMsg').textContent = motivo(base, nums);
  else if($('fMsg').dataset.bloq) $('fMsg').textContent = '';
  $('fMsg').dataset.bloq = atual ? '' : '1';
  return atual;
}

// Quantos jogos existem com os filtros: só aparece depois que a pessoa mexe em algum filtro.
let filtrou = false;
function mostrarConta(total, qtd){
  const el = $('fConta');
  if(!filtrou){ el.hidden = true; return; }
  el.hidden = false;
  if(!total){ el.innerHTML = '<b>0 jogos possíveis</b><span>Nenhum jogo atende a essa combinação.</span>'; return; }
  const todos = C(60, qtd);
  el.innerHTML = `<b>${fmt(Math.round(total))} ${total === 1 ? 'jogo possível' : 'jogos possíveis'}</b>`
    + `<span>com esses filtros, de ${fmt(todos)} jogos de ${qtd} números (${pct(total/todos)}).</span>`;
}

// Mudou um filtro: atualiza bloqueios e contagem e sugere um jogo na cartela.
function aoFiltrar(){
  filtrou = true;
  if(atualizarBloqueios()) gerar();
}

function gerar(e){
  if(e){ e.preventDefault(); filtrou = true; }
  const msg = $('fMsg');
  if(!atualizarBloqueios()) return;
  const f = lerFiltros(), nums = lerNumeros();
  const jogo = resolver(f, nums.obrig, nums.fora).sortear();
  escolha = new Set(jogo); fixos = new Set(nums.obrig);
  desenharVolante(); analisar();
  msg.textContent = nums.data.nums.length ? `Da data entraram: ${nums.data.nums.join(', ')}.` : '';
}

// ---------- volante e análise ----------
function desenharVolante(){
  const v = $('volante');
  if(!v.children.length){
    for(let n=1;n<=60;n++){
      const b = document.createElement('button'); b.type='button'; b.textContent = String(n).padStart(2,'0'); b.dataset.n = n;
      b.addEventListener('click', () => {
        if(escolha.has(n)){ escolha.delete(n); fixos.delete(n); }
        else if(escolha.size >= 15){ $('fMsg').textContent = 'O volante aceita no máximo 15 números aqui.'; return; }
        else escolha.add(n);
        $('fMsg').textContent = ''; desenharVolante(); analisar();
      });
      v.appendChild(b);
    }
  }
  [...v.children].forEach(b => {
    const n = +b.dataset.n;
    b.classList.toggle('on', escolha.has(n)); b.classList.toggle('fixo', fixos.has(n));
    b.setAttribute('aria-pressed', escolha.has(n));
  });
  const s = [...escolha].sort((a,b)=>a-b);
  $('escolhidos').innerHTML = s.map(n => `<span class="ball">${String(n).padStart(2,'0')}</span>`).join('');
}

function analisar(){
  const jogo = [...escolha].sort((a,b)=>a-b), n = jogo.length, el = $('analise');
  if(n < 6){ el.innerHTML = `<div class="it full"><span>Marque pelo menos 6 números</span><b>${n} de 6 marcados</b></div>`; return; }
  const pares = jogo.filter(x=>x%2===0).length, primos = jogo.filter(x=>PRIMOS.has(x)).length;
  const ate31 = jogo.filter(x=>x<=31).length, soma = jogo.reduce((a,b)=>a+b,0), seq = maiorSequencia(jogo);
  const comb = C(n,6), custo = comb * PRECO_SIMPLES();

  const alertas = [];
  if(ate31 === n) alertas.push('Todos os números vão até 31: padrão de datas, muito jogado');
  if(seq >= 3) alertas.push(`Tem ${seq} números seguidos: padrão muito jogado`);
  const dif = jogo.slice(1).map((x,i)=>x-jogo[i]);
  if(n >= 4 && dif.every(d => d === dif[0])) alertas.push('Números em intervalo fixo: padrão muito jogado');
  if(jogo.every(x => x % 10 === jogo[0] % 10) || jogo.every(x => Math.floor((x-1)/10) === Math.floor((jogo[0]-1)/10))) alertas.push('Tudo na mesma coluna ou linha do volante: padrão muito jogado');
  const tags = alertas.length
    ? alertas.map(a => `<span class="tagp alerta">${a}</span>`).join('')
    : '<span class="tagp okk">Sem padrão popular evidente</span>';

  // acertos nas Viradas passadas (curiosidade)
  const hist = VIRADAS.map(v => ({ ano: v.ano, ac: v.dezenas.filter(d => escolha.has(d)).length }));
  const melhor = Math.max(...hist.map(h => h.ac));
  const melhores = hist.filter(h => h.ac === melhor && melhor > 0).map(h => h.ano);

  el.innerHTML = `
    <div class="it"><span>Custo do jogo</span><b>${brl(custo)}</b></div>
    <div class="it"><span>Chance da sena</span><b>${fmt(comb)} em ${fmt(TOTAL)}</b></div>
    <div class="it"><span>Pares · ímpares</span><b>${pares} · ${n-pares}</b></div>
    <div class="it"><span>Primos</span><b>${primos}</b></div>
    <div class="it"><span>Até 31 · acima de 31</span><b>${ate31} · ${n-ate31}</b></div>
    <div class="it"><span>Soma dos números</span><b>${soma}</b></div>
    <div class="it full"><span>Risco de dividir o prêmio</span>${tags}
      <div class="hist" style="margin-top:6px">${ate31===n ? 'Em 2018 as seis dezenas foram até 33 e o prêmio foi dividido entre <b>52 ganhadores</b> (R$ 5,8 milhões cada). Em 2021, com 46 e 32 no jogo, foram só 2 ganhadores (R$ 189 milhões cada).' : 'Jogos com números acima de 31 costumam ter menos gente apostando igual, então o prêmio tende a ser dividido com menos pessoas.'}</div>
    </div>
    <div class="it full"><span>Se você tivesse jogado este jogo nas Viradas passadas</span>
      <div class="hist">${melhor ? `Melhor resultado: <b>${melhor} acerto${melhor>1?'s':''}</b> em ${melhores.join(', ')}.` : 'Nenhum acerto em nenhuma edição.'}
      ${hist.filter(h=>h.ac>=4).length ? ' Teria ganho: ' + hist.filter(h=>h.ac>=4).map(h=>`${h.ac===6?'sena':h.ac===5?'quina':'quadra'} em ${h.ano}`).join(', ') + '.' : ''}
      O passado não muda a chance do próximo sorteio; isto é só curiosidade.</div>
    </div>`;
}

function limpar(){
  escolha = new Set(); fixos = new Set();
  ['fData','fFixo','fFora'].forEach(id => $(id).value = '');
  $('fPar').value = 'qq'; $('fPrimo').value = 'qq'; $('fMsg').textContent = '';
  filtrou = false; atualizarBloqueios(); desenharVolante(); analisar();
}

// ---------- aba Resultados ----------
function bolas(arr){ return `<span class="bl">${arr.map(n=>`<span class="ball sm on">${String(n).padStart(2,'0')}</span>`).join('')}</span>`; }

function desenharResultados(){
  const lista = VIRADAS.slice().sort((a,b)=>b.ano-a.ano);
  const maxG = Math.max(...VIRADAS.map(v=>v.g6));
  $('rBody').innerHTML = lista.map(v => `
    <tr class="${v.g6===maxG?'top':''}">
      <td><b>${v.ano}</b>${v.data.endsWith(String(v.ano)) ? '' : `<small style="display:block;color:var(--mut)">sorteio em ${v.data}</small>`}</td>
      <td>${v.concurso}</td>
      <td>${bolas(v.dezenas)}</td>
      <td>${v.g6 ? fmt(v.g6) : 'Acumulou'}</td>
      <td>${v.g6 ? brl(v.p6) : '—'}</td>
      <td>${v.arrecadado ? brl(v.arrecadado) : 'não informado'}</td>
    </tr>`).join('');

  const maior = VIRADAS.reduce((a,b)=> b.p6 > a.p6 ? b : a);
  const recorde = VIRADAS.find(v => v.g6 === maxG);
  const ult = lista[0];
  $('destaques').innerHTML = `
    <div><b>${brl(maior.p6)}</b><span>maior prêmio por ganhador (${maior.ano}, ${maior.g6} ganhadores)</span></div>
    <div><b>${recorde.g6} ganhadores</b><span>em ${recorde.ano}, com as dezenas ${recorde.dezenas.join(', ')}: todas até 33, faixa muito usada por quem joga datas. Cada um levou ${brl(recorde.p6)}.</span></div>
    <div><b>${brl(ult.arrecadado)}</b><span>arrecadados na edição de ${ult.ano}, a maior da série</span></div>`;

  const cont = Array(61).fill(0); VIRADAS.forEach(v => v.dezenas.forEach(d => cont[d]++));
  const mx = Math.max(...cont);
  $('nSort').textContent = VIRADAS.length;
  let html = '';
  for(let g=0; g<4; g++){
    html += '<div class="freq">';
    for(let n=g*15+1; n<=g*15+15; n++){
      html += `<div class="c ${cont[n]===mx?'mx':''}" title="${n}: ${cont[n]} vez(es)"><span class="v">${cont[n]||''}</span><div class="b" style="height:${cont[n]/mx*80}%"></div><span class="n">${String(n).padStart(2,'0')}</span></div>`;
    }
    html += '</div>';
  }
  $('freq').innerHTML = html;
}

// ---------- início ----------
(function(){
  const sel = $('fQtd');
  for(let n=6;n<=15;n++){ const o=document.createElement('option'); o.value=n; o.textContent=`${n} números · ${brl(C(n,6)*PRECO_SIMPLES())}`; sel.appendChild(o); }
  $('filtros').addEventListener('submit', gerar);
  $('fLimpar').addEventListener('click', limpar);
  $('filtros').addEventListener('change', aoFiltrar);
  let espera; $('filtros').addEventListener('input', ev => {
    if(ev.target.tagName !== 'INPUT' || ev.target.type === 'checkbox') return;
    clearTimeout(espera); espera = setTimeout(aoFiltrar, 400);
  });
  atualizarBloqueios(); desenharVolante(); analisar(); desenharResultados();
})();
