import { db, auth, onAuthStateChanged, collection, addDoc, updateDoc, serverTimestamp, doc, getDoc, getDocs, query, limit } from './firebase.js';

let usuarioActual = null;
let rolActual = "Vendedor";

// --- CANDADO DE SEGURIDAD Y SEMÁFORO ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        usuarioActual = user;
        
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            rolActual = userDoc.data().rol;
            document.getElementById('header-user-name').textContent = `${user.email.split('@')[0]} (${rolActual})`;
            
            // Si es Jefe, le mostramos la caja para asignar vendedor y la de crear beneficio extra
            if (rolActual === "Administrador" || rolActual === "Supervisor") {
                document.getElementById('box-asignar-vendedor').style.display = 'block';
                document.getElementById('box-beneficio-extra').style.display = 'block';
                
                const select = document.getElementById('select-vendedor-asignado');
                const q = await getDocs(collection(db, "usuarios"));
                q.forEach(d => {
                    const u = d.data();
                    select.innerHTML += `<option value="${d.id}">${u.nombreCompleto} (${u.email})</option>`;
                });
            }
        }
        
        inicializarCotizador();
    }
});

// --- CONTROL DE TEMA ---
const btnTema = document.getElementById('toggle-dark-mode-cotizador');
const aplicarTema = (tema) => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('theme_dietrich', tema);
    if(btnTema) btnTema.textContent = tema === 'dark' ? '☀️' : '🌙';
};
aplicarTema(localStorage.getItem('theme_dietrich') || 'light');
if(btnTema) btnTema.addEventListener('click', () => aplicarTema(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

// --- VEHÍCULOS (Cambio de modelo) ---
const versionesPorVehiculo = {
    "Ranger": ["XL 4x4 Chasis", "XL 4x2 C/S", "XL 4x4 C/S", "XL 4x2 MT C/D", "XL 4x4 MT C/D", "XL 4x2 AT C/D", "XL 4x4 AT C/D", "Black 4x2 AT", "Black 4x4 MT", "XLS 4x2 MT", "XLS 4x4 AT V6", "XLT 4x2 AT", "XLT 4x4 AT", "XLT 4x4 AT V6", "LTD 4x2 2.0 AT", "LTD+ 4x4 AT V6", ],
    "Territory": ["SEL", "Trend Hibrida", "Titanium", "Platinum"],
    "Maverick": ["XLT", "Lariat Hibrida", "Tremor"],
    "Bronco": ["Big Bend", "Badlans"],
    "Everest": ["Titanium"],
    "Transit": ["Van mediana TE MT", "Van mediana TE AT", "Van larga TE MT", "Van larga TE AT", "Chasis", "Minibus MT/AT",]
};

// --- INTERFAZ UI ---
const checkUsado = document.getElementById('entrega-usado');
const campoUsado = document.getElementById('detalle-usado');
checkUsado.addEventListener('change', () => {
    campoUsado.style.display = checkUsado.checked ? 'block' : 'none';
    if (!checkUsado.checked) campoUsado.value = '';
});

const checkMantiene = document.getElementById('mantiene-version');
const boxCambioModelo = document.getElementById('box-cambio-modelo');
checkMantiene.addEventListener('change', () => {
    boxCambioModelo.style.display = checkMantiene.checked ? 'none' : 'block';
});

const selectVehiculo = document.getElementById('select-vehiculo');
const selectVersion = document.getElementById('select-version');
selectVehiculo.addEventListener('change', () => {
    const vehiculo = selectVehiculo.value;
    selectVersion.innerHTML = '<option value="" disabled selected>Elegir versión...</option>';
    if (versionesPorVehiculo[vehiculo]) {
        versionesPorVehiculo[vehiculo].forEach(v => { selectVersion.innerHTML += `<option value="${v}">${v}</option>`; });
        selectVersion.disabled = false;
    }
});

const checkCuota1 = document.getElementById('incluir-cuota1');
const boxValorCuota1 = document.getElementById('box-valor-cuota1');
checkCuota1.addEventListener('change', () => { boxValorCuota1.style.display = checkCuota1.checked ? 'block' : 'none'; });

document.getElementById('fecha-vigencia').valueAsDate = new Date();

// --- FORMATO DE MONEDA EN VIVO ---
function formatearMoneda(e) {
    let valor = e.target.value.replace(/\D/g, ''); // Borra todo lo que no sea número
    if (valor === "") {
        e.target.value = "";
        return;
    }
    e.target.value = "$ " + new Intl.NumberFormat('es-AR').format(parseInt(valor));
}
document.getElementById('capital-cliente').addEventListener('input', formatearMoneda);
document.getElementById('valor-cuota1').addEventListener('input', formatearMoneda);


// ==============================================
// OBTENER DATOS DE FIREBASE Y RELLENAR INTERFAZ
// ==============================================
let planDataActual = null;

async function inicializarCotizador() {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    let planDesdeURL = urlParams.get('plan');

    if (editId) {
        // --- MODO EDICIÓN ---
        document.querySelector('.header-title h1').textContent = "✏️ Editando Propuesta";
        document.querySelector('.header-title p').textContent = "Modificando registro existente";
        document.getElementById('btn-generar').textContent = "Actualizar Cotización";

        const docSnap = await getDoc(doc(db, "cotizaciones", editId));
        if(docSnap.exists()) {
            const data = docSnap.data();
            planDataActual = data.dataFinanciera; 

            // Si es una edición y tenía beneficios especiales creados por el gerente, los inyectamos en memoria
            if (data.beneficiosSeleccionados && data.textosLegales) {
                if (!planDataActual.beneficios) planDataActual.beneficios = [];
                data.beneficiosSeleccionados.forEach((tit, idx) => {
                    if (!planDataActual.beneficios.find(b => b.titulo === tit)) {
                        planDataActual.beneficios.push({ titulo: tit, legal: data.textosLegales[idx] });
                    }
                });
            }

            document.getElementById('plan-base').value = data.planBase;
            document.getElementById('txt-nombre-plan-activo').textContent = planDataActual.nombreCompleto;
            document.getElementById('nombre-cliente').value = data.clienteNombre;
            document.getElementById('capital-cliente').value = data.clienteCapital ? "$ " + new Intl.NumberFormat('es-AR').format(data.clienteCapital) : "";
            
            if(data.entregaUsado) {
                document.getElementById('entrega-usado').checked = true;
                document.getElementById('detalle-usado').style.display = 'block';
                document.getElementById('detalle-usado').value = data.detalleUsado;
            }

            if(data.cambioModelo && data.cambioModelo !== "Ninguno") {
                document.getElementById('mantiene-version').checked = false;
                document.getElementById('box-cambio-modelo').style.display = 'block';
                const vehiculoMatch = Object.keys(versionesPorVehiculo).find(v => data.cambioModelo.startsWith(v));
                if(vehiculoMatch) {
                    const selVehiculo = document.getElementById('select-vehiculo');
                    selVehiculo.value = vehiculoMatch;
                    selVehiculo.dispatchEvent(new Event('change')); 
                    document.getElementById('select-version').value = data.cambioModelo.replace(vehiculoMatch + ' ', '');
                }
            }

            if(data.vigencia) document.getElementById('fecha-vigencia').value = data.vigencia;
            
            if(data.incluyeCuota1) {
                document.getElementById('incluir-cuota1').checked = true;
                document.getElementById('box-valor-cuota1').style.display = 'block';
                document.getElementById('valor-cuota1').value = data.valorCuota1 ? "$ " + new Intl.NumberFormat('es-AR').format(data.valorCuota1) : "";
            }

            document.getElementById('comentarios-vendedor').value = data.comentarios || '';

            if (rolActual !== "Vendedor" && data.vendedorUid) {
                const selectVendedor = document.getElementById('select-vendedor-asignado');
                if([...selectVendedor.options].some(o => o.value === data.vendedorUid)) {
                    selectVendedor.value = data.vendedorUid;
                }
            }

            renderizarBeneficios(planDataActual, data.beneficiosSeleccionados);
        }

    } else {
        // --- MODO NUEVA COTIZACIÓN ---
        if (planDesdeURL) {
            const planSnap = await getDoc(doc(db, "planes", planDesdeURL));
            if(planSnap.exists()) {
                planDataActual = planSnap.data();
                document.getElementById('plan-base').value = planDesdeURL;
                document.getElementById('txt-nombre-plan-activo').textContent = planDataActual.nombreCompleto;
            }
        }
        
        if (!planDataActual) {
            const q = query(collection(db, "planes"), limit(1));
            const snap = await getDocs(q);
            snap.forEach(d => {
                planDataActual = d.data();
                document.getElementById('plan-base').value = d.id;
                document.getElementById('txt-nombre-plan-activo').textContent = planDataActual.nombreCompleto;
            });
        }

        if (planDataActual) renderizarBeneficios(planDataActual, []);
    }
}

// ----------------------------------------------------
// DIBUJAR BENEFICIOS (Disponibles para todos)
// ----------------------------------------------------
function renderizarBeneficios(planData, preSeleccionados) {
    const contenedorBeneficios = document.querySelector('.beneficios-grid');
    contenedorBeneficios.innerHTML = ''; 

    if (planData.beneficios && planData.beneficios.length > 0) {
        planData.beneficios.forEach(ben => {
            const isChecked = (preSeleccionados && preSeleccionados.length > 0) 
                ? (preSeleccionados.includes(ben.titulo) ? 'checked' : '') 
                : 'checked'; 
            
            contenedorBeneficios.innerHTML += `
                <label>
                    <input type="checkbox" class="beneficio-check" value="${ben.titulo}" ${isChecked}> 
                    ${ben.titulo}
                </label>
            `;
        });
    } else {
        contenedorBeneficios.innerHTML = '<p style="font-size:0.85rem; color: var(--text-muted);">Sin beneficios cargados.</p>';
    }
}

// ----------------------------------------------------
// AGREGAR BENEFICIO EXTRA (Solo Gerencia)
// ----------------------------------------------------
const btnAddExtra = document.getElementById('btn-add-extra-ben');
if (btnAddExtra) {
    btnAddExtra.addEventListener('click', () => {
        const titulo = document.getElementById('extra-ben-titulo').value.trim();
        const legal = document.getElementById('extra-ben-legal').value.trim();
        
        if (!titulo || !legal) {
            alert("⚠️ Completá el título y el texto legal para agregar el beneficio.");
            return;
        }

        // Lo inyectamos en memoria al plan que se está cotizando
        if (!planDataActual.beneficios) planDataActual.beneficios = [];
        planDataActual.beneficios.push({ titulo, legal });
        
        // Guardamos los que el usuario ya tenía tildados para no borrárselos
        const seleccionadosActuales = [];
        document.querySelectorAll('.beneficio-check:checked').forEach(chk => seleccionadosActuales.push(chk.value));
        seleccionadosActuales.push(titulo); // Tildamos el nuevo por defecto

        renderizarBeneficios(planDataActual, seleccionadosActuales);

        // Limpiamos los inputs
        document.getElementById('extra-ben-titulo').value = '';
        document.getElementById('extra-ben-legal').value = '';
    });
}


// ==============================================
// LÓGICA DE ENVÍO Y ACTUALIZACIÓN
// ==============================================
const formulario = document.getElementById('formulario-cotizador');

formulario.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const btnGenerar = document.getElementById('btn-generar');
    btnGenerar.textContent = "Procesando...";
    btnGenerar.disabled = true;

    const beneficiosSeleccionados = [];
    const textosLegalesSeleccionados = [];
    
    document.querySelectorAll('.beneficio-check:checked').forEach((checkbox) => {
        const titulo = checkbox.value;
        beneficiosSeleccionados.push(titulo);
        const benEncontrado = planDataActual.beneficios.find(b => b.titulo === titulo);
        if (benEncontrado) textosLegalesSeleccionados.push(benEncontrado.legal);
    });

    let vendedorAsignadoUid = usuarioActual.uid;
    let vendedorAsignadoEmail = usuarioActual.email;

    if (rolActual !== "Vendedor") {
        const selectAsignado = document.getElementById('select-vendedor-asignado');
        if (selectAsignado.value !== "yo") {
            vendedorAsignadoUid = selectAsignado.value;
            vendedorAsignadoEmail = selectAsignado.options[selectAsignado.selectedIndex].text.split(' (')[0]; 
        }
    }

    const nombrePlanSeleccionado = document.getElementById('plan-base').value;
    const datosDurosDelPlan = planDataActual;

    let cambioModeloFinal = "Ninguno";
    if (!checkMantiene.checked) cambioModeloFinal = `${selectVehiculo.value} ${selectVersion.value}`;

    // Limpiamos los signos y puntos para guardar solo el número puro en la base de datos
    const capitalLimpio = document.getElementById('capital-cliente').value.replace(/\D/g, '');

    let valorCuota1Custom = null;
    if (checkCuota1.checked) {
        valorCuota1Custom = document.getElementById('valor-cuota1').value.replace(/\D/g, '');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');

    const cotizacionData = {
        vendedorUid: vendedorAsignadoUid,        
        vendedorEmail: vendedorAsignadoEmail,    
        planBase: nombrePlanSeleccionado,
        cambioModelo: cambioModeloFinal,
        dataFinanciera: datosDurosDelPlan,
        vigencia: document.getElementById('fecha-vigencia').value,
        clienteNombre: document.getElementById('nombre-cliente').value,
        clienteCapital: document.getElementById('capital-cliente').value,
        entregaUsado: checkUsado.checked,
        detalleUsado: document.getElementById('detalle-usado').value,
        
        beneficiosSeleccionados: beneficiosSeleccionados,
        textosLegales: textosLegalesSeleccionados, 
        
        incluyeCuota1: checkCuota1.checked,
        valorCuota1: Number(valorCuota1Custom), 
        comentarios: document.getElementById('comentarios-vendedor').value,
        estado: editId ? "Modificada" : "Generada"
    };

    try {
        let finalId = "";
        if (editId) {
            await updateDoc(doc(db, "cotizaciones", editId), cotizacionData);
            finalId = editId;
            alert("✅ ¡Cotización actualizada correctamente!");
        } else {
            cotizacionData.fechaCreacion = serverTimestamp();
            const docRef = await addDoc(collection(db, "cotizaciones"), cotizacionData);
            finalId = docRef.id;
            alert("✅ ¡Cotización generada con éxito!");
        }
        
        const linkUnico = `${window.location.origin}/propuesta.html?id=${finalId}`;
        await navigator.clipboard.writeText(linkUnico);
        window.location.href = "catalogo.html";
        
    } catch (error) {
        console.error("Error al guardar: ", error);
        alert("❌ Hubo un error de conexión al guardar.");
    } finally {
        btnGenerar.textContent = editId ? " Actualizar Cotización" : " Generar Link y Guardar";
        btnGenerar.disabled = false;
    }
});