/******************************
 * ESTADO GLOBAL E PERSISTÊNCIA
 ******************************/
let estado = JSON.parse(localStorage.getItem('controleDiarioV5')) || {
  turnoAtual: null,
  turnos: [],
  metas: { valorMensal: 0, compromissos: [] }
};

function salvar() { 
  localStorage.setItem('controleDiarioV5', JSON.stringify(estado)); 
}

/******************************
 * UTILITÁRIOS
 ******************************/
function formatarMinutosParaHHMM(minutosTotais) {
  const horas = Math.floor(minutosTotais / 60);
  const minutos = Math.round(minutosTotais % 60); 
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}h`;
}

function diffHoras(h1, h2) {
  if (!h1 || !h2) return 0;
  const [aH, aM] = h1.split(':').map(Number);
  const [bH, bM] = h2.split(':').map(Number);
  let inicio = aH * 60 + aM; let fim = bH * 60 + bM;
  if (fim < inicio) fim += 24 * 60;
  return fim - inicio; 
}

function validarHora(hora) { 
  return /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/.test(hora); 
}

function mascaraHora(input) {
  let v = input.value.replace(/\D/g, ""); 
  if (v.length > 4) v = v.slice(0, 4);    
  if (v.length >= 3) {
    v = v.substring(0, 2) + ":" + v.substring(2, 4);
  }
  input.value = v;
}

function irPara(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  const telaDestino = document.getElementById(id);
  if (telaDestino) {
    telaDestino.classList.add('ativa');
    if (id === 'resumoDia') carregarResumoDia();
    if (id === 'historicoGeral') carregarHistoricoGeral();
    if (id === 'metasMensais') carregarTelaMetas();
  }
}

function capturarHora(id) {
  const d = new Date();
  const horaFormatada = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  document.getElementById(id).value = horaFormatada;
}

/******************************
 * SINCRONIZAÇÃO E STATUS
 ******************************/
function sincronizarInterface() {
  const t = estado.turnoAtual;
  const estaAtivo = t !== null;

  const statusBadge = document.getElementById('statusTrabalho');
  if (statusBadge) {
    statusBadge.innerText = estaAtivo ? "🟢 Em Turno" : "🔴 Off-line";
    statusBadge.style.color = estaAtivo ? "#2ecc71" : "#e74c3c";
  }

  if(document.getElementById('btnIrInicio')) document.getElementById('btnIrInicio').disabled = estaAtivo;
  if(document.getElementById('btnIrCustos')) document.getElementById('btnIrCustos').disabled = !estaAtivo;
  if(document.getElementById('btnIrFim')) document.getElementById('btnIrFim').disabled = !estaAtivo;

  if (estaAtivo) {
    if(document.getElementById('totalAbastecido')) document.getElementById('totalAbastecido').value = t.custos.abastecimento.toFixed(2);
    if(document.getElementById('totalOutrosCustos')) document.getElementById('totalOutrosCustos').value = t.custos.outros.toFixed(2);
    if(document.getElementById('totalCustos')) document.getElementById('totalCustos').value = (t.custos.abastecimento + t.custos.outros).toFixed(2);
  }
}

/******************************
 * FLUXO DO TURNO
 ******************************/
function confirmarInicioTurno() {
  const inputHora = document.getElementById('horaInicio');
  const km = Number(document.getElementById('kmInicial').value);

  if (!validarHora(inputHora.value) || isNaN(km) || km <= 0) { 
    alert('Verifique Hora (00:00) e KM Inicial!'); 
    return; 
  }
  
  estado.turnoAtual = {
    data: new Date().toISOString().split('T')[0],
    horaInicio: inputHora.value, 
    kmInicial: km, 
    horaFim: '', 
    kmFinal: 0,
    custos: { abastecimento: 0, outros: 0 }, 
    apurado: 0
  };
  
  salvar();
  sincronizarInterface();
  irPara('menu');
}

function adicionarAbastecimento() {
  const v = Number(document.getElementById('valorAbastecimento').value);
  if (v > 0 && estado.turnoAtual) {
    estado.turnoAtual.custos.abastecimento += v;
    document.getElementById('totalAbastecido').value = estado.turnoAtual.custos.abastecimento.toFixed(2);
    document.getElementById('valorAbastecimento').value = '';
    atualizarTotalCustos(); 
    salvar();
    mostrarAvisoSalvo();
  }
}

function adicionarOutrosCustos() {
  const v = Number(document.getElementById('valorOutrosCustos').value);
  if (v > 0 && estado.turnoAtual) {
    estado.turnoAtual.custos.outros += v;
    document.getElementById('totalOutrosCustos').value = estado.turnoAtual.custos.outros.toFixed(2);
    document.getElementById('valorOutrosCustos').value = '';
    atualizarTotalCustos(); 
    salvar();
    mostrarAvisoSalvo();
  }
}

function atualizarTotalCustos() {
  if (estado.turnoAtual) {
    const total = estado.turnoAtual.custos.abastecimento + estado.turnoAtual.custos.outros;
    document.getElementById('totalCustos').value = total.toFixed(2);
  }
}

function confirmarFimTurno() {
  const inputHora = document.getElementById('horaFim');
  const kmF = Number(document.getElementById('kmFinal').value);
  const valorApurado = Number(document.getElementById('apurado').value);

  if (!estado.turnoAtual || !validarHora(inputHora.value) || kmF <= estado.turnoAtual.kmInicial) {
    alert(`Erro: Verifique a hora e se o KM Final é maior que o Inicial!`);
    return;
  }

  estado.turnoAtual.horaFim = inputHora.value;
  estado.turnoAtual.kmFinal = kmF;
  estado.turnoAtual.apurado = valorApurado || 0;

  estado.turnos.push({ ...estado.turnoAtual });
  estado.turnoAtual = null;
  
  salvar();
  sincronizarInterface();
  alert('Turno Finalizado!');
  irPara('resumoDia');
}

/******************************
 * METAS E HISTÓRICO (RESUMIDO)
 ******************************/
function carregarTelaMetas() {
  document.getElementById('valorMetaMensal').value = estado.metas.valorMensal || '';
  renderizarListaCustosFixos();
}

function renderizarListaCustosFixos() {
  const lista = document.getElementById('listaCustosFixos'); 
  if(!lista) return;
  lista.innerHTML = ''; 
  let total = 0;
  estado.metas.compromissos.forEach((c) => {
    total += c.valor;
    const li = document.createElement('li');
    li.innerHTML = `<span>${c.nome}: R$ ${c.valor.toFixed(2)}</span>
                    <button onclick="excluirCustoFixo(${c.id})" style="width:40px; padding:5px;">🗑️</button>`;
    lista.appendChild(li);
  });
  document.getElementById('totalCustosFixos').value = total.toFixed(2);
}

function inserirCustoFixo() {
  const desc = document.getElementById('descricaoCustoFixo').value;
  const valor = Number(document.getElementById('valorCustoFixo').value);
  if (desc && valor > 0) {
    estado.metas.compromissos.push({ id: Date.now(), nome: desc, valor: valor });
    salvar(); renderizarListaCustosFixos();
  }
}

function excluirCustoFixo(id) {
  estado.metas.compromissos = estado.metas.compromissos.filter(c => c.id !== id);
  salvar(); renderizarListaCustosFixos();
}

function carregarResumoDia() {
  const hoje = new Date().toISOString().split('T')[0];
  const turnos = estado.turnos.filter(t => t.data === hoje);
  let lucro = 0, km = 0, min = 0;
  turnos.forEach(t => {
    min += diffHoras(t.horaInicio, t.horaFim);
    km += (t.kmFinal - t.kmInicial);
    lucro += (t.apurado - (t.custos.abastecimento + t.custos.outros));
  });
  document.getElementById('diaHorasTrabalhadas').innerText = formatarMinutosParaHHMM(min);
  document.getElementById('diaKM').innerText = `${km} km`;
  document.getElementById('diaLucro').innerText = `R$ ${lucro.toFixed(2)}`;
}

function carregarHistoricoGeral() {
  const lista = document.getElementById('listaHistorico'); 
  if(!lista) return;
  lista.innerHTML = '';
  estado.turnos.slice().reverse().forEach((t, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${t.data}</strong>: ${t.horaInicio}-${t.horaFim} | Lucro: R$ ${(t.apurado - (t.custos.abastecimento + t.custos.outros)).toFixed(2)}`;
    lista.appendChild(li);
  });
}

function mostrarAvisoSalvo() {
  const aviso = document.getElementById('status-salvamento');
  if(aviso) {
    aviso.style.opacity = '1';
    setTimeout(() => { aviso.style.opacity = '0'; }, 2000);
  }
}

/******************************
 * INICIALIZAÇÃO
 ******************************/
window.onload = () => {
  // Mostra a data
  if(document.getElementById('dataAtual')) {
    document.getElementById('dataAtual').innerText = new Date().toLocaleDateString('pt-BR');
  }

  // Aplica máscaras nos campos de hora
  const camposHora = ['horaInicio', 'horaFim'];
  camposHora.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => mascaraHora(e.target));
    }
  });

  sincronizarInterface();
};
