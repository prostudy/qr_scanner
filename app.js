const { createApp, ref, computed, onMounted, onBeforeUnmount, nextTick } = Vue;

const app = createApp({
    setup() {
        // --- State (Refs) ---
        const currentSection = ref('scan');
        const isLoading = ref(false);
        const loadingMessage = ref('Cargando...');
        const currentUser = ref(null);
        const availableGifts = ref([]);
        const selectedGiftIds = ref([]);
        const errorMessage = ref('');
        const cameraError = ref('');
        const tempGiftError = ref('');

        const qrScannerInstance = ref(null);
        const resetTimer = ref(null);

        // --- Configuration ---
        const RESET_TIMEOUT = 2000;
        const allowMultipleGifts = false;

        // --- Computed Properties ---
        const totalSelectedPoints = computed(() => {
            return selectedGiftIds.value.reduce((total, giftId) => {
                const gift = availableGifts.value.find(g => g.id === giftId);
                return total + (gift ? gift.pointsCost : 0);
            }, 0);
        });

        const remainingPoints = computed(() => {
            return (currentUser.value?.points || 0) - totalSelectedPoints.value;
        });

        const cartItemCount = computed(() => selectedGiftIds.value.length);

        const canConfirmSelection = computed(() => selectedGiftIds.value.length > 0 && remainingPoints.value >= 0);

        // --- Methods ---

        /** Cambia la sección visible y maneja el escáner */
        const showSection = (sectionId) => {
            console.log(`[showSection] Changing to section: ${sectionId}. Current: ${currentSection.value}`);
            clearTimeout(resetTimer.value);
            isLoading.value = false;

            // Llama a stop SIEMPRE que salgas de 'scan'
            if (currentSection.value === 'scan' && sectionId !== 'scan') {
                 console.log("[showSection] Leaving 'scan' section, calling stopQrScanner...");
                 stopQrScanner(); // Detiene al salir
            }

            currentSection.value = sectionId; // Dispara la actualización (v-show o v-if)

            // Llama a start DENTRO de nextTick cuando entres a 'scan'
            // Con v-show, esto asegura que el elemento es visible y JS puede interactuar
            if (sectionId === 'scan') {
                nextTick(() => {
                    console.log("[showSection/nextTick] DOM likely updated for 'scan', calling startQrScanner...");
                    startQrScanner(); // Intentar iniciar el escáner
                });
            }

            // Configura el reseteo en pantallas finales
            if (sectionId === 'confirmation' || sectionId === 'error') {
                resetTimer.value = setTimeout(resetToScan, RESET_TIMEOUT);
            }
        };

        // --- Funciones de API Simuladas (¡REEMPLAZAR!) ---
        const validateQrCode = async (qrCode) => {
            console.log(`Simulating validation for QR: ${qrCode}`);
            loadingMessage.value = 'Validando acceso...'; isLoading.value = true;
            await new Promise(resolve => setTimeout(resolve, 1500));
            isLoading.value = false;
            //if (qrCode === "VALID_QR_123") return { success: true, user: { id: 'user001', name: 'Alex Martínez', points: 150, qrCode: qrCode } };
            if (true) return { success: true, user: { id: 'user001', name: 'Alex Martínez', points: 150, qrCode: qrCode } };
            if (qrCode === "ALREADY_SCANNED_QR") return { success: false, error: 'Este código QR ya fue utilizado.' };
            return { success: false, error: 'Código QR inválido o no encontrado.' };
        };
        const fetchGifts = async () => {
            console.log("Simulating fetching gifts...");
            loadingMessage.value = 'Cargando catálogo...'; isLoading.value = true;
            await new Promise(resolve => setTimeout(resolve, 1200));
            isLoading.value = false;
            return { success: true, gifts: [
                { id: 'gift01', name: 'Gorra Premium', pointsCost: 50, stock: 10, imageUrl: null },
                { id: 'gift02', name: 'Termo Metálico', pointsCost: 50, stock: 5, imageUrl: null },
                { id: 'gift03', name: 'Sudadera Evento', pointsCost: 100, stock: 0, imageUrl: null },
                { id: 'gift04', name: 'Playera Conmemorativa', pointsCost: 50, stock: 20, imageUrl: null },
                { id: 'gift05', name: 'Mochila Exclusiva', pointsCost: 150, stock: 8, imageUrl: null },
            ]};
        };
        const confirmGiftSelectionApi = async (userId, giftIds) => {
            console.log(`Simulating confirmation for user ${userId}, gifts: ${giftIds.join(', ')}`);
            loadingMessage.value = 'Procesando canje...'; isLoading.value = true;
            await new Promise(resolve => setTimeout(resolve, 1800));
            isLoading.value = false;
            return { success: true };
        };

        // --- Lógica del Escáner QR ---
        const stopQrScanner = async () => {
            const scanner = qrScannerInstance.value;
            if (scanner) {
                console.log("[stopQrScanner] Instance found. Attempting to stop...");
                try { await scanner.stop(); console.log("[stopQrScanner] Scanner stopped successfully."); }
                catch (err) { console.warn("[stopQrScanner] Error during stop() (might be ok):", err); }
                finally { qrScannerInstance.value = null; console.log("[stopQrScanner] Instance set to null."); }
            } else { console.log("[stopQrScanner] No instance found."); }
        };

        const startQrScanner = () => {
            console.log("[startQrScanner] Called.");
            cameraError.value = '';
            if (qrScannerInstance.value) { console.warn("[startQrScanner] Instance already exists. Aborting."); return; }
            createAndStartScanner();
        };

        const createAndStartScanner = () => {
             console.log("[createAndStartScanner] Attempting to create scanner...");
             const qrReaderElement = document.getElementById('qr-reader');

             if (!qrReaderElement) {
                 console.error("[createAndStartScanner] FATAL: #qr-reader element NOT FOUND.");
                 cameraError.value = "Error interno: No se encontró el lector QR.";
                 qrScannerInstance.value = null; return;
             }
             console.log("[createAndStartScanner] #qr-reader element FOUND.");

            if(qrScannerInstance.value) { console.warn("[createAndStartScanner] Aborted: Instance existed."); return; }

            console.log("[createAndStartScanner] Creating new Html5Qrcode instance...");
            const scanner = new Html5Qrcode("qr-reader", false);
            qrScannerInstance.value = scanner;
            console.log("[createAndStartScanner] New instance assigned.");

            const qrCodeSuccessCallback = (decodedText, decodedResult) => {
                 console.log(`[qrCodeSuccessCallback] Code matched = ${decodedText}`);
                 stopQrScanner().then(() => { handleQrScanSuccess(decodedText); })
                 .catch(err => { console.error("Error stopping scanner post-scan:", err); handleQrScanSuccess(decodedText); });
            };
            const config = { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 };

            Html5Qrcode.getCameras().then(devices => {
                 if (devices && devices.length) {
                     const cameraId = devices.find(d => d.label.toLowerCase().includes('back'))?.id || devices[0].id;
                     console.log(`[createAndStartScanner] Attempting scanner.start() with cam: ${cameraId}`);
                     if (qrScannerInstance.value) { // Re-check instance exists
                         qrScannerInstance.value.start(cameraId, config, qrCodeSuccessCallback, (err) => {})
                         .then(() => { console.log("[createAndStartScanner] scanner.start() OK."); cameraError.value = ''; })
                         .catch((err) => { console.error(`[createAndStartScanner] scanner.start() FAILED: ${err}`); cameraError.value = "No se pudo iniciar cámara."; stopQrScanner(); });
                    } else { console.error("[createAndStartScanner] Instance became null before start."); }
                 } else { console.error("[createAndStartScanner] No cameras."); cameraError.value = "No se encontraron cámaras."; qrScannerInstance.value = null; }
             }).catch(err => {
                 console.error("[createAndStartScanner] Error getCameras:", err); cameraError.value = "Error acceso cámara.";
                 if (err.name === "NotAllowedError") { cameraError.value = "Permiso cámara denegado."; }
                 qrScannerInstance.value = null;
             });
        };

        // --- Lógica del Flujo de Trabajo ---
        const handleQrScanSuccess = async (qrCode) => {
             try {
                 const result = await validateQrCode(qrCode);
                 if (result.success) { currentUser.value = result.user; showSection('welcome'); }
                 else { displayError(result.error || 'Código QR no válido.'); }
             } catch (error) { console.error("Validation API failed:", error); displayError('Error conexión validación.'); }
        };
        const handleStartSelection = async () => {
             selectedGiftIds.value = []; tempGiftError.value = '';
            try {
                const result = await fetchGifts();
                if (result.success) { availableGifts.value = result.gifts; showSection('gifts'); }
                else { displayError(result.error || 'Error cargando regalos.'); }
            } catch (error) { console.error("Fetch gifts API failed:", error); displayError('Error conexión regalos.'); }
        };
        const handleGiftSelection = (gift) => {
            tempGiftError.value = ''; const giftId = gift.id; const index = selectedGiftIds.value.indexOf(giftId);
            if (index > -1) { selectedGiftIds.value.splice(index, 1); }
            else {
                 if (remainingPoints.value >= gift.pointsCost) {
                    if (allowMultipleGifts) { selectedGiftIds.value.push(giftId); }
                    else { selectedGiftIds.value = [giftId]; }
                 } else { showTemporaryGiftError("No tienes suficientes puntos."); }
            }
        };
        const isGiftSelected = (giftId) => selectedGiftIds.value.includes(giftId);
        const showTemporaryGiftError = (message) => { tempGiftError.value = message; setTimeout(() => { tempGiftError.value = ''; }, 3500); };
        const handleConfirmSelection = async () => {
            if (!canConfirmSelection.value) return;
             try {
                 const result = await confirmGiftSelectionApi(currentUser.value.id, selectedGiftIds.value);
                 if (result.success) { showSection('confirmation'); }
                 else { showTemporaryGiftError(result.error || 'No se pudo confirmar.'); }
             } catch (error) { console.error("Confirm API failed:", error); displayError('Error conexión confirmación.'); }
        };
        const displayError = (message) => { errorMessage.value = message || 'Ocurrió un error inesperado.'; showSection('error'); };
        const resetToScan = () => {
            clearTimeout(resetTimer.value); console.log("[resetToScan] Initiated.");
            currentUser.value = null; availableGifts.value = []; selectedGiftIds.value = [];
            errorMessage.value = ''; cameraError.value = ''; tempGiftError.value = '';
            //showSection('scan'); // Llama a showSection, que usará nextTick
            location.reload();
        };

        // --- Hooks de Ciclo de Vida ---
        onMounted(() => {
            console.log("Vue App Mounted");
            if (currentSection.value === 'scan') { nextTick(() => { startQrScanner(); }); }
        });
        onBeforeUnmount(() => { console.log("Vue App Unmounting"); stopQrScanner(); clearTimeout(resetTimer.value); });

        // --- Return ---
        return {
            currentSection, isLoading, loadingMessage, currentUser, availableGifts, selectedGiftIds,
            errorMessage, cameraError, tempGiftError, totalSelectedPoints, remainingPoints,
            cartItemCount, canConfirmSelection, handleStartSelection, handleGiftSelection,
            isGiftSelected, handleConfirmSelection, resetToScan,
        };
    } // end setup()
});
// Montar la aplicación
app.mount('#app');