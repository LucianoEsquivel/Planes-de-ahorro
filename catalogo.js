import { db, auth, onAuthStateChanged, collection, getDocs, getDoc, doc, updateDoc, query, orderBy, limit, startAfter, where, Timestamp, updatePassword, onSnapshot } from './firebase.js';
let usuarioActual = null;
let rolActual = "Vendedor";

// --- CANDADO DE SEGURIDAD Y SEMÁFORO DE ROLES ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        usuarioActual = user;
        document.getElementById('header-user-name').textContent = user.email.split('@')[0];
        
       // Buscamos el rol del usuario en la base de datos
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            rolActual = userData.rol;
            
            // --- NUEVO: LLENAR EL MODAL CON DATOS REALES ---
            document.getElementById('ajuste-nombre').value = userData.nombreCompleto || '';
            document.getElementById('ajuste-email').value = userData.email || user.email;
            document.getElementById('ajuste-email').disabled = true; // Bloqueamos el email para que no lo rompan
            document.getElementById('ajuste-tel').value = userData.telefono || '';
            
            // Si es Jefe, le mostramos el botón secreto y el filtro de asesores
            if (rolActual === "Administrador" || rolActual === "Supervisor") {
                const btnAdmin = document.getElementById('btn-panel-admin');
                if (btnAdmin) {
                    btnAdmin.style.display = 'block';
                    btnAdmin.addEventListener('click', () => window.location.href = 'admin.html');
                }
                
                const filtroVendedor = document.getElementById('filtro-vendedor');
                if (filtroVendedor) {
                    filtroVendedor.style.display = 'block';
                    cargarFiltroVendedores();
                }
            }
        }
    }
});

async function cargarFiltroVendedores() {
    const filtro = document.getElementById('filtro-vendedor');
    const q = await getDocs(collection(db, "usuarios"));
    q.forEach(docSnap => {
        const u = docSnap.data();
        filtro.innerHTML += `<option value="${docSnap.id}">${u.nombreCompleto} (${u.rol})</option>`;
    });
}

// ==========================================
// 1. RENDERIZAR TARJETAS DESDE FIREBASE
// ==========================================
const gridPlanes = document.getElementById('grid-planes');
const selectFiltroPlan = document.getElementById('filtro-plan');

function renderizarCatalogo() {
    if (!gridPlanes) return;
    // Solo mostramos el "Cargando" si el grid está vacío, evitando el parpadeo
    if (gridPlanes.innerHTML.trim() === '') {
        gridPlanes.innerHTML = '<p style="text-align: center; width: 100%; color: var(--text-muted); font-weight: bold;">Cargando catálogo... ⏳</p>';
    }
    
    // onSnapshot lee al instante desde el disco duro y luego chequea si hay cambios en Google
    onSnapshot(collection(db, "planes"), (querySnapshot) => {
        gridPlanes.innerHTML = '';
        if(querySnapshot.empty) {
            gridPlanes.innerHTML = '<p style="text-align: center; width: 100%;">No hay planes cargados en el sistema.</p>';
            return;
        }

        querySnapshot.forEach(docSnap => {
            const plan = docSnap.data();
            const key = docSnap.id;
            
            // Llenamos el filtro de búsqueda solo si no está ya lleno
            if (selectFiltroPlan && ![...selectFiltroPlan.options].some(o => o.value === key)) {
                selectFiltroPlan.innerHTML += `<option value="${key}">${key}</option>`;
            }

            const card = document.createElement('div');
            card.className = 'card-plan-item';
            card.innerHTML = `
                <div class="card-plan-img-wrapper">
                    <img src="${plan.imgFoto || 'img/ford.png'}" alt="${plan.nombreCompleto}">
                    <span class="card-plan-badge">${plan.totalCuotas} Cuotas</span>
                </div>
                <div class="card-plan-body">
                    <div>
                        <h3 class="card-plan-title">${plan.nombreCompleto}</h3>
                        <p class="card-plan-subtitle">Plan Oficial Ford Dietrich</p>
                    </div>
                    <div class="card-plan-footer">
                        <div class="card-plan-price">
                            <span>Valor Móvil</span>
                            <strong>$${new Intl.NumberFormat('es-AR').format(plan.precioLista)}</strong>
                        </div>
                        <button type="button" class="btn-cotizar-card">Cotizar →</button>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => window.location.href = `index.html?plan=${encodeURIComponent(key)}`);
            gridPlanes.appendChild(card);
        });
    }, (error) => {
        console.error("Error al cargar los planes:", error);
    });
}

// ==========================================
// 2. CONTROL DE MODO OSCURO Y MODALES
// ==========================================
const toggleDarkBtn = document.getElementById('toggle-dark-mode');
const aplicarTema = (tema) => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('theme_dietrich', tema);
    if(toggleDarkBtn) toggleDarkBtn.textContent = tema === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
};
aplicarTema(localStorage.getItem('theme_dietrich') || 'light');
if(toggleDarkBtn) toggleDarkBtn.addEventListener('click', () => aplicarTema(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

const modalCirculares = document.getElementById('modal-circulares');
document.getElementById('btn-modal-circulares')?.addEventListener('click', () => modalCirculares.style.display = 'flex');
document.getElementById('btn-cerrar-circulares')?.addEventListener('click', () => modalCirculares.style.display = 'none');
if(modalCirculares) modalCirculares.addEventListener('click', (e) => { if (e.target === modalCirculares) modalCirculares.style.display = 'none'; });

// ==========================================
// 3. LÓGICA DE VISTAS Y TABS
// ==========================================
const btnVistaHistorial = document.getElementById('btn-vista-historial');
const btnVistaCatalogo = document.getElementById('btn-vista-catalogo');
const vistaCatalogo = document.getElementById('vista-catalogo');
const vistaHistorial = document.getElementById('vista-historial');

if(btnVistaHistorial) {
    btnVistaHistorial.addEventListener('click', () => {
        vistaCatalogo.style.display = 'none'; 
        vistaHistorial.style.display = 'block';
        btnVistaHistorial.style.display = 'none'; 
        btnVistaCatalogo.style.display = 'block';
        cargarHistorialPaginado(); 
        cargarCalendario(); 
    });
}
if(btnVistaCatalogo) {
    btnVistaCatalogo.addEventListener('click', () => {
        vistaHistorial.style.display = 'none'; 
        vistaCatalogo.style.display = 'block';
        btnVistaCatalogo.style.display = 'none'; 
        btnVistaHistorial.style.display = 'block';
    });
}

const btnTabLista = document.getElementById('btn-tab-lista');
const btnTabCalendario = document.getElementById('btn-tab-calendario');
const contenedorLista = document.getElementById('contenedor-lista-historial');
const contenedorCalendario = document.getElementById('contenedor-calendario');
const filtrosLista = document.getElementById('filtros-lista');

if(btnTabLista) {
    btnTabLista.addEventListener('click', () => {
        btnTabLista.classList.add('tab-activa'); btnTabCalendario.classList.remove('tab-activa');
        contenedorLista.style.display = 'block'; if(filtrosLista) filtrosLista.style.display = 'flex';
        contenedorCalendario.style.display = 'none';
    });
}
if(btnTabCalendario) {
    btnTabCalendario.addEventListener('click', () => {
        btnTabCalendario.classList.add('tab-activa'); btnTabLista.classList.remove('tab-activa');
        contenedorLista.style.display = 'none'; if(filtrosLista) filtrosLista.style.display = 'none';
        contenedorCalendario.style.display = 'block';
    });
}

// ==========================================
// 4. MOTOR DE PAGINACIÓN Y FILTROS DEL HISTORIAL
// ==========================================
const tbodyHistorial = document.getElementById('tbody-historial');
const btnNext = document.getElementById('btn-next-page');
const btnPrev = document.getElementById('btn-prev-page');
const pageIndicator = document.getElementById('page-indicator');

const selectFiltroVendedor = document.getElementById('filtro-vendedor');
const inputFiltroDesde = document.getElementById('filtro-fecha-desde');
const inputFiltroHasta = document.getElementById('filtro-fecha-hasta');
const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');

const LIMIT_POR_PAGINA = 15;
let paginaActual = 1;
let cursoresPaginas = [null]; 

async function cargarHistorialPaginado() {
    if(!tbodyHistorial) return;
    tbodyHistorial.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Cargando historial</td></tr>';
    if(btnNext) btnNext.disabled = true; 
    if(btnPrev) btnPrev.disabled = true;

    try {
        let q;
        const ultimoDeLaPaginaAnterior = cursoresPaginas[paginaActual - 1];
        let refCotizaciones = collection(db, "cotizaciones");
        let queryParams = [];

        // 🚨 REGLA DE ORO DE SEGURIDAD 🚨
        if (rolActual === "Vendedor") {
            // Si es vendedor, SOLO mostramos las suyas
            queryParams.push(where("vendedorUid", "==", usuarioActual.uid));
        } else {
            // Si es Jefe y usó el filtro, filtramos por el vendedor elegido
            if (selectFiltroVendedor && selectFiltroVendedor.value) {
                queryParams.push(where("vendedorUid", "==", selectFiltroVendedor.value));
            }
        }

        if(selectFiltroPlan && selectFiltroPlan.value) queryParams.push(where("planBase", "==", selectFiltroPlan.value));

        if(inputFiltroDesde && inputFiltroHasta && inputFiltroDesde.value && inputFiltroHasta.value) {
            const fechaDesde = new Date(inputFiltroDesde.value + 'T00:00:00');
            const fechaHasta = new Date(inputFiltroHasta.value + 'T23:59:59');
            queryParams.push(where("fechaCreacion", ">=", Timestamp.fromDate(fechaDesde)));
            queryParams.push(where("fechaCreacion", "<=", Timestamp.fromDate(fechaHasta)));
        }

        queryParams.push(orderBy("fechaCreacion", "desc"));
        if (ultimoDeLaPaginaAnterior) queryParams.push(startAfter(ultimoDeLaPaginaAnterior));
        queryParams.push(limit(LIMIT_POR_PAGINA));

        q = query(refCotizaciones, ...queryParams);
        const querySnapshot = await getDocs(q);
        tbodyHistorial.innerHTML = ''; 

        if (querySnapshot.empty) {
            tbodyHistorial.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No hay cotizaciones para mostrar.</td></tr>';
            if(pageIndicator) pageIndicator.textContent = `Página ${paginaActual}`;
            if (paginaActual > 1 && btnPrev) btnPrev.disabled = false;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const idCotizacion = docSnap.id;
            const urlPropuesta = `${window.location.origin}/propuesta.html?id=${idCotizacion}`;
            const urlEditar = `${window.location.origin}/index.html?edit=${idCotizacion}`;
            
            let fechaTexto = data.fechaCreacion ? data.fechaCreacion.toDate().toLocaleDateString('es-AR') : 'Sin fecha';
            let etiquetaVendedor = rolActual !== "Vendedor" ? `<br><small style="color:var(--ford-blue); font-weight:bold;">Asesor: ${data.vendedorEmail ? data.vendedorEmail.split('@')[0] : 'Admin'}</small>` : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${fechaTexto}</td>
                <td><span class="cliente-nombre">${data.clienteNombre || 'Sin nombre'}</span>${etiquetaVendedor}</td>
                <td><strong>${data.planBase}</strong><br><small style="color: var(--text-muted);">${data.cambioModelo !== "Ninguno" ? '🔄 ' + data.cambioModelo : 'Modelo base'}</small></td>
                <td>$${new Intl.NumberFormat('es-AR').format(Number(String(data.clienteCapital || '0').replace(/\D/g, '')))}</td>
                <td><span class="badge-estado nuevo">${data.estado || 'Generada'}</span></td>
                <td>
                    <div class="acciones-tabla">
                        <a href="${urlEditar}" class="btn-accion-sm" title="Editar Cotización">✏️</a>
                        <a href="${urlPropuesta}" target="_blank" class="btn-accion-sm" title="Ver Propuesta">👁️</a>
                        <button class="btn-accion-sm btn-copiar" data-link="${urlPropuesta}" title="Copiar Link">🔗</button>
                    </div>
                </td>
            `;
            tbodyHistorial.appendChild(tr);
        });

        document.querySelectorAll('.btn-copiar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                navigator.clipboard.writeText(e.currentTarget.getAttribute('data-link'));
                alert("✅ Link copiado al portapapeles");
            });
        });

        if(pageIndicator) pageIndicator.textContent = `Página ${paginaActual}`;
        if(btnPrev) btnPrev.disabled = paginaActual === 1;

        if (querySnapshot.docs.length === LIMIT_POR_PAGINA) {
            cursoresPaginas[paginaActual] = querySnapshot.docs[querySnapshot.docs.length - 1];
            if(btnNext) btnNext.disabled = false;
        } else {
            if(btnNext) btnNext.disabled = true; 
        }

    } catch (error) {
        console.error("Error: ", error);
        if(error.message && error.message.includes("index")) {
            tbodyHistorial.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--warning-orange); padding: 20px;">⚠️ <strong>Falta índice en Firebase:</strong> Abrí la consola (F12) y hacé clic en el link azul para crearlo.</td></tr>';
        } else {
            tbodyHistorial.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar datos.</td></tr>';
        }
    }
}

if(btnNext) btnNext.addEventListener('click', () => { paginaActual++; cargarHistorialPaginado(); });
if(btnPrev) btnPrev.addEventListener('click', () => { paginaActual--; cargarHistorialPaginado(); });

const resetYBuscar = () => { paginaActual = 1; cursoresPaginas = [null]; cargarHistorialPaginado(); };

if (selectFiltroPlan) selectFiltroPlan.addEventListener('change', resetYBuscar);
if (selectFiltroVendedor) selectFiltroVendedor.addEventListener('change', resetYBuscar);
if (inputFiltroDesde) inputFiltroDesde.addEventListener('change', () => { if(inputFiltroHasta.value) resetYBuscar(); });
if (inputFiltroHasta) inputFiltroHasta.addEventListener('change', () => { if(inputFiltroDesde.value) resetYBuscar(); });

if (btnLimpiarFiltros) {
    btnLimpiarFiltros.addEventListener('click', () => {
        if(selectFiltroPlan) selectFiltroPlan.value = '';
        if(selectFiltroVendedor) selectFiltroVendedor.value = '';
        if(inputFiltroDesde) inputFiltroDesde.value = '';
        if(inputFiltroHasta) inputFiltroHasta.value = '';
        resetYBuscar();
    });
}

// ==========================================
// 5. MOTOR DE CALENDARIO MENSUAL 
// ==========================================
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();
const gridDias = document.getElementById('calendario-dias');
const txtMesAnio = document.getElementById('mes-anio-calendario');

document.getElementById('btn-cal-prev')?.addEventListener('click', () => { mesActual--; if (mesActual < 0) { mesActual = 11; anioActual--; } cargarCalendario(); });
document.getElementById('btn-cal-next')?.addEventListener('click', () => { mesActual++; if (mesActual > 11) { mesActual = 0; anioActual++; } cargarCalendario(); });

async function cargarCalendario() {
    if(!gridDias || !txtMesAnio) return;
    const mesesStr = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    txtMesAnio.textContent = `${mesesStr[mesActual]} ${anioActual}`;
    gridDias.innerHTML = '';

    const primerDiaMes = new Date(anioActual, mesActual, 1);
    const ultimoDiaMes = new Date(anioActual, mesActual + 1, 0);
    const inicioDisplay = primerDiaMes.getDay(); 
    for (let i = 0; i < inicioDisplay; i++) gridDias.innerHTML += `<div class="cal-day empty"></div>`;

    const hoy = new Date();
    for (let i = 1; i <= ultimoDiaMes.getDate(); i++) {
        const esHoy = (i === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear()) ? 'today' : '';
        gridDias.innerHTML += `
            <div class="cal-day ${esHoy}" id="cal-day-${i}">
                <span class="cal-date">${i}</span>
                <div class="quotes-wrapper" id="wrapper-${i}" style="display: none;">
                    <span class="quotes-badge" id="badge-${i}">0 Coti.</span>
                    <div class="quotes-dropdown" id="dropdown-${i}"></div>
                </div>
            </div>`;
    }

    try {
        let queryParams = [
            where("fechaCreacion", ">=", Timestamp.fromDate(primerDiaMes)),
            where("fechaCreacion", "<=", Timestamp.fromDate(new Date(anioActual, mesActual + 1, 0, 23, 59, 59)))
        ];
        
        // Filtro de seguridad también en el calendario
        if (rolActual === "Vendedor") queryParams.push(where("vendedorUid", "==", usuarioActual.uid));
        
        const querySnapshot = await getDocs(query(collection(db, "cotizaciones"), ...queryParams));
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const diaCreacion = data.fechaCreacion.toDate().getDate();
            const urlPropuesta = `${window.location.origin}/propuesta.html?id=${doc.id}`;
            const wrapper = document.getElementById(`wrapper-${diaCreacion}`);
            if (wrapper) {
                wrapper.style.display = 'block';
                const badge = document.getElementById(`badge-${diaCreacion}`);
                badge.textContent = `${parseInt(badge.textContent) + 1} Cotizaciones`;
                document.getElementById(`dropdown-${diaCreacion}`).innerHTML += `<a href="${urlPropuesta}" target="_blank" class="quote-link"> ${data.clienteNombre} (${data.planBase.split(' ')[0]})</a>`;
            }
        });
    } catch (e) { 
        console.error("Error calendario: ", e); 
        if(e.message && e.message.includes("index")) {
            gridDias.innerHTML = `<div style="grid-column: 1 / -1; padding: 20px; color: var(--warning-orange); text-align: center; background: var(--bg-card); border-radius: 8px;">⚠️ <strong>Falta índice de seguridad:</strong> Abrí la consola (F12) y hacé clic en el link que aparece ahí para habilitar el calendario de los vendedores.</div>`;
        }
    }
}



import { signOut } from './firebase.js';
document.getElementById('btn-cerrar-sesion')?.addEventListener('click', () => {
    signOut(auth).then(() => window.location.replace("login.html"));
});

// ==========================================
// CONTROL DEL MODAL DE PERFIL Y AJUSTES
// ==========================================
const modalAjustes = document.getElementById('modal-ajustes');
// Cerrar con la X
document.getElementById('btn-cerrar-ajustes')?.addEventListener('click', () => modalAjustes.style.display = 'none');
// Cerrar haciendo clic afuera
if(modalAjustes) {
    modalAjustes.addEventListener('click', (e) => { 
        if (e.target === modalAjustes) modalAjustes.style.display = 'none'; 
    });
}

// Guardar cambios en la nube
const formAjustes = document.getElementById('form-ajustes');
if (formAjustes) {
    formAjustes.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnGuardar = document.querySelector('.btn-guardar-perfil');
        btnGuardar.textContent = "⏳ Guardando...";
        
        const nuevoNombre = document.getElementById('ajuste-nombre').value.trim();
        const nuevoTel = document.getElementById('ajuste-tel').value.trim();
        const nuevaPass = document.getElementById('ajuste-password').value;
        const confirmPass = document.getElementById('ajuste-password-confirm').value;

        if (nuevaPass !== "" || confirmPass !== "") {
            if (nuevaPass !== confirmPass) {
                alert('🛑 Las contraseñas no coinciden.');
                btnGuardar.textContent = "Guardar Cambios";
                return;
            }
            if (nuevaPass.length < 6) {
                alert('🛑 La contraseña debe tener al menos 6 caracteres.');
                btnGuardar.textContent = "Guardar Cambios";
                return;
            }
        }
        
        try {
            // Si escribió una clave válida, se la mandamos al motor de seguridad de Google
            if (nuevaPass !== "") {
                await updatePassword(auth.currentUser, nuevaPass);
                document.getElementById('ajuste-password').value = '';
                document.getElementById('ajuste-password-confirm').value = '';
            }
            // Actualizamos en Firebase
            await updateDoc(doc(db, "usuarios", usuarioActual.uid), {
                nombreCompleto: nuevoNombre,
                telefono: nuevoTel
            });
            
            // Actualizamos el nombre en la barra de arriba al instante
            document.getElementById('header-user-name').textContent = nuevoNombre.split(' ')[0];
            modalAjustes.style.display = 'none';
            alert('✅ Perfil actualizado con éxito en la base de datos.');
        } catch (error) {
            console.error("Error al actualizar perfil:", error);
            alert('❌ Hubo un problema al guardar los cambios.');
        } finally {
            btnGuardar.textContent = "Guardar Cambios";
        }
    });
}

// ==========================================
// NUEVO: CARGAR CIRCULARES PARA LOS VENDEDORES
// ==========================================
async function cargarCircularesVendedor() {
    const ul = document.querySelector('.lista-circulares');
    if(!ul) return;
    ul.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Buscando documentos oficiales...</p>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "circulares"));
        ul.innerHTML = '';
        
        if(querySnapshot.empty) {
            ul.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No hay circulares cargadas.</p>';
            return;
        }
        
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            ul.innerHTML += `
                <li class="circular-item">
                    <div>
                        <strong>${data.titulo}</strong>
                        <p>${data.descripcion}</p>
                    </div>
                    <a href="${data.url}" target="_blank" class="btn-descargar-doc">🔗 Abrir PDF</a>
                </li>
            `;
        });
    } catch (error) {
        console.error("Error al cargar circulares:", error);
        ul.innerHTML = '<p style="color:red; text-align: center;">Error de conexión.</p>';
    }
}

// Llamamos a la función al iniciar
cargarCircularesVendedor();
renderizarCatalogo(); 