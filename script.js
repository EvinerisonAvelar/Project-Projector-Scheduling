// Importar e configurar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAuz7p8hwBYbYwe-W2xw6s1m80ToA93Lx4",
    authDomain: "projeto-agendamento-projetor.firebaseapp.com",
    projectId: "projeto-agendamento-projetor",
    storageBucket: "projeto-agendamento-projetor.firebasestorage.app",
    messagingSenderId: "388443857631",
    appId: "1:388443857631:web:b3a11057f365d27058bf6a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("agendamento-form");
    const projetorSelect = document.getElementById("projetor");
    const horariosContainer = document.getElementById("horarios-container");
    const tabelaAgendamentos = document.getElementById("tabela-agendamentos");
    
    function obterProximoDiaUtil() {
        let hoje = new Date();
        let diaAgendamento = new Date(hoje);
    
        if (hoje.getHours() >= 17) {
            diaAgendamento.setDate(hoje.getDate() + 1);
        }
    
        while (diaAgendamento.getDay() === 6 || diaAgendamento.getDay() === 0) {
            diaAgendamento.setDate(diaAgendamento.getDate() + 1);
        }
    
        return diaAgendamento.toISOString().split('T')[0];
    }

    async function carregarAgendamentos() {
        const querySnapshot = await getDocs(collection(db, "agendamentos"));
        let agendamentos = [];
        querySnapshot.forEach((doc) => {
            agendamentos.push({ id: doc.id, ...doc.data() });
        });
        return agendamentos;
    }

    async function atualizarHorariosDisponiveis() {
        const projetorSelecionado = projetorSelect.value;
        horariosContainer.innerHTML = "";
    
        const horarios = ["1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º"];
        const agendamentos = await carregarAgendamentos();
        const dataFormatada = obterProximoDiaUtil();
    
        const horariosOcupados = agendamentos
            .filter(a => a.projetor === projetorSelecionado && a.data === dataFormatada)
            .map(a => a.horario);
    
        horarios.forEach(horario => {
            const label = document.createElement("label");
            label.style.display = "inline-flex";
            label.style.alignItems = "center";
            label.style.marginRight = "10px";
    
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = horario;
            checkbox.name = "horario";
    
            if (horariosOcupados.includes(horario)) {
                checkbox.disabled = true;
                label.classList.add("horario-indisponivel");
            } else {
                label.classList.add("horario-disponivel");
            }
    
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(horario));
            horariosContainer.appendChild(label);
        });
    }

    async function atualizarListaAgendamentos() {
        if (!tabelaAgendamentos) return;
        tabelaAgendamentos.innerHTML = "<tr><th>Professor</th><th>Projetor</th><th>Horários</th><th>Data</th></tr>";
        const agendamentos = await carregarAgendamentos();
        
        const agendamentosAgrupados = {};
        agendamentos.forEach(a => {
            const chave = `${a.professor}-${a.projetor}-${a.data}`;
            if (!agendamentosAgrupados[chave]) {
                agendamentosAgrupados[chave] = { professor: a.professor, projetor: a.projetor, horarios: [], data: a.data };
            }
            agendamentosAgrupados[chave].horarios.push(a.horario);
        });
        
        Object.values(agendamentosAgrupados).forEach(a => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${a.professor}</td><td>${a.projetor}</td><td>${a.horarios.sort().join(", ")}</td><td>${a.data}</td>`;
            tabelaAgendamentos.appendChild(tr);
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const professor = document.getElementById("professor").value;
            const projetor = projetorSelect.value;
            const horariosSelecionados = Array.from(document.querySelectorAll("input[name='horario']:checked"))
                .map(cb => cb.value);
            const dataFormatada = obterProximoDiaUtil();

            if (!professor || !projetor || horariosSelecionados.length === 0) return;

            for (let horario of horariosSelecionados) {
                await addDoc(collection(db, "agendamentos"), { professor, projetor, horario, data: dataFormatada });
            }
            atualizarHorariosDisponiveis();
            atualizarListaAgendamentos();
            form.reset();
        });

        projetorSelect.addEventListener("change", atualizarHorariosDisponiveis);
        atualizarHorariosDisponiveis();
    }
    atualizarListaAgendamentos();

    async function limparAgendamentosDiarios() {
        const agora = new Date();
        const dataAtual = agora.toISOString().split('T')[0];
        const ultimaLimpezaDoc = await getDocs(query(collection(db, "ultimaLimpeza"), where("data", "==", dataAtual)));
        
        if (agora.getHours() === 17 && ultimaLimpezaDoc.empty) {  
            const querySnapshot = await getDocs(collection(db, "agendamentos"));
            querySnapshot.forEach(async (docSnap) => {
                await deleteDoc(doc(db, "agendamentos", docSnap.id));
            });
            await setDoc(doc(db, "ultimaLimpeza", dataAtual), { data: dataAtual });
            atualizarListaAgendamentos();
        }
    }
    setInterval(limparAgendamentosDiarios, 60000);
});
