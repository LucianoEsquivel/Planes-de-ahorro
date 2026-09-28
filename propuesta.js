import { db, doc, getDoc } from './firebase.js';

// 1. Extraemos el ID
const urlParams = new URLSearchParams(window.location.search);
const cotizacionId = urlParams.get('id');

// Elementos UI
const pantallaCarga = document.getElementById('pantalla-carga');
const contenedorCotizacion = document.getElementById('cotizacion-cliente');
const toggleThemeBtn = document.getElementById('toggle-theme');

// Lógica Tema Oscuro
toggleThemeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    toggleThemeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme_dietrich', newTheme);
});

// Restaurar tema previo
const savedTheme = localStorage.getItem('theme_dietrich') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
toggleThemeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

// Lógica Lightbox (Cerrar modal de fotos)
const lightbox = document.getElementById('lightbox-modal');
const lightboxImg = document.getElementById('lightbox-img');
lightbox.addEventListener('click', () => lightbox.style.display = 'none');

// Variables globales para el PDF
let datosGlobales = null;
let finGlobales = null;
let galeriaGlobal = [];

// 2. Función Principal
async function cargarPropuesta() {
    if (!cotizacionId) {
        pantallaCarga.innerHTML = "<h2>Error: ID de propuesta inválido.</h2>";
        return;
    }

    try {
        const docRef = doc(db, "cotizaciones", cotizacionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const datos = docSnap.data();
            const fin = datos.dataFinanciera;
            
            // Guardamos para el PDF
            datosGlobales = datos;
            finGlobales = fin;

            // Saludo y Hero
            document.getElementById('titulo-saludo').textContent = `Hola ${datos.clienteNombre || ''}, esta es tu unidad y este es tu plan`;
            document.getElementById('subtitulo-hero').textContent = `Veamos el plan ${datos.planBase} para acceder a tu próximo vehículo de Ford`;
            document.getElementById('nombre-plan-base').textContent = fin ? fin.nombreCompleto : datos.planBase;

            // 1. Mostrar la Vigencia
            if(datos.vigencia) {
                // Convertimos el formato YYYY-MM-DD a DD/MM/YYYY
                const partes = datos.vigencia.split('-');
                document.querySelector('.badge-validez span').textContent = `Vigencia: Hasta el ${partes[2]}/${partes[1]}/${partes[0]}`;
            }
/*
            // 2. Mostrar Alerta de Cuota 1 si el vendedor la activó
            if(datos.incluyeCuota1 && datos.valorCuota1) {
                const badgeCuota1 = document.createElement('div');
                badgeCuota1.className = 'badge-alerta';
                badgeCuota1.style.marginTop = '10px';
                badgeCuota1.style.background = 'var(--success-green)';
                badgeCuota1.style.color = 'white';
                badgeCuota1.innerHTML = `<strong>Cuota 1: </strong><strong>$${new Intl.NumberFormat('es-AR').format(datos.valorCuota1)}</strong>`;
                
                // Lo inyectamos en la caja de análisis de capital para que llame la atención
                document.querySelector('.analisis-capital-box').prepend(badgeCuota1);
            }*/

            // --- CARRUSEL DINÁMICO DE FOTOS ("PEEK" EFFECT) ---
// --- CARRUSEL DINÁMICO DE FOTOS REALES ---
            // Leemos la galería que guardó el Admin en Firebase. Si no hay galería, leemos la foto simple.
            let galeria = fin.imgGaleria && fin.imgGaleria.length > 0 ? fin.imgGaleria : [fin.imgFoto || 'img/ford.png'];
            galeriaGlobal = galeria;
            
            const carruselTrack = document.getElementById('carrusel-track');
            carruselTrack.innerHTML = ''; 

            galeria.forEach((src, idx) => {
                const img = document.createElement('img');
                img.src = src.trim(); // Nos aseguramos de sacar los espacios
                img.className = 'carrusel-slide' + (idx === 0 ? ' active' : '');
                
                img.addEventListener('click', () => {
                    lightboxImg.src = img.src;
                    lightbox.style.display = 'flex';
                });
                
                carruselTrack.appendChild(img);
            });

            let indexFoto = 0;
            const slides = document.querySelectorAll('.carrusel-slide');
            const actualizarCarrusel = () => {
                const desplazamiento = 8 - (indexFoto * 84);
                carruselTrack.style.transform = `translateX(${desplazamiento}%)`;
                
                slides.forEach((s, i) => {
                    if (i === indexFoto) s.classList.add('active');
                    else s.classList.remove('active');
                });
            };

            if (galeria.length > 1) {
                setInterval(() => {
                    indexFoto = (indexFoto + 1) % galeria.length;
                    actualizarCarrusel();
                }, 4000); 
            }

            // --- VIDEO SPOT DINÁMICO ---
            const videoIframe = document.getElementById('video-spot');
            let videoId = fin.videoID || ""; 

            if (videoId !== "") {
                // Si el Admin guardó un ID de YouTube, lo inyectamos acá
                videoIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0`;
                document.querySelector('.card-video').style.display = 'block';
            } else {
                // Si el Admin no le puso video al plan, borramos la sección para que no quede un hueco negro
                document.querySelector('.card-video').style.display = 'none';
            }
            // --- CARGA DE DATOS FINANCIEROS Y ANIMACIÓN ---
            if (fin) {
                document.getElementById('precio-lista-txt').textContent = `$${new Intl.NumberFormat('es-AR').format(fin.precioLista)}`;
                document.getElementById('total-cuotas-txt').textContent = `${fin.totalCuotas} cuotas`;
                document.getElementById('cuota-pura-txt').textContent = `$${new Intl.NumberFormat('es-AR').format(fin.cuotaPura)}`;
                document.getElementById('monto-financiado-txt').textContent = `$${new Intl.NumberFormat('es-AR').format(fin.montoFinanciado)}`;
                document.getElementById('monto-alicuota-txt').textContent = `$${new Intl.NumberFormat('es-AR').format(fin.alicuotaComplementaria)}`;

                // Cálculos del gráfico
                const pctFinanciado = Math.round((fin.montoFinanciado / fin.precioLista) * 100);
                const pctAli = 100 - pctFinanciado;

                document.getElementById('txt-pct-fin').textContent = `(${pctFinanciado}%)`;
                document.getElementById('txt-pct-ali').textContent = `(${pctAli}%)`;

                const graficoPlan = document.getElementById('grafico-plan');
                const txtPorcentaje = document.getElementById('porcentaje-financiado');

                // ESTADO INICIAL DEL GRÁFICO
                txtPorcentaje.textContent = `0%`;
                graficoPlan.style.background = `conic-gradient(var(--border-color) 0% 100%)`;

                // ANIMACIÓN FLUIDA DE BARRIDO
                const duracion = 1400; // 1.4 segundos
                let inicioTiempo = null;

                function animarGrafico(tiempoActual) {
                    if (!inicioTiempo) inicioTiempo = tiempoActual;
                    const transcurrido = tiempoActual - inicioTiempo;
                    const progreso = Math.min(transcurrido / duracion, 1);

                    // Curva suave
                    const easeOut = 1 - Math.pow(1 - progreso, 3);
                    const barridoTotal = easeOut * 100;
                    const contadorNum = Math.round(easeOut * pctFinanciado);

                    txtPorcentaje.textContent = `${contadorNum}%`;

                    if (barridoTotal <= pctFinanciado) {
                        graficoPlan.style.background = `conic-gradient(
                            var(--ford-blue) 0% ${barridoTotal}%, 
                            var(--border-color) ${barridoTotal}% 100%
                        )`;
                    } else {
                        graficoPlan.style.background = `conic-gradient(
                            var(--ford-blue) 0% ${pctFinanciado}%, 
                            var(--warning-orange) ${pctFinanciado}% ${barridoTotal}%, 
                            var(--border-color) ${barridoTotal}% 100%
                        )`;
                    }

                    if (progreso < 1) {
                        requestAnimationFrame(animarGrafico);
                    } else {
                        txtPorcentaje.textContent = `${pctFinanciado}%`;
                        graficoPlan.style.background = `conic-gradient(
                            var(--ford-blue) 0% ${pctFinanciado}%, 
                            var(--warning-orange) ${pctFinanciado}% 100%
                        )`;
                    }
                }

                setTimeout(() => {
                    requestAnimationFrame(animarGrafico);
                }, 250);

                // --- UNIFICACIÓN OPERACIÓN Y CUOTAS ---
               // --- UNIFICACIÓN OPERACIÓN Y CUOTAS ---
                const capitalCliente = Number(String(datos.clienteCapital).replace(/\D/g, '')) || 0;
                const alicuota = fin.alicuotaComplementaria;
                const recBox = document.getElementById('recomendacion-capital');

                if (capitalCliente >= alicuota) {
                    const restante = capitalCliente - alicuota;
                    const cuotasCancelables = Math.floor(restante / fin.cuotaPura);
                    const cuotasRestantes = fin.totalCuotas - cuotasCancelables;
                    
                    // Texto estructurado y fácil de leer
                    recBox.innerHTML = `
                        <span style="display:block; margin-bottom:8px; color: var(--ford-blue);">✅ <strong>¡Tu capital supera el anticipo!</strong></span>
                        Con tu inversión cubrís el <strong>${pctAli}% no financiable</strong> ($${new Intl.NumberFormat('es-AR').format(alicuota)}) para pedir la unidad.<br><br>
                        El dinero restante adelanta <strong>${cuotasCancelables} cuotas puras</strong>. Te quedarían solo <strong>${cuotasRestantes} cuotas</strong> por abonar.
                    `;
                } else {
                    const falta = alicuota - capitalCliente;
                    recBox.innerHTML = `
                        <span style="display:block; margin-bottom:8px; color: var(--ford-blue);">📊 <strong>Análisis de tu plan:</strong></span>
                        Con tu capital actual ($${new Intl.NumberFormat('es-AR').format(capitalCliente)}) te ayuda a cubrir parte del anticipo.<br><br>
                        Para llegar al <strong>${pctAli}% de integración</strong> requerido, faltarían <strong>$${new Intl.NumberFormat('es-AR').format(falta)}</strong>.
                    `;
                }

                if (datos.cambioModelo && datos.cambioModelo !== "Ninguno") {
                    document.getElementById('alerta-cambio-modelo').style.display = 'block';
                    document.getElementById('txt-cambio-modelo').textContent = `Para retirar la ${datos.cambioModelo}, deberás abonar el ${pctAli}% de este plan + la diferencia de modelo.`;
                }

                if (datos.entregaUsado && datos.detalleUsado) {
                    document.getElementById('box-usado').style.display = 'block';
                    document.getElementById('txt-detalle-usado').textContent = datos.detalleUsado;
                }

                // --- Llenar tabla de cuotas ---
                // --- LLENAR TABLAS DE CUOTAS (PRINCIPAL Y MODAL) ---
                const tbody = document.getElementById('tbody-cuotas');
                const tbodyModal = document.getElementById('tbody-modal-cuotas');
                tbody.innerHTML = '';
                if(tbodyModal) tbodyModal.innerHTML = '';

                // 1. INYECTAMOS LA CUOTA 1 (Si existe)
                if(datos.incluyeCuota1 && datos.valorCuota1) {
                    const filaC1 = `
                        <td style="color: var(--ford-blue); font-weight: 700;">Cuota 1</td>
                        <td class="alinear-derecha precio-tabla" style="color: var(--ford-blue) !important;">$${new Intl.NumberFormat('es-AR').format(datos.valorCuota1)}</td>
                    `;
                    
                    const tr = document.createElement('tr');
                    tr.style.backgroundColor = 'var(--ford-light)';
                    tr.innerHTML = filaC1;
                    tbody.appendChild(tr);

                    if(tbodyModal){
                        const trModal = document.createElement('tr');
                        trModal.style.backgroundColor = 'var(--ford-light)';
                        trModal.innerHTML = filaC1;
                        tbodyModal.appendChild(trModal);
                    }
                }

                // 2. INYECTAMOS EL RESTO DE LOS TRAMOS
                if (fin.estructuraCuotas && fin.estructuraCuotas.length > 0) {
                    fin.estructuraCuotas.forEach((tramo, index) => {
                        const filaHTML = `<td>Cuotas ${tramo.rango}</td><td class="alinear-derecha precio-tabla">$${new Intl.NumberFormat('es-AR').format(tramo.valor)}</td>`;
                        
                        const tr = document.createElement('tr');
                        tr.innerHTML = filaHTML;
                        
                        // Si ya pasamos el primer tramo (index > 0), le ponemos la clase para que se oculte en PC
                        if (index > 0) {
                            tr.classList.add('tr-hide-pc');
                        }
                        tbody.appendChild(tr);

                        // Al modal le mandamos siempre todas las cuotas sin ocultar nada
                        if(tbodyModal){
                            const trModal = document.createElement('tr');
                            trModal.innerHTML = filaHTML;
                            tbodyModal.appendChild(trModal);
                        }
                    });
                }

                // 3. EVENTOS DEL MODAL DE CUOTAS
                const modalCuotas = document.getElementById('modal-cuotas');
                const btnAbrirCuotas = document.getElementById('btn-abrir-cuotas-pc');
                const btnCerrarCuotas = document.getElementById('btn-cerrar-modal-cuotas');

                if (btnAbrirCuotas && modalCuotas) {
                    btnAbrirCuotas.addEventListener('click', () => modalCuotas.style.display = 'flex');
                    btnCerrarCuotas.addEventListener('click', () => modalCuotas.style.display = 'none');
                    modalCuotas.addEventListener('click', (e) => { if (e.target === modalCuotas) modalCuotas.style.display = 'none'; });
                }

                // Simulador Lógico (Mínimo = Alícuota)
                const slider = document.getElementById('slider-capital');
                const montoCapTxt = document.getElementById('monto-capital-texto');
                const kpiAdelantadas = document.getElementById('cuotas-adelantadas');
                const kpiRestantes = document.getElementById('cuotas-restantes');

                slider.min = alicuota; 
                slider.max = fin.precioLista;
                slider.step = 10000;
                
                document.getElementById('slider-min-lbl').textContent = `Mínimo: $${new Intl.NumberFormat('es-AR').format(alicuota)}`;
                document.getElementById('slider-max-lbl').textContent = `Máximo: $${new Intl.NumberFormat('es-AR').format(fin.precioLista)}`;

                slider.value = Math.max(capitalCliente, alicuota);

                const runSimulador = (val) => {
                    const cap = Number(val);
                    montoCapTxt.textContent = `$${new Intl.NumberFormat('es-AR').format(cap)}`;
                    
                    const excedente = cap - alicuota;
                    let canceladas = 0;
                    if (excedente > 0) {
                        canceladas = Math.floor(excedente / fin.cuotaPura);
                    }
                    let quedan = fin.totalCuotas - canceladas;
                    if (quedan < 0) { quedan = 0; canceladas = fin.totalCuotas; }

                    kpiAdelantadas.textContent = canceladas;
                    kpiRestantes.textContent = quedan;
                };
                runSimulador(slider.value);
                slider.addEventListener('input', (e) => runSimulador(e.target.value));
            }

            // Comentarios Asesor
            if (datos.comentarios) {
                const boxAsesor = document.getElementById('nota-asesor');
                boxAsesor.style.display = 'block';
                boxAsesor.innerHTML = `<strong>Nota de tu asesor:</strong> <em>"${datos.comentarios}"</em>`;
            }

            // Beneficios y Legales
            const listaBen = document.getElementById('lista-beneficios');
            listaBen.innerHTML = '';
            if (datos.beneficiosSeleccionados && datos.beneficiosSeleccionados.length > 0) {
                datos.beneficiosSeleccionados.forEach(b => {
                    const li = document.createElement('li');
                    li.innerHTML = `✅ <strong>${b}</strong>`;
                    listaBen.appendChild(li);
                });
            }

            const modal = document.getElementById('modal-legales');
            const cuerpoLegales = document.getElementById('cuerpo-legales');
            if (datos.textosLegales && datos.textosLegales.length > 0) {
                cuerpoLegales.innerHTML = datos.textosLegales.map((t, idx) => `
                    <div style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                        <strong style="color: var(--ford-blue);">${datos.beneficiosSeleccionados[idx]}</strong>
                        <p style="margin-top: 4px;">${t}</p>
                    </div>
                `).join('');
            }
            document.getElementById('btn-abrir-legales').addEventListener('click', () => modal.style.display = 'flex');
            document.getElementById('btn-cerrar-legales').addEventListener('click', () => modal.style.display = 'none');
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

            // --- DATOS DEL ASESOR REALES DESDE FIREBASE ---
            if (datos.vendedorUid) {
                const vendedorSnap = await getDoc(doc(db, "usuarios", datos.vendedorUid));
                if (vendedorSnap.exists()) {
                    const vendData = vendedorSnap.data();
                    
                    document.getElementById('asesor-nombre').textContent = vendData.nombreCompleto || datos.vendedorEmail.split('@')[0];
                    document.getElementById('asesor-email').textContent = vendData.email || datos.vendedorEmail;
                    
                    const telReal = vendData.telefono || "";
                    document.getElementById('asesor-tel').textContent = telReal !== "" ? telReal : "Solicitar número";
                    
                    const wppBtn = document.getElementById('btn-whatsapp');
                    // Limpiamos el teléfono de espacios o guiones para la URL de WhatsApp
                    const telLimpio = telReal.replace(/\D/g, ''); 
                    
                    if (telLimpio !== "") {
                        const wppMsg = `Hola! Estuve revisando mi propuesta de Ford Dietrich para el plan ${datos.planBase}. Quisiera avanzar.`;
                        wppBtn.href = `https://wa.me/${telLimpio}?text=${encodeURIComponent(wppMsg)}`;
                        wppBtn.target = '_blank';
                    } else {
                        // Si el vendedor no configuró su teléfono, ocultamos el botón
                        wppBtn.style.display = 'none';
                    }
                }
            } else {
                document.getElementById('asesor-nombre').textContent = "Asesor Dietrich";
                document.getElementById('asesor-email').textContent = datos.vendedorEmail || "ventas@dietrich.com.ar";
                document.getElementById('btn-whatsapp').style.display = 'none';
            }

            // Ocultamos la carga y mostramos la propuesta
            pantallaCarga.style.display = 'none';
            contenedorCotizacion.style.display = 'block';

        } else {
            pantallaCarga.innerHTML = "<h2>Esta propuesta ha caducado o no existe.</h2>";
        }
    } catch (e) {
        console.error(e);
        pantallaCarga.innerHTML = "<h2>Error al cargar datos. Verifique la consola.</h2>";
    }
}

// ==========================================
// LÓGICA GENERAR PDF INFALIBLE 
// ==========================================
document.getElementById('btn-descargar-pdf').addEventListener('click', () => {
    if(!finGlobales || !datosGlobales) return;

    // EL TRUCO ANTI-BLANCO
    const scrollYOriginal = window.scrollY;
    window.scrollTo(0, 0);

    const pantallaCarga = document.getElementById('pantalla-carga');
    const textoCarga = document.getElementById('texto-carga');
    
    textoCarga.textContent = "Generando documento PDF oficial...";
    pantallaCarga.style.display = 'flex';

    // HTML EXACTO CON MEDIDAS (700px)
    const htmlParaPDF = `
        <div style="width: 700px; margin: 0 auto; padding: 10px; font-family: 'Montserrat', sans-serif; color: #333; background: #fff; box-sizing: border-box;">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #003478; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="color: #003478; margin:0; font-size: 1.6rem; font-weight: 800;">Propuesta Comercial Ford Dietrich</h2>
                <p style="margin:0; font-size: 0.95rem;">Cliente: <strong>${datosGlobales.clienteNombre}</strong></p>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
                ${galeriaGlobal.map(img => `<img src="${img}" style="width: 32%; height: 135px; object-fit: cover; border-radius: 8px;">`).join('')}
            </div>

            <div style="page-break-inside: avoid;">
                <h3 style="background: #003478; color: white; padding: 10px 15px; border-radius: 6px; margin-bottom: 15px; font-size: 1.2rem;">${finGlobales.nombreCompleto}</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem; margin-bottom: 20px;">
                    <tr><td style="padding: 8px 5px; border-bottom: 1px solid #ddd;">Valor del Vehículo de Lista</td><td style="text-align:right; border-bottom: 1px solid #ddd;"><strong>$${new Intl.NumberFormat('es-AR').format(finGlobales.precioLista)}</strong></td></tr>
                    <tr><td style="padding: 8px 5px; border-bottom: 1px solid #ddd;">Monto Financiado</td><td style="text-align:right; border-bottom: 1px solid #ddd;"><strong>$${new Intl.NumberFormat('es-AR').format(finGlobales.montoFinanciado)}</strong></td></tr>
                    <tr><td style="padding: 8px 5px; border-bottom: 1px solid #ddd;">Alícuota Extra (Monto No Financiable)</td><td style="text-align:right; border-bottom: 1px solid #ddd;"><strong>$${new Intl.NumberFormat('es-AR').format(finGlobales.alicuotaComplementaria)}</strong></td></tr>
                    <tr><td style="padding: 8px 5px; border-bottom: 1px solid #ddd;">Valor Actual de Cuota Pura</td><td style="text-align:right; color:#003478; border-bottom: 1px solid #ddd; font-size: 1.15rem;"><strong>$${new Intl.NumberFormat('es-AR').format(finGlobales.cuotaPura)}</strong></td></tr>
                </table>
            </div>

            <div style="page-break-inside: avoid;">
                <h4 style="margin-bottom: 10px; color: #003478; border-bottom: 1px solid #003478; padding-bottom: 5px; font-size: 1.05rem;">Estructura de Cuotas Proyectada</h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 0.9rem;">
                    <tr style="background: #f4f7f9;">
                        <th style="padding: 10px; text-align:left; border-bottom: 1px solid #ccc;">Rango de Cuotas</th>
                        <th style="padding: 10px; text-align:right; border-bottom: 1px solid #ccc;">Valor Mensual</th>
                    </tr>
                    ${finGlobales.estructuraCuotas.map(c => `<tr><td style="padding: 8px 10px; border-bottom: 1px solid #eee;">Cuotas ${c.rango}</td><td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align:right; font-weight: bold;">$${new Intl.NumberFormat('es-AR').format(c.valor)}</td></tr>`).join('')}
                </table>
            </div>

            <div style="page-break-inside: avoid;">
                <h4 style="margin-bottom: 10px; color: #003478; border-bottom: 1px solid #003478; padding-bottom: 5px; font-size: 1.05rem;">Beneficios Exclusivos Asignados</h4>
                <ul style="margin-bottom: 20px; font-size: 0.95rem; line-height: 1.8; list-style-type: none; padding-left: 0;">
                    ${datosGlobales.beneficiosSeleccionados.map(b => `<li>✅ <strong>${b}</strong></li>`).join('')}
                </ul>
            </div>

            <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 0.85rem; page-break-inside: avoid;">
                <div>
                    <h4 style="color: #003478; margin-bottom: 5px; font-size: 1rem;">Tu Asesor Comercial</h4>
                    <p style="margin: 0; line-height: 1.5;"><strong>Juan Pérez</strong><br>jperez@dietrich.com.ar<br>+54 9 11 1234-5678</p>
                </div>
                <div style="text-align: right;">
                    <h4 style="color: #003478; margin-bottom: 5px; font-size: 1rem;">Casa Central Dietrich</h4>
                    <p style="margin: 0; line-height: 1.5;">Av. Corrientes 4242<br>Almagro, CABA<br>Canales de pago habilitados</p>
                </div>
            </div>

            <div style="margin-top: 25px; padding: 15px; background: #f4f7f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.65rem; color: #4a5568; line-height: 1.4; page-break-inside: avoid; text-align: justify;">
                <strong style="color: #003478;">Bases y Condiciones Legales:</strong><br><br>
                ${datosGlobales.textosLegales && datosGlobales.textosLegales.length > 0 ? datosGlobales.textosLegales.join(' ') : 'Términos estándar de Plan Óvalo.'}
                <br><br>El valor de la cuota pura es referencial y no incluye gastos administrativos, diferimientos ni seguros de vida o del automotor. Operación sujeta al valor móvil de la unidad dictado por Ford Argentina S.C.A.
            </div>
        </div>
    `;

    // TRUCO ANTI-CORTE
    const opt = {
      margin:       [10, 10, 10, 10], 
      filename:     `Propuesta_Ford_${datosGlobales.clienteNombre}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          scrollY: 0,           
          windowWidth: 780      
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    setTimeout(() => {
        html2pdf().set(opt).from(htmlParaPDF).save().then(() => {
            pantallaCarga.style.display = 'none';
            textoCarga.textContent = "Cargando tu propuesta personalizada...";
            window.scrollTo(0, scrollYOriginal);
        });
    }, 800); 
});

cargarPropuesta();