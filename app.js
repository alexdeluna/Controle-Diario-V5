/******************************
 * ESTADO GLOBAL E PERSISTÊNCIA
 ******************************/
let estado = JSON.parse(localStorage.getItem('controleDiarioV5')) || {
  turnoAtual: null,
  turnos: [],
  metas: { valorMensal: 0, compromissos: [] }
};

function salvar() { localStorage.setItem('controleDiarioV5', JSON.stringify(estado)); }

/******************************
 * UTILITÁRIOS
 ******************************/
function formatarMinutosParaHHMM(minutosTotais) {
  const horas = Math.floor(minutosTotais / 60);
  const minutos = Math.round(minutosTotais % 60); 
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}h`;
}

function diffHoras(h1, h2) {
  const [aH, aM] = h1.split(':').map(Number);
  const [bH, bM] = h2.split(':').map(Number);
  let inicio = aH * 60 + aM; let fim = bH * 60 + bM;
  if (fim < inicio) fim += 24 * 60;
  return fim - inicio; 
}

function tratarEntradaHora(valor) {
  let num = valor.replace(/\D/g, '');
  if (num.length === 3) num = '0' + num;
  if (num.length === 4) {
    const hh = num.substring(0, 2); const mm = num.substring(2, 4);
    if (parseInt(hh) < 24 && parseInt(mm) < 60) return `${hh}:${mm}`;
  }
  return valor; 
}

function validarHora(hora) { return /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/.test(hora); }

function irPara(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  const telaDestino = document.getElementById(id);
  if (telaDestino) {
    telaDestino.classList.add('ativa');
    if (id === 'resumoTurno') carregarResumoTurno();
    if (id === 'resumoDia') carregarResumoDia();
    if (id === 'historicoGeral') carregarHistoricoGeral();
    if (id === 'metasMensais') carregarTelaMetas();
  }
}

function capturarHora(id) {
  const d = new Date();
  document.getElementById(id).value = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/******************************
 * FLUXO DO TURNO
 ******************************/
function confirmarInicioTurno() {
  const inputHora = document.getElementById('horaInicio');
  inputHora.value = tratarEntradaHora(inputHora.value);
  const km = Number(document.getElementById('kmInicial').value);
  if (!validarHora(inputHora.value) || isNaN(km) || km <= 0) { alert('Verifique Hora e KM!'); return; }
  
  estado.turnoAtual = {
    data: new Date().toISOString().split('T')[0],
    horaInicio: inputHora.value, kmInicial: km, horaFim: '', kmFinal: 0,
    custos: { abastecimento: 0, outros: 0 }, apurado: 0
  };
  salvar(); irPara('menu');
}

function adicionarAbastecimento() {
  const v = Number(document.getElementById('valorAbastecimento').value);
  if (v > 0 && estado.turnoAtual) {
    estado.turnoAtual.custos.abastecimento += v;
    document.getElementById('totalAbastecido').value = estado.turnoAtual.custos.abastecimento.toFixed(2);
    document.getElementById('valorAbastecimento').value = '';
    atualizarTotalCustos(); salvar();
     mostrarAvisoSalvo();
  }
}

function adicionarOutrosCustos() {
  const v = Number(document.getElementById('valorOutrosCustos').value);
  if (v > 0 && estado.turnoAtual) {
    estado.turnoAtual.custos.outros += v;
    document.getElementById('totalOutrosCustos').value = estado.turnoAtual.custos.outros.toFixed(2);
    document.getElementById('valorOutrosCustos').value = '';
    atualizarTotalCustos(); salvar();
     mostrarAvisoSalvo();
  }
}

function atualizarTotalCustos() {
  if (estado.turnoAtual) {
    const total = estado.turnoAtual.custos.abastecimento + estado.turnoAtual.custos.outros;
    document.getElementById('totalCustos').value = total.toFixed(2);
  }
}

function inserirApurado() {
  const v = Number(document.getElementById('apurado').value);
  if (estado.turnoAtual) { estado.turnoAtual.apurado = v || 0; salvar(); alert('Ganhos salvos!'); irPara('menu'); }
}

function confirmarFimTurno() {
  const inputHora = document.getElementById('horaFim');
  inputHora.value = tratarEntradaHora(inputHora.value);
  const km = Number(document.getElementById('kmFinal').value);
  
  // 1. Captura o valor digitado no novo campo 'apurado'
  const valorApurado = Number(document.getElementById('apurado').value);

  // Validação de segurança
  if (!estado.turnoAtual || !validarHora(inputHora.value) || km <= estado.turnoAtual.kmInicial) { 
    alert('Verifique Hora e KM Final!'); 
    return; 
  }
  
  // 2. Grava os dados finais no objeto temporário
  estado.turnoAtual.horaFim = inputHora.value;
  estado.turnoAtual.kmFinal = km;
  estado.turnoAtual.apurado = valorApurado || 0; // Adiciona o ganho aqui

  // 3. Move para o histórico (Arquivamento igual ao seu código)
  estado.turnos.push({ ...estado.turnoAtual });
  
  // 4. Limpa o turno atual para o próximo uso
  estado.turnoAtual = null;
  
  salvar();
  
  // Limpa o campo visual para não aparecer o valor do dia anterior na próxima vez
  document.getElementById('apurado').value = '';
  
  alert('Turno Finalizado e Arquivado!');
  irPara('resumoDia'); 
}

function salvarTurnoNoHistorico() {
  if (estado.turnoAtual && estado.turnoAtual.horaFim) {
    estado.turnos.push({ ...estado.turnoAtual });
    estado.turnoAtual = null;
    salvar();
    alert('Turno arquivado!');
    irPara('menu'); // volta corretamente para o menu
  }
}

/******************************
 * METAS E CUSTOS FIXOS
 ******************************/
function atualizarMetaMensal() {
  const v = Number(document.getElementById('valorMetaMensal').value);
  if (v > 0) { estado.metas.valorMensal = v; salvar(); carregarResumoMetas(); alert('Meta atualizada!'); }
}

function apagarMetaMensal() {
  if(confirm('Deseja apagar meta e custos fixos?')) {
    estado.metas.valorMensal = 0; estado.metas.compromissos = [];
    salvar(); carregarTelaMetas(); alert('Limpo!');
  }
}

function inserirCustoFixo() {
  const desc = document.getElementById('descricaoCustoFixo').value.trim();
  const valor = Number(document.getElementById('valorCustoFixo').value);
  if (desc && valor > 0) {
    estado.metas.compromissos.push({ id: Date.now(), nome: desc, valor: valor });
    document.getElementById('descricaoCustoFixo').value = '';
    document.getElementById('valorCustoFixo').value = '';
    salvar(); renderizarListaCustosFixos(); carregarResumoMetas();
  }
}

function excluirCustoFixo(id) {
  estado.metas.compromissos = estado.metas.compromissos.filter(c => c.id !== id);
  salvar(); renderizarListaCustosFixos(); carregarResumoMetas();
}

function editarNomeCustoFixo(index, novoNome) {
  if (novoNome.trim()) { estado.metas.compromissos[index].nome = novoNome.trim(); salvar(); carregarResumoMetas(); }
}

function editarValorCustoFixo(index, novoValor) {
  const v = Number(novoValor);
  if (v >= 0) { estado.metas.compromissos[index].valor = v; salvar(); renderizarListaCustosFixos(); carregarResumoMetas(); }
}

function renderizarListaCustosFixos() {
  const lista = document.getElementById('listaCustosFixos'); 
  lista.innerHTML = ''; 
  let total = 0;

  estado.metas.compromissos.forEach((c) => {
    total += c.valor;
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="info-custo">
        <span class="nome-item">${c.nome}</span>
        <span class="valor-item">R$ ${c.valor.toFixed(2)}</span>
      </div>
      <button class="btn-deletar" onclick="excluirCustoFixo(${c.id})">🗑️</button>
    `;
    lista.appendChild(li);
  });
  document.getElementById('totalCustosFixos').value = total.toFixed(2);
}

function carregarTelaMetas() {
  document.getElementById('valorMetaMensal').value = estado.metas.valorMensal || '';
  renderizarListaCustosFixos(); carregarResumoMetas();
}

function carregarResumoMetas() {
  const lucroTurnos = estado.turnos.reduce((acc, t) => acc + (t.apurado - (t.custos.abastecimento + t.custos.outros)), 0);
  const totalFixos = estado.metas.compromissos.reduce((acc, c) => acc + c.valor, 0);
  const falta = Math.max(estado.metas.valorMensal - lucroTurnos, 0);
  document.getElementById('resumoSuaMeta').value = `R$ ${estado.metas.valorMensal.toFixed(2)}`;
  document.getElementById('resumoTotalCustosFixos').value = `R$ ${totalFixos.toFixed(2)}`;
  document.getElementById('resumoLucroDoMes').value = `R$ ${lucroTurnos.toFixed(2)}`;
  document.getElementById('resumoFaltaParaMeta').value = `R$ ${falta.toFixed(2)}`;
}

/******************************
 * RESUMOS E HISTÓRICO
 ******************************/
function carregarResumoTurno() {
  const t = estado.turnoAtual; if (!t) return;
  const min = diffHoras(t.horaInicio, t.horaFim);
  const custos = t.custos.abastecimento + t.custos.outros;
  const lucro = t.apurado - custos;
  document.getElementById('resumoHoras').innerText = formatarMinutosParaHHMM(min);
  document.getElementById('resumoKM').innerText = `${t.kmFinal - t.kmInicial} km`;
  document.getElementById('resumoCustos').innerText = `R$ ${custos.toFixed(2)}`;
  document.getElementById('resumoLucro').innerText = `R$ ${lucro.toFixed(2)}`;
  document.getElementById('resumoValorHora').innerText = `R$ ${((min/60)>0 ? lucro/(min/60) : 0).toFixed(2)}/h`;
}

function carregarResumoDia() {
  const hoje = new Date().toISOString().split('T')[0];
  const turnos = estado.turnos.filter(t => t.data === hoje);
  let lucro = 0, km = 0, min = 0, gas = 0, out = 0, apur = 0;
  turnos.forEach(t => {
    min += diffHoras(t.horaInicio, t.horaFim); km += (t.kmFinal - t.kmInicial);
    gas += t.custos.abastecimento; out += t.custos.outros; apur += t.apurado;
    lucro += (t.apurado - (t.custos.abastecimento + t.custos.outros));
  });
  document.getElementById('diaHorasTrabalhadas').innerText = formatarMinutosParaHHMM(min);
  document.getElementById('diaKM').innerText = `${km} km`;
  document.getElementById('diaAbastecido').innerText = `R$ ${gas.toFixed(2)}`;
  document.getElementById('diaOutrosCustos').innerText = `R$ ${out.toFixed(2)}`;
  document.getElementById('diaApurado').innerText = `R$ ${apur.toFixed(2)}`;
  document.getElementById('diaLucro').innerText = `R$ ${lucro.toFixed(2)}`;
  document.getElementById('diaValorHora').innerText = `R$ ${((min/60)>0?lucro/(min/60):0).toFixed(2)}/h`;
}

function carregarHistoricoGeral() {
  const lista = document.getElementById('listaHistorico'); lista.innerHTML = '';
  const turnosPorDia = estado.turnos.reduce((acc, t) => {
    if (!acc[t.data]) acc[t.data] = [];
    acc[t.data].push(t); return acc;
  }, {});

  Object.keys(turnosPorDia).sort((a,b) => new Date(b) - new Date(a)).forEach(data => {
    turnosPorDia[data].forEach((t, i) => {
      const idx = estado.turnos.indexOf(t);
      const min = diffHoras(t.horaInicio, t.horaFim);
      const lucro = t.apurado - (t.custos.abastecimento + t.custos.outros);
      const li = document.createElement('li');
      li.style = "position:relative; border:1px solid #ccc; padding:15px; margin-bottom:15px; border-radius:8px; background:#fff; font-size:14px;";
      li.innerHTML = `
        <div style="display:flex; justify-content:center; margin-bottom:8px; border-bottom:1px solid #eee;">
        <strong>Turno ${i + 1} — ${new Date(data+'T00:00:00').toLocaleDateString('pt-BR')}</strong>
        </div>
        <p>Horário: ${t.horaInicio} - ${t.horaFim} (${formatarMinutosParaHHMM(min)})</p>
        <p>KM: ${t.kmFinal - t.kmInicial} km</p>
        <p>Gastos: R$ ${(t.custos.abastecimento + t.custos.outros).toFixed(2)}</p>
        <p>Apurado: R$ ${t.apurado.toFixed(2)}</p>
        <p>Lucro: <strong style="color:green">R$ ${lucro.toFixed(2)}</strong></p>
        <p>V/h: R$ ${((min/60)>0?lucro/(min/60):0).toFixed(2)}/h</p>
        <button onclick="deletarTurno(${idx})" style="position:absolute; top:10px; right:10px; color:red; border:none; background:none;">X</button>`;
      lista.appendChild(li);
    });
  });
}

function deletarTurno(index) { if (confirm('Excluir turno?')) { estado.turnos.splice(index, 1); salvar(); carregarHistoricoGeral(); } }
function limparTodoHistorico() { if (confirm('Apagar tudo?')) { estado.turnos = []; salvar(); carregarHistoricoGeral(); } }

function exportarExcel() {
  let csv = "\ufeffData;Turno;Horas;KM;Gas;Outros;Apurado;Lucro;Vh\n";
  estado.turnos.forEach((t, i) => {
    const min = diffHoras(t.horaInicio, t.horaFim);
    const lucro = t.apurado - (t.custos.abastecimento + t.custos.outros);
    csv += `${t.data};${i+1};${formatarMinutosParaHHMM(min)};${t.kmFinal-t.kmInicial};${t.custos.abastecimento};${t.custos.outros};${t.apurado};${lucro.toFixed(2)};${((min/60)>0?lucro/(min/60):0).toFixed(2)}\n`;
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  link.download = "historico.csv"; link.click();
}

function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape');
  const col = ["Data", "Turno", "Horas", "KM", "Gas", "Outros", "Apurado", "Lucro", "V/h"];
  const rows = estado.turnos.map(t => {
    const min = diffHoras(t.horaInicio, t.horaFim);
    const lucro = t.apurado - (t.custos.abastecimento + t.custos.outros);
    return [t.data, formatarMinutosParaHHMM(min), t.kmFinal-t.kmInicial, t.custos.abastecimento.toFixed(2), t.custos.outros.toFixed(2), t.apurado.toFixed(2), lucro.toFixed(2), ((min/60)>0?lucro/(min/60):0).toFixed(2)];
  });
  doc.text("Relatório Geral - V5", 10, 10);
  doc.autoTable({ head: [col], body: rows, startY: 20, styles: { fontSize: 8 } });
  doc.save("historico.pdf");
}

if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js'); }); }

function mostrarAvisoSalvo() {
  const aviso = document.getElementById('status-salvamento');
  aviso.style.opacity = '1';
  setTimeout(() => {
    aviso.style.opacity = '0';
  }, 2000); // O aviso some após 2 segundos
}

/**********************************************
 * FUNÇÃO DE SINCRONIZAÇÃO (CORAÇÃO DO APP)
 * Esta função garante que a tela mostre o que está salvo
 **********************************************/
function sincronizarInterface() {
  const t = estado.turnoAtual;
  const estaAtivo = t !== null;

  // 1. Atualiza Status do Menu
  const statusBadge = document.getElementById('statusTrabalho');
  if (statusBadge) {
    statusBadge.innerText = estaAtivo ? "🟢 Em Turno" : "🔴 Off-line";
    statusBadge.style.color = estaAtivo ? "#2ecc71" : "#e74c3c";
  }

  // 2. Trava/Destrava Botões do Menu
  document.getElementById('btnIrInicio').disabled = estaAtivo;
  document.getElementById('btnIrCustos').disabled = !estaAtivo;
  document.getElementById('btnIrFim').disabled = !estaAtivo;

  // 3. Se houver turno ativo, preenche os campos automaticamente
  if (estaAtivo) {
    if(document.getElementById('totalAbastecido')) 
      document.getElementById('totalAbastecido').value = t.custos.abastecimento.toFixed(2);
    if(document.getElementById('totalOutrosCustos')) 
      document.getElementById('totalOutrosCustos').value = t.custos.outros.toFixed(2);
    if(document.getElementById('totalCustos')) 
      document.getElementById('totalCustos').value = (t.custos.abastecimento + t.custos.outros).toFixed(2);
  }
}

/**********************************************
 * VALIDAÇÕES DE SEGURANÇA
 **********************************************/
function confirmarFimTurno() {
  const inputHora = document.getElementById('horaFim');
  inputHora.value = tratarEntradaHora(inputHora.value);
  const kmF = Number(document.getElementById('kmFinal').value);
  const valorApurado = Number(document.getElementById('apurado').value);

  // Bloqueia erro de KM menor que o inicial
  if (kmF <= estado.turnoAtual.kmInicial) {
    alert(`Erro: KM Final (${kmF}) não pode ser menor ou igual ao Inicial (${estado.turnoAtual.kmInicial})!`);
    return;
  }

  if (!validarHora(inputHora.value)) {
    alert("Hora inválida!");
    return;
  }

  // Gravação Final
  estado.turnoAtual.horaFim = inputHora.value;
  estado.turnoAtual.kmFinal = kmF;
  estado.turnoAtual.apurado = valorApurado || 0;

  estado.turnos.push({ ...estado.turnoAtual });
  estado.turnoAtual = null;
  
  salvar();
  sincronizarInterface(); // Atualiza o menu após encerrar
  alert('Turno Arquivado!');
  irPara('resumoDia');
}

// Inicialização ao abrir o app
window.onload = () => {
  if(document.getElementById('dataAtual')) 
    document.getElementById('dataAtual').innerText = new Date().toLocaleDateString('pt-BR');
  sincronizarInterface();
};







