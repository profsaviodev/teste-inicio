
// --- INICIALIZAÇÃO E CONTROLE DE ABAS ---
window.addEventListener('load', () => {
    new window.VLibras.Widget('https://vlibras.gov.br/app');
    atualizarTabelaGamificacao();
});

function mostrarAba(id) {
    document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.remove('ativa'));
    document.getElementById(id).classList.add('ativa');
}

// --- KIOSK MODE (CONTROLE DE EVASÃO) E SEGURANÇA ---
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        document.getElementById('tela-bloqueio').style.display = 'flex';
        let historico = JSON.parse(localStorage.getItem('db_progresso')) || [];
        historico.push(`INFRAÇÃO: Evasão de foco/tela detectada às ${new Date().toLocaleTimeString()}`);
        localStorage.setItem('db_progresso', JSON.stringify(historico));
        
        // Simulação de alerta
        console.warn("SMS/EMAIL enviado para responsáveis e coordenação.");
    }
});

function desbloquearTela() {
    const senha = document.getElementById('senha-prof').value;
    if(senha === '1234') {
        document.getElementById('tela-bloqueio').style.display = 'none';
        document.getElementById('senha-prof').value = '';
    } else {
        alert("Senha Administrativa Incorreta!");
    }
}

// --- CADASTRO E IMPORTAÇÃO DE DB ---
document.getElementById('form-perfil').addEventListener('submit', (e) => {
    e.preventDefault();
    const aluno = { nome: document.getElementById('nome-aluno').value, perfil: document.getElementById('perfil-aluno').value };
    localStorage.setItem('aluno_atual', JSON.stringify(aluno));
    alert('Paciente registrado e sessão protegida iniciada.');
});

function importarDatabase() {
    const file = document.getElementById('arquivo-import-db').files[0];
    if(!file) return alert("Selecione um arquivo de pré-cadastro (.json ou .txt).");
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            localStorage.setItem('db_psico_ia', JSON.stringify(data));
            document.getElementById('status-db').innerHTML = `<p style="color:green">Base Psicológica de IA importada com sucesso!</p>`;
        } catch(err) { alert("Arquivo JSON Inválido."); }
    };
    reader.readAsText(file);
}

// --- GEOLOCALIZAÇÃO (MAPS) ---
function carregarMapa() {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            let lat = pos.coords.latitude;
            let lon = pos.coords.longitude;
            document.getElementById('mapa-frame').src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lon}`;
        }, err => { alert("Permissão de localização negada ou erro de GPS."); });
    }
}

// --- COMANDOS DE VOZ E VLIBRAS ---
let recognition;
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        let textoFinal = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) textoFinal += event.results[i][0].transcript;
        
        let caixa = document.getElementById('caixa-legendas');
        caixa.innerText = textoFinal;
        
        // Simula clique na caixa para forçar leitura pelo widget VLibras (se o usuário ativar leitura automática)
        caixa.dataset.texto = textoFinal;
    };
}

function processarComando(cmd) {
    if(!recognition) return alert("Navegador não suporta gravação de voz.");
    if(cmd === 'iniciar') {
        recognition.lang = document.getElementById('idioma-reconhecimento').value;
        try { recognition.start(); document.getElementById('status-mic').className = "badge-alerta"; document.getElementById('status-mic').innerText = "Mic Ligado"; } catch(e){}
    } else if(cmd === 'parar') {
        recognition.stop();
        document.getElementById('status-mic').className = "badge-inativo"; document.getElementById('status-mic').innerText = "Mic Desligado";
    } else if(cmd === 'gravar') {
        alert("Áudio e transcrição gravados nos registros da sessão.");
    }
}

// --- VISÃO COMPUTACIONAL (CORRIGIDA) ---
let modeloIA, videoIA, canvasIA, ctxIA, loopIA;
async function iniciarVisaoComputacional() {
    if (location.protocol === 'file:') {
        alert("⚠️ ATENÇÃO: O navegador bloqueia acesso à câmera em arquivos locais. Você DEVE rodar este sistema usando um servidor (ex: extensão Live Server no VSCode).");
    }
    
    videoIA = document.getElementById('video-ia');
    canvasIA = document.getElementById('canvas-ia');
    ctxIA = canvasIA.getContext('2d');
    document.getElementById('texto-objetos-detectados').innerText = "Carregando motor IA (pode demorar alguns segundos)...";

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoIA.srcObject = stream;
        modeloIA = await cocoSsd.load();
        document.getElementById('texto-objetos-detectados').innerText = "IA Ativa. Analisando...";
        loopIA = setInterval(analisarVideo, 1500);
    } catch(err) {
        document.getElementById('texto-objetos-detectados').innerText = "Erro: Câmera não permitida ou erro de Servidor Local.";
    }
}

async function analisarVideo() {
    if (!modeloIA) return;
    const predictions = await modeloIA.detect(videoIA);
    canvasIA.width = videoIA.videoWidth; canvasIA.height = videoIA.videoHeight;
    ctxIA.clearRect(0, 0, canvasIA.width, canvasIA.height);

    if (predictions.length > 0) {
        let objeto = predictions[0];
        ctxIA.strokeStyle = "#ef4444"; ctxIA.lineWidth = 4;
        ctxIA.strokeRect(objeto.bbox[0], objeto.bbox[1], objeto.bbox[2], objeto.bbox[3]);
        
        // Simulação de análise semântica
        let texto = `IA detectou: ${objeto.class}. `;
        if(objeto.class === "cell phone") texto += "⚠️ ALERTA: Risco de quebra de foco!";
        document.getElementById('texto-objetos-detectados').innerText = texto;
    }
}

// --- ENGINE DE JOGOS: MEMÓRIA, REAÇÃO E O NOVO QUEBRA-CABEÇA ---
function iniciarEngineJogo() {
    const tipo = document.getElementById('seletor-jogo').value;
    const nivel = parseInt(document.getElementById('nivel-jogo').value) || 1;
    const area = document.getElementById('area-jogo-dinamico');
    area.innerHTML = '';

    if(tipo === 'memoria') renderizarMemoriaProcedural(area, nivel);
    if(tipo === 'reacao') renderizarReacaoProcedural(area, nivel);
    if(tipo === 'quebra-cabeca') renderizarQuebraCabeca(area, nivel);
}

// NOVO JOGO: Quebra-Cabeça Analítico de Cores
function renderizarQuebraCabeca(area, nivel) {
    area.innerHTML = `<h3>Quebra-Cabeça Lógico - Nível ${nivel}</h3>
                      <p>Desafio: Clique nas peças até que todas fiquem da mesma cor.</p>
                      <div id="grid-puzzle" class="tabuleiro-jogo" style="grid-template-columns: repeat(3, 1fr);"></div>`;
    
    const grid = document.getElementById('grid-puzzle');
    const cores = ['#0369a1', '#16a34a', '#ef4444']; // Cores da paleta
    let tamanho = nivel > 50 ? 16 : 9; // Aumenta a grade em níveis altos
    if(nivel > 50) grid.style.gridTemplateColumns = "repeat(4, 1fr)";
    
    let estado = Array.from({length: tamanho}, () => cores[Math.floor(Math.random() * cores.length)]);
    let movimentos = 0;

    function renderizarGrade() {
        grid.innerHTML = '';
        estado.forEach((cor, i) => {
            let peca = document.createElement('div');
            peca.className = 'carta-jogo virada';
            peca.style.background = cor;
            peca.style.height = '60px';
            peca.onclick = () => {
                let corAtual = cores.indexOf(estado[i]);
                estado[i] = cores[(corAtual + 1) % cores.length];
                movimentos++;
                renderizarGrade();
                verificarVitoria();
            };
            grid.appendChild(peca);
        });
    }

    function verificarVitoria() {
        if (estado.every(c => c === estado[0])) {
            alert(`Quebra-cabeça resolvido em ${movimentos} movimentos!`);
            registrarMeta(`Quebra-cabeça Nível ${nivel} concluído (${movimentos} mov.)`);
            area.innerHTML = "<p>Parabéns! Nível superado.</p>";
        }
    }
    renderizarGrade();
}

function renderizarMemoriaProcedural(area, nivel) { area.innerHTML = `<p>Memória Nível ${nivel} carregada (simulação).</p>`; registrarMeta(`Teste de Memória acessado (Nível ${nivel})`); }
function renderizarReacaoProcedural(area, nivel) { area.innerHTML = `<p>Reação Nível ${nivel} carregada (simulação).</p>`; registrarMeta(`Teste de Reação acessado (Nível ${nivel})`); }

function registrarMeta(texto) {
    let historico = JSON.parse(localStorage.getItem('db_progresso')) || [];
    historico.push(texto);
    localStorage.setItem('db_progresso', JSON.stringify(historico));
    atualizarTabelaGamificacao();
}

function atualizarTabelaGamificacao() {
    let h = JSON.parse(localStorage.getItem('db_progresso')) || [];
    document.getElementById('lista-metas-gamificacao').innerHTML = h.reverse().map(i => `<p>🎯 ${i}</p>`).join('');
}

// --- RELATÓRIO IA (LLM SIMULADO) ---
function gerarRelatorioIA() {
    const aluno = JSON.parse(localStorage.getItem('aluno_atual'));
    const progresso = JSON.parse(localStorage.getItem('db_progresso')) || [];
    const basePsico = JSON.parse(localStorage.getItem('db_psico_ia')) || [];
    
    let dadosIA = basePsico.find(p => aluno && p.perfil === aluno.perfil);
    let analiseProcurada = dadosIA ? dadosIA.analise_ia : "Perfil sem parâmetros de IA importados. Use o Pré-Cadastro.";

    let txt = `==============================================\n`;
    txt += ` LAUDO ALGORÍTMICO LLM - SAVIO SPA BIOLOGICS\n`;
    txt += `==============================================\n\n`;
    txt += `PACIENTE: ${aluno ? aluno.nome : 'N/A'}\n`;
    txt += `PERFIL CLÍNICO: ${aluno ? aluno.perfil : 'N/A'}\n\n`;
    
    txt += `[ PARÂMETROS DA INTELIGÊNCIA ARTIFICIAL (Base Importada) ]\n${analiseProcurada}\n\n`;
    
    txt += `[ LOGS DE INTERAÇÃO, GAMIFICAÇÃO E KIOSK MODE ]\n`;
    progresso.forEach(p => txt += `- ${p}\n`);
    
    txt += `\n[ CONCLUSÃO ALGORÍTMICA ]\nRecomenda-se a continuidade do acompanhamento com foco nas áreas apontadas pelos jogos cognitivos.`;

    document.getElementById('box-relatorio').value = txt;
}
