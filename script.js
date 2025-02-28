// Importar e configurar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAuz7p8hwBYbYwe-W2xw6s1m80ToA93Lx4",
    authDomain: "projeto-agendamento-projetor.firebaseapp.com",
    projectId: "projeto-agendamento-projetor",
    storageBucket: "projeto-agendamento-projetor.firebasestorage.app",
    messagingSenderId: "388443857631",
    appId: "1:388443857631:web:b3a11057f365d27058bf6a",
    measurementId: "G-KCYMLTJW7K"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("agendamento-form");
    const projetorSelect = document.getElementById("projetor");
    const horariosContainer = document.getElementById("horarios-container");
    const tabelaAgendamentos = document.getElementById("tabela-agendamentos");

    function obterProximoDiaUtil() {
        let hoje = new Date();
        let diaAgendamento = new Date(hoje);

        // Se for sábado (6) ou domingo (0), avança para segunda-feira
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

    async function registrarUltimaLimpeza(data) {
        const configRef = doc(db, "config", "ultimaLimpeza");
        await setDoc(configRef, { dataLimpeza: data });
    }

    async function obterUltimaLimpeza() {
        const configRef = doc(db, "config", "ultimaLimpeza");
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
            return docSnap.data().dataLimpeza;
        } else {
            return null;
        }
    }

    async function limparAgendamentosDiarios() {
        const agora = new Date();
        const dataAtual = agora.toISOString().split('T')[0];
        
        const ultimaLimpeza = await obterUltimaLimpeza();
        
        if (agora.getHours() >= 17 && ultimaLimpeza !== dataAtual) {
            const querySnapshot = await getDocs(collection(db, "agendamentos"));
            querySnapshot.forEach(async (docSnap) => {
                await deleteDoc(doc(db, "agendamentos", docSnap.id));
            });

            await registrarUltimaLimpeza(dataAtual);
            atualizarListaAgendamentos();
        }
    }

    setInterval(limparAgendamentosDiarios, 60000);

    atualizarListaAgendamentos();
});
