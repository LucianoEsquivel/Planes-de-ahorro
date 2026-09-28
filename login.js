import { auth, db, doc, setDoc, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from './firebase.js';

// Elementos UI
const cardLogin = document.getElementById('card-login');
const cardRegistro = document.getElementById('card-registro');
const linkCrear = document.getElementById('link-crear');
const linkVolver = document.getElementById('link-volver-login');

// Alternar tarjetas
linkCrear.addEventListener('click', (e) => {
    e.preventDefault();
    cardLogin.style.display = 'none';
    cardRegistro.style.display = 'block';
});

linkVolver.addEventListener('click', (e) => {
    e.preventDefault();
    cardRegistro.style.display = 'none';
    cardLogin.style.display = 'block';
});

// ==============================================
// 1. INICIAR SESIÓN
// ==============================================
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-login');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    btnSubmit.disabled = true;
    btnSubmit.textContent = "Verificando...";

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Si sale bien, lo mandamos al catálogo
        window.location.href = "catalogo.html";
    } catch (error) {
        console.error("Error Login:", error.code);
        alert("❌ Credenciales incorrectas o usuario no registrado.");
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Ingresar al Sistema";
    }
});

// ==============================================
// 2. CREAR CUENTA (FILTRO POR DOMINIO)
// ==============================================
document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-reg');
    const nombre = document.getElementById('reg-nombre').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (password !== passwordConfirm) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    // EL FILTRO DE SEGURIDAD DE DOMINIOS
    const dominiosPermitidos = ['@vwdietrich.com', '@forddietrich.com', 'grupodietrich'];
    
    // Verificamos si el email contiene alguno de los dominios permitidos
    const esDominioValido = dominiosPermitidos.some(dominio => email.includes(dominio));

    if (!esDominioValido) {
        alert("🛑 ACCESO DENEGADO.\nSolo se pueden registrar correos corporativos oficiales de Grupo Dietrich.");
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = "Creando cuenta...";

    try {
        // 1. Crear el usuario en el motor de autenticación
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Guardar sus datos extra (Nombre, Rol) en la base de datos
        await setDoc(doc(db, "usuarios", user.uid), {
            nombreCompleto: nombre,
            email: email,
            rol: "Vendedor", // Por defecto todos son vendedores al registrarse
            fechaRegistro: new Date()
        });

        alert("✅ ¡Cuenta creada con éxito! Bienvenido al sistema.");
        window.location.href = "catalogo.html";

    } catch (error) {
        console.error("Error Registro:", error.code);
        if (error.code === 'auth/email-already-in-use') {
            alert("⚠️ Este correo ya está registrado.");
        } else {
            alert("❌ Hubo un error al crear la cuenta. Intentá nuevamente.");
        }
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Verificar y Crear Cuenta";
    }
});

// ==============================================
// 3. OLVIDÉ MI CONTRASEÑA
// ==============================================
document.getElementById('btn-olvide-pass').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    
    if(!email) {
        alert("Por favor, escribí tu correo en la casilla primero y luego tocá 'Olvidé mi contraseña'.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        alert(`✉️ Se ha enviado un enlace de recuperación a:\n${email}\n\nRevisá tu bandeja de entrada o Spam.`);
    } catch (error) {
        console.error("Error Password Reset:", error.code);
        alert("❌ No se encontró una cuenta con ese correo.");
    }
});