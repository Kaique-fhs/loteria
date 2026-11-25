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
function embaralhar(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// ---------- regras dos filtros ----------
function cumpre(jogo, f){
  const n = jogo.length;
  const pares = jogo.filter(x => x%2===0).length, impares = n - pares;
  const primos = jogo.filter(x => PRIMOS.has(x)).length;
  switch(f.par){
    case 'eq': if(Math.abs(pares-impares) > 1) return false; break;
    case 'mp': if(pares <= impares) return false; break;
    case 'mi': if(impares <= pares) return false; break;
    case 'sp': if(impares) return false; break;
    case 'si': if(pares) return false; break;
  }
  switch(f.primo){
    case '0': if(primos) return false; break;
    case 'ate2': if(primos > 2) return false; break;
    case 'min2': if(primos < 2) return false; break;
    case 'so': if(primos !== n) return false; break;
  }
  if(f.acima && jogo.filter(x => x > 31).length < 2) return false;
  if(f.seq && maiorSequencia(jogo) >= 3) return false;
  return true;
}

function gerar(e){
  if(e) e.preventDefault();
  const msg = $('fMsg'); msg.textContent = '';
  const qtd = +$('fQtd').value;
  const data = numsDaData($('fData').value);
  if(data.erro){ msg.textContent = data.erro; return; }
  const fora = new Set(lerLista($('fFora').value));
  const obrig = [...new Set([...lerLista($('fFixo').value), ...data.nums])];
  const conflito = obrig.filter(n => fora.has(n));
  if(conflito.length){ msg.textContent = `O número ${conflito.join(', ')} está em "devem entrar" e em "não podem entrar".`; return; }
  if(obrig.length > qtd){ msg.textContent = `Você fixou ${obrig.length} números, mais do que os ${qtd} do jogo. Aumente a quantidade ou tire algum.`; return; }
  const f = { par: $('fPar').value, primo: $('fPrimo').value, acima: $('fAcima').checked, seq: $('fSeq').checked };
  const livres = []; for(let n=1;n<=60;n++) if(!fora.has(n) && !obrig.includes(n)) livres.push(n);
  if(livres.length < qtd - obrig.length){ msg.textContent = 'Sobraram poucos números livres. Tire alguns de "não podem entrar".'; return; }

  // filtros "só pares/ímpares/primos" e "nenhum primo" restringem os candidatos antes de sortear
  let cand = livres;
  if(f.par === 'sp') cand = cand.filter(x => x%2===0);
  if(f.par === 'si') cand = cand.filter(x => x%2===1);
  if(f.primo === 'so') cand = cand.filter(x => PRIMOS.has(x));
  if(f.primo === '0') cand = cand.filter(x => !PRIMOS.has(x));
  if(cand.length < qtd - obrig.length){ msg.textContent = 'Com esses filtros não há números suficientes para o jogo. Diminua a quantidade de números ou afrouxe algum filtro.'; return; }

  for(let t=0;t<40000;t++){
    const jogo = obrig.concat(embaralhar(cand.slice()).slice(0, qtd - obrig.length));
    if(cumpre(jogo, f)){
      escolha = new Set(jogo); fixos = new Set(obrig);
      desenharVolante(); analisar();
      msg.textContent = data.nums.length ? `Da data entraram: ${data.nums.join(', ')}.` : '';
      return;
    }
  }
  msg.textContent = 'Não achei um jogo que atenda a todos os filtros juntos. Afrouxe algum deles (por exemplo, pares ou primos).';
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
  desenharVolante(); analisar();
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
  desenharVolante(); gerar(); desenharResultados();
})();
