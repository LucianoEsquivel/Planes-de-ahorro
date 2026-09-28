import { db, auth, onAuthStateChanged, collection, addDoc, setDoc, updateDoc, doc, getDocs, getDoc, deleteDoc } from './firebase.js';

let rolActual = "Vendedor"; 

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            rolActual = userDoc.data().rol;
            if (rolActual === "Vendedor") {
                alert(" Acceso Denegado: No tenés permisos de Administrador ni Supervisor.");
                window.location.replace("catalogo.html");
            }
            if (rolActual === "Administrador") {
                const boxMedia = document.getElementById('box-media-admin');
                if (boxMedia) boxMedia.style.display = 'block';
            }
        } else {
            window.location.replace("login.html");
        }
    }
});

const btnTema = document.getElementById('toggle-dark-mode');
const aplicarTema = (tema) => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('theme_dietrich', tema);
    if(btnTema) btnTema.textContent = tema === 'dark' ? '☀️' : '🌙';
};
aplicarTema(localStorage.getItem('theme_dietrich') || 'light');
if(btnTema) btnTema.addEventListener('click', () => aplicarTema(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

// --- LÓGICA DE PESTAÑAS (TABS) ---
const btnTabPlanes = document.getElementById('btn-tab-planes');
const btnTabCirculares = document.getElementById('btn-tab-circulares');
const btnTabEquipo = document.getElementById('btn-tab-equipo');

const vistaPlanes = document.getElementById('vista-planes');
const vistaCirculares = document.getElementById('vista-circulares');
const vistaEquipo = document.getElementById('vista-equipo');

function switchTab(tab) {
    btnTabPlanes.className = tab === 'planes' ? 'btn-primario' : 'btn-secundario';
    btnTabCirculares.className = tab === 'circulares' ? 'btn-primario' : 'btn-secundario';
    btnTabEquipo.className = tab === 'equipo' ? 'btn-primario' : 'btn-secundario';
    
    vistaPlanes.style.display = tab === 'planes' ? 'grid' : 'none';
    vistaCirculares.style.display = tab === 'circulares' ? 'grid' : 'none';
    vistaEquipo.style.display = tab === 'equipo' ? 'block' : 'none';
}

btnTabPlanes.addEventListener('click', () => switchTab('planes'));
btnTabCirculares.addEventListener('click', () => { switchTab('circulares'); cargarCircularesAdmin(); });
btnTabEquipo.addEventListener('click', () => { switchTab('equipo'); cargarUsuarios(); });

// ==========================================
// NUEVO: GESTIÓN DE CIRCULARES
// ==========================================
async function cargarCircularesAdmin() {
    const lista = document.getElementById('lista-circulares-admin');
    lista.innerHTML = '<p style="text-align: center;">Cargando documentos...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "circulares"));
        lista.innerHTML = '';
        if (querySnapshot.empty) { lista.innerHTML = '<p style="text-align:center;">No hay circulares cargadas.</p>'; return; }
        
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px;";
            div.innerHTML = `
                <div>
                    <strong style="color: var(--ford-blue); display:block;">${data.titulo}</strong>
                    <small style="color: var(--text-muted);">${data.descripcion}</small>
                </div>
                <button class="btn-eliminar-circular btn-secundario" data-id="${docSnap.id}" style="padding: 6px; font-size: 0.8rem; color: red;">🗑️</button>
            `;
            lista.appendChild(div);
        });

        document.querySelectorAll('.btn-eliminar-circular').forEach(btn => btn.addEventListener('click', async (e) => {
            if (confirm("⚠️ ¿Eliminar este documento? Desaparecerá para todos los vendedores.")) {
                await deleteDoc(doc(db, "circulares", e.target.dataset.id));
                cargarCircularesAdmin();
            }
        }));
    } catch (error) { console.error(error); }
}

document.getElementById('form-circular').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-guardar-circular');
    btn.disabled = true; btn.textContent = "Guardando...";
    try {
        await addDoc(collection(db, "circulares"), {
            titulo: document.getElementById('circ-titulo').value.trim(),
            descripcion: document.getElementById('circ-desc').value.trim(),
            url: document.getElementById('circ-url').value.trim()
        });
        document.getElementById('form-circular').reset();
        alert("✅ Circular guardada con éxito.");
        cargarCircularesAdmin();
    } catch (e) { console.error(e); alert("❌ Error al guardar."); }
    btn.disabled = false; btn.textContent = "Guardar Circular";
});


// ==========================================
// GESTIÓN DE USUARIOS
// ==========================================
async function cargarUsuarios() {
    const tbody = document.getElementById('tbody-usuarios');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Cargando usuarios...</td></tr>';
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        tbody.innerHTML = '';
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const uid = docSnap.id;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${data.nombreCompleto}</strong></td>
                <td style="color: var(--ford-blue);">${data.email}</td>
                <td>
                    <select class="select-rol input-filtro" data-uid="${uid}" style="padding: 5px; font-size: 0.85rem;" ${rolActual !== "Administrador" ? "disabled" : ""}>
                        <option value="Vendedor" ${data.rol === 'Vendedor' ? 'selected' : ''}>Vendedor</option>
                        <option value="Supervisor" ${data.rol === 'Supervisor' ? 'selected' : ''}>Supervisor</option>
                        <option value="Administrador" ${data.rol === 'Administrador' ? 'selected' : ''}>Administrador</option>
                    </select>
                </td>
                <td>
                    <button class="btn-eliminar-usuario btn-secundario" data-uid="${uid}" style="color:red; padding:6px 10px; font-size: 0.8rem;" ${rolActual !== "Administrador" ? "disabled" : ""}>🗑️ Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        document.querySelectorAll('.select-rol').forEach(select => {
            select.addEventListener('change', async (e) => {
                const uid = e.target.dataset.uid;
                const nuevoRol = e.target.value;
                await updateDoc(doc(db, "usuarios", uid), { rol: nuevoRol });
                alert(`✅ Rol actualizado a: ${nuevoRol}`);
            });
        });
        document.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm("⚠️ ¿Seguro de ELIMINAR este usuario?")) {
                    await deleteDoc(doc(db, "usuarios", e.target.dataset.uid));
                    alert("🗑️ Usuario eliminado.");
                    cargarUsuarios();
                }
            });
        });
    } catch (error) { console.error(error); }
}

// ==========================================
// GESTIÓN DE PLANES
// ==========================================
const listaPlanes = document.getElementById('lista-planes-admin');
async function cargarPlanes() {
    listaPlanes.innerHTML = '<p style="text-align: center;">Cargando...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "planes"));
        listaPlanes.innerHTML = '';
        if (querySnapshot.empty) { listaPlanes.innerHTML = '<p>No hay planes cargados.</p>'; return; }
        querySnapshot.forEach(documento => {
            const plan = documento.data();
            const div = document.createElement('div');
            div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px;";
            div.innerHTML = `
                <div>
                    <strong style="color: var(--ford-blue); display:block;">${documento.id}</strong>
                    <small style="color: var(--text-muted);">$${new Intl.NumberFormat('es-AR').format(plan.precioLista)} - ${plan.totalCuotas} cuotas</small>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-editar btn-secundario" data-id="${documento.id}" style="padding: 6px; font-size: 0.8rem;">✏️</button>
                    <button class="btn-eliminar btn-secundario" data-id="${documento.id}" style="padding: 6px; font-size: 0.8rem; color: red;">🗑️</button>
                </div>
            `;
            listaPlanes.appendChild(div);
        });
        document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', (e) => cargarPlanEnFormulario(e.target.dataset.id)));
        document.querySelectorAll('.btn-eliminar').forEach(btn => btn.addEventListener('click', (e) => eliminarPlan(e.target.dataset.id)));
    } catch (error) { console.error(error); }
}

const tramosContainer = document.getElementById('tramos-container');
function agregarFilaTramo(rango = '', valor = '') {
    const fila = document.createElement('div');
    fila.style.cssText = "display: flex; gap: 10px; margin-bottom: 10px; align-items: center;";
    fila.innerHTML = `
        <input type="text" class="input-rango" placeholder="Ej: 2 a 13" value="${rango}" required style="flex: 1; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
        <input type="number" class="input-valor" placeholder="Valor ($)" value="${valor}" required style="flex: 1; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
        <button type="button" class="btn-quitar-tramo" style="background: none; border: none; color: red; font-size: 1.2rem; cursor: pointer; padding: 0 10px;" title="Quitar Tramo">&times;</button>
    `;
    fila.querySelector('.btn-quitar-tramo').addEventListener('click', () => fila.remove());
    tramosContainer.appendChild(fila);
}
document.getElementById('btn-add-tramo').addEventListener('click', () => agregarFilaTramo());

const beneficiosContainer = document.getElementById('beneficios-container');
function agregarFilaBeneficio(titulo = '', legal = '') {
    const fila = document.createElement('div');
    fila.style.cssText = "display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed var(--border-color);";
    fila.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <input type="text" class="input-ben-titulo" placeholder="Título (Ej: 1er Service Bonificado)" value="${titulo}" required style="flex: 1; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
            <button type="button" class="btn-quitar-beneficio" style="background: none; border: none; color: red; font-size: 1.2rem; cursor: pointer; padding: 0 10px;" title="Eliminar Beneficio">&times;</button>
        </div>
        <textarea class="input-ben-legal" placeholder="Texto legal de la circular..." required style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); resize: vertical; min-height: 60px;">${legal}</textarea>
    `;
    fila.querySelector('.btn-quitar-beneficio').addEventListener('click', () => fila.remove());
    beneficiosContainer.appendChild(fila);
}
document.getElementById('btn-add-beneficio').addEventListener('click', () => agregarFilaBeneficio());

document.getElementById('form-plan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnGuardar = document.getElementById('btn-guardar-plan');
    btnGuardar.disabled = true; btnGuardar.textContent = "Guardando...";

    try {
        const idSeguro = document.getElementById('plan-id').value.trim().replace(/\//g, '-'); 
        const estructuraCuotas = [];
        const inputsRangos = document.querySelectorAll('.input-rango');
        const inputsValores = document.querySelectorAll('.input-valor');
        for (let i = 0; i < inputsRangos.length; i++) estructuraCuotas.push({ rango: inputsRangos[i].value, valor: Number(inputsValores[i].value) });

        const listaBeneficios = [];
        const inputsBenTitulos = document.querySelectorAll('.input-ben-titulo');
        const inputsBenLegales = document.querySelectorAll('.input-ben-legal');
        for (let i = 0; i < inputsBenTitulos.length; i++) listaBeneficios.push({ titulo: inputsBenTitulos[i].value.trim(), legal: inputsBenLegales[i].value.trim() });

        const nuevoPlan = {
            nombreCompleto: document.getElementById('plan-nombre').value,
            precioLista: Number(document.getElementById('plan-precio').value),
            montoFinanciado: Number(document.getElementById('plan-financiado').value),
            alicuotaComplementaria: Number(document.getElementById('plan-alicuota').value),
            cuotaPura: Number(document.getElementById('plan-cuotapura').value),
            cuota1: Number(document.getElementById('plan-cuota1').value),
            totalCuotas: Number(document.getElementById('plan-totalcuotas').value),
            estructuraCuotas: estructuraCuotas,
            beneficios: listaBeneficios
        };

        if (rolActual === "Administrador") {
            const fotosInput = document.getElementById('plan-foto').value.trim();
            if (fotosInput !== "") {
                const fotosArray = fotosInput.split(',').map(f => f.trim()).filter(f => f !== "");
                nuevoPlan.imgGaleria = fotosArray;
                nuevoPlan.imgFoto = fotosArray[0]; 
            }
            const videoInput = document.getElementById('plan-video').value.trim();
            if (videoInput !== "") nuevoPlan.videoID = videoInput;
        }

        await setDoc(doc(db, "planes", idSeguro), nuevoPlan, { merge: true });
        alert("✅ Plan guardado exitosamente.");
        document.getElementById('btn-limpiar-form').click();
        cargarPlanes(); 
    } catch (error) { console.error(error); alert("❌ Error al guardar."); } 
    finally { btnGuardar.disabled = false; btnGuardar.textContent = "Guardar Plan"; }
});

async function cargarPlanEnFormulario(id) {
    document.getElementById('titulo-formulario').textContent = "Editando Plan";
    const docRef = await getDoc(doc(db, "planes", id));
    if (docRef.exists()) {
        const data = docRef.data();
        document.getElementById('plan-id').value = id;
        document.getElementById('plan-id').disabled = true; 
        
        if (rolActual === "Administrador") {
            document.getElementById('plan-foto').value = data.imgGaleria ? data.imgGaleria.join(', ') : (data.imgFoto || '');
            document.getElementById('plan-video').value = data.videoID || '';
        }

        document.getElementById('plan-nombre').value = data.nombreCompleto;
        document.getElementById('plan-precio').value = data.precioLista;
        document.getElementById('plan-financiado').value = data.montoFinanciado;
        document.getElementById('plan-alicuota').value = data.alicuotaComplementaria;
        document.getElementById('plan-cuotapura').value = data.cuotaPura;
        document.getElementById('plan-cuota1').value = data.cuota1;
        document.getElementById('plan-totalcuotas').value = data.totalCuotas;

        tramosContainer.innerHTML = ''; 
        if (data.estructuraCuotas && data.estructuraCuotas.length > 0) data.estructuraCuotas.forEach(tramo => agregarFilaTramo(tramo.rango, tramo.valor));
        else agregarFilaTramo(); 

        beneficiosContainer.innerHTML = '';
        if (data.beneficios && data.beneficios.length > 0) data.beneficios.forEach(ben => agregarFilaBeneficio(ben.titulo, ben.legal));
        else agregarFilaBeneficio(); 
    }
}

async function eliminarPlan(id) {
    if (rolActual !== "Administrador") { alert(" Solo el Administrador puede eliminar planes."); return; }
    if (confirm(`⚠️ ¿ELIMINAR el plan '${id}'?`)) {
        await deleteDoc(doc(db, "planes", id));
        cargarPlanes();
    }
}

document.getElementById('btn-limpiar-form').addEventListener('click', () => {
    document.getElementById('form-plan').reset();
    document.getElementById('plan-id').disabled = false;
    document.getElementById('titulo-formulario').textContent = "Crear Nuevo Plan";
    tramosContainer.innerHTML = ''; agregarFilaTramo();
    beneficiosContainer.innerHTML = ''; agregarFilaBeneficio();
});

cargarPlanes();
agregarFilaTramo();
agregarFilaBeneficio();