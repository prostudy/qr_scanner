const { createApp, ref, computed, onMounted, onBeforeUnmount, nextTick } = Vue;

const app = createApp({
    setup() {
        // --- State (Refs) ---
        const currentSection = ref('scan'); // 'scan', 'welcome', 'gifts', 'confirmation', 'error'
        const isLoading = ref(false);
        const loadingMessage = ref('Cargando...');
        const currentUser = ref(null); // { id, name, points, qrCode }
        const availableGifts = ref([]); // [ { id, name, pointsCost, stock, imageUrl } ]
        const selectedGiftIds = ref([]);
        const errorMessage = ref('');
        const cameraError = ref('');
        const tempGiftError = ref(''); // Temporary errors on the gifts screen

        const qrScannerInstance = ref(null);
        const resetTimer = ref(null);

        // --- Configuration ---
        const RESET_TIMEOUT = 5000; // 15 seconds
        const allowMultipleGifts = false; // Set to true to allow multiple selections

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

        const cartItemCount = computed(() => {
            return selectedGiftIds.value.length;
        });

        const canConfirmSelection = computed(() => {
            return selectedGiftIds.value.length > 0 && remainingPoints.value >= 0;
        });

        // --- Methods ---

        /** Changes the currently visible section */
        const showSection = (sectionId) => {
            clearTimeout(resetTimer.value);
            isLoading.value = false;
        
            if (currentSection.value === 'scan' && sectionId !== 'scan' && qrScannerInstance.value) {
                stopQrScanner();
            }
        
            currentSection.value = sectionId; // Vue planifica la actualización del DOM
        
            // !!! LA PARTE CLAVE !!!
            if (sectionId === 'scan') {
                // Espera al siguiente "tick" del ciclo de actualización del DOM
                nextTick(() => {
                    // Ahora estamos SEGUROS de que el v-if="currentSection === 'scan'"
                    // ha sido procesado y el div #qr-reader existe en el DOM.
                    console.log("DOM updated, attempting to start scanner..."); // Añade log para confirmar
                    startQrScanner();
                });
            }
        
            if (sectionId === 'confirmation' || sectionId === 'error') {
                resetTimer.value = setTimeout(resetToScan, RESET_TIMEOUT);
            }
        };

        /** Simulates validating QR code (Replace with actual API call) */
        const validateQrCode = async (qrCode) => {
            console.log(`Simulating validation for QR: ${qrCode}`);
            loadingMessage.value = 'Validando código...';
            isLoading.value = true;
            await new Promise(resolve => setTimeout(resolve, 1500));

            // ** BACKEND LOGIC SIMULATION **
            //if (qrCode === "VALID_QR_123") {
            if(true){
                isLoading.value = false;
                return { success: true, user: { id: 'user001', name: 'Raúl González', points: 150, qrCode: qrCode } };
            } else if (qrCode === "ALREADY_SCANNED_QR") {
                isLoading.value = false;
                return { success: false, error: 'Este código QR ya ha sido escaneado.' };
            } else {
                isLoading.value = false;
                return { success: false, error: 'Código QR inválido o no encontrado.' };
            }
        };

        /** Simulates fetching gifts (Replace with actual API call) */
        const fetchGifts = async () => {
            console.log("Simulating fetching gifts...");
            loadingMessage.value = 'Cargando regalos...';
            isLoading.value = true;
            await new Promise(resolve => setTimeout(resolve, 1000));

            // ** BACKEND LOGIC SIMULATION **
            isLoading.value = false;
            return {
                success: true,
                gifts: [
                    { id: 'gift01', name: 'Gorra', pointsCost: 50, stock: 10, imageUrl: 'images/gorra.png' },
                    { id: 'gift02', name: 'Termo', pointsCost: 50, stock: 5, imageUrl: 'images/termo.png' },
                    { id: 'gift03', name: 'Sudadera', pointsCost: 50, stock: 0, imageUrl: 'images/sudadera.png' },
                    { id: 'gift04', name: 'Playera', pointsCost: 50, stock: 20, imageUrl: 'images/playera.png' },
                    { id: 'gift05', name: 'Mochila', pointsCost: 100, stock: 8, imageUrl: 'images/mochila.png' },
                ]
            };
        };

        /** Simulates confirming selection (Replace with actual API call) */
        const confirmGiftSelectionApi = async (userId, giftIds) => {
            console.log(`Simulating confirmation for user ${userId}, gifts: ${giftIds.join(', ')}`);
            loadingMessage.value = 'Confirmando selección...';
            isLoading.value = true;
            await new Promise(resolve => setTimeout(resolve, 1500));

            // ** BACKEND LOGIC SIMULATION **
            // Simulate an out-of-stock error during confirmation sometimes
             // if (giftIds.includes('gift02') && Math.random() > 0.7) {
             //    isLoading.value = false;
             //    return { success: false, error: 'Lo sentimos, el Termo se acaba de agotar. Por favor elige otro.' };
             // }

            isLoading.value = false;
            return { success: true };
        };

        /** Starts the QR Scanner */
        const startQrScanner = () => {
            cameraError.value = ''; // Clear previous errors
            if (qrScannerInstance.value) {
                 console.log("Scanner potentially already running or needs cleanup.");
                 // Attempt to stop just in case, before starting again
                 stopQrScanner().finally(() => {
                    createAndStartScanner();
                 });
            } else {
                 createAndStartScanner();
            }
        };

        const createAndStartScanner = () => {
             if (!document.getElementById('qr-reader')) {
                 console.error("QR Reader element not found in DOM yet.");
                 cameraError.value = "Error al inicializar el lector QR.";
                 return;
             }
            // Prevent duplicate instances if called rapidly
            if(qrScannerInstance.value) return;

            const scanner = new Html5Qrcode("qr-reader");
             qrScannerInstance.value = scanner;

             const qrCodeSuccessCallback = (decodedText, decodedResult) => {
                 console.log(`Code matched = ${decodedText}`);
                 if (qrScannerInstance.value) { // Check if instance exists before stopping
                     stopQrScanner().then(() => {
                        handleQrScanSuccess(decodedText);
                     });
                 } else {
                     // Should not happen if logic is correct, but handle defensively
                     handleQrScanSuccess(decodedText);
                 }

             };
             const config = { fps: 10, qrbox: { width: 200, height: 200 }, rememberLastUsedCamera: false }; // added rememberLastUsedCamera: false

             // Check for camera permissions first (optional but good practice)
             Html5Qrcode.getCameras().then(devices => {
                 if (devices && devices.length) {
                      // Start scanning with the back camera if available
                     const cameraId = devices.find(device => device.label.toLowerCase().includes('back'))?.id || devices[0].id; // Prefer back camera
                     scanner.start(
                         cameraId, // { facingMode: "environment" }, // Alternatively use facingMode
                         config,
                         qrCodeSuccessCallback,
                         (errorMessage) => { /*console.warn(`QR Scan Error: ${errorMessage}`);*/ }
                     ).then(() => {
                         console.log("QR Scanner started successfully.");
                         cameraError.value = '';
                     }).catch((err) => {
                         console.error(`Unable to start scanning: ${err}`);
                         cameraError.value = "No se pudo iniciar la cámara. Verifica los permisos.";
                         // Optionally show error section
                         // displayError("No se pudo acceder a la cámara.");
                         qrScannerInstance.value = null; // Reset instance on failure
                     });
                 } else {
                      console.error("No cameras found.");
                      cameraError.value = "No se encontraron cámaras.";
                      qrScannerInstance.value = null;
                 }
             }).catch(err => {
                 console.error("Error getting cameras:", err);
                 cameraError.value = "Error al acceder a las cámaras. Verifica los permisos.";
                  if (err.name === "NotAllowedError") {
                     cameraError.value = "Permiso de cámara denegado. Habilítalo para escanear.";
                 }
                 qrScannerInstance.value = null;
             });
        }

        /** Stops the QR Scanner */
        const stopQrScanner = async () => {
             if (qrScannerInstance.value) {
                 console.log("Attempting to stop QR Scanner...");
                 try {
                    // Check state before stopping - prevents errors if already stopped
                    if (qrScannerInstance.value.getState() === Html5QrcodeScannerState.SCANNING || qrScannerInstance.value.getState() === Html5QrcodeScannerState.PAUSED) {
                         await qrScannerInstance.value.stop();
                         console.log("QR Scanner stopped.");
                    } else {
                         console.log("Scanner was not in a stoppable state.")
                    }
                     qrScannerInstance.value = null; // Release the instance
                 } catch (err) {
                     console.error("Error stopping QR Scanner:", err);
                      // Don't nullify instance if stop failed, maybe retry later? Or handle error
                 }
             } else {
                 console.log("QR Scanner instance not found or already stopped.");
             }
        };

        /** Handles successful QR scan */
        const handleQrScanSuccess = async (qrCode) => {
             // isLoading will be set by validateQrCode
             try {
                 const result = await validateQrCode(qrCode);
                 if (result.success) {
                     currentUser.value = result.user;
                     showSection('welcome');
                 } else {
                     displayError(result.error || 'Código QR no válido.');
                 }
             } catch (error) {
                 console.error("Validation API call failed:", error);
                 displayError('Error de conexión al validar.');
             }
        };

        /** Moves from Welcome to Gift Selection */
        const handleStartSelection = async () => {
             selectedGiftIds.value = []; // Reset selection
             tempGiftError.value = ''; // Clear previous gift errors
            // isLoading will be set by fetchGifts
            try {
                const result = await fetchGifts();
                if (result.success) {
                    availableGifts.value = result.gifts;
                    showSection('gifts');
                } else {
                    displayError(result.error || 'No se pudieron cargar los regalos.');
                }
            } catch (error) {
                console.error("Fetch gifts API call failed:", error);
                displayError('Error de conexión al cargar regalos.');
            }
        };

        /** Toggles selection of a gift */
        const handleGiftSelection = (gift) => {
            tempGiftError.value = ''; // Clear temporary error on interaction
            const giftId = gift.id;
            const index = selectedGiftIds.value.indexOf(giftId);

            if (index > -1) {
                // Deselect
                selectedGiftIds.value.splice(index, 1);
            } else {
                // Select
                 if (remainingPoints.value >= gift.pointsCost) {
                    if (allowMultipleGifts) {
                         selectedGiftIds.value.push(giftId);
                    } else {
                         // Single selection mode: replace current selection
                         selectedGiftIds.value = [giftId];
                    }
                 } else {
                    showTemporaryGiftError("No tienes suficientes puntos para este artículo.");
                 }
            }
        };

         /** Checks if a gift ID is currently selected */
         const isGiftSelected = (giftId) => {
             return selectedGiftIds.value.includes(giftId);
         };

         /** Shows a temporary error on the gifts screen */
        const showTemporaryGiftError = (message) => {
            tempGiftError.value = message;
            setTimeout(() => { tempGiftError.value = ''; }, 3000);
        }


        /** Handles confirming the selected gifts */
        const handleConfirmSelection = async () => {
            if (!canConfirmSelection.value) return;
             // isLoading will be set by confirmGiftSelectionApi
             try {
                 const result = await confirmGiftSelectionApi(currentUser.value.id, selectedGiftIds.value);
                 if (result.success) {
                     showSection('confirmation');
                 } else {
                     // Stay on gifts screen, show error
                     showTemporaryGiftError(result.error || 'No se pudo confirmar la selección.');
                     // Optional: Re-fetch gifts here in case stock changed
                     // await handleStartSelection(); // This would reset selection, maybe not ideal UX
                     // Better: fetch gifts silently and update availableGifts.value
                     // This requires the fetchGifts function to not set isLoading=true
                 }
             } catch (error) {
                 console.error("Confirm selection API call failed:", error);
                 displayError('Error de conexión al confirmar.');
             }
        };

        /** Displays an error message on the error screen */
        const displayError = (message) => {
            errorMessage.value = message || 'Ocurrió un error inesperado.';
            showSection('error');
        };

        /** Resets the application to the initial scanning state */
        const resetToScan = () => {
            clearTimeout(resetTimer.value);
            console.log("Resetting to scan screen.");
            currentUser.value = null;
            availableGifts.value = [];
            selectedGiftIds.value = [];
            errorMessage.value = '';
            cameraError.value = '';
            tempGiftError.value = '';
            // Scanner will be started by showSection('scan')
            showSection('scan');
        };

        // --- Lifecycle Hooks ---
        onMounted(() => {
            console.log("Vue App Mounted");
            // Start scanner immediately only if the initial section is 'scan'
            if (currentSection.value === 'scan') {
                 // Use nextTick here too, just in case mounting is faster than expected
                 nextTick(() => {
                    startQrScanner();
                 });
            }
        });

        onBeforeUnmount(() => {
            console.log("Vue App Before Unmount");
            stopQrScanner(); // Clean up scanner
            clearTimeout(resetTimer.value); // Clear any pending reset
        });

        // --- Return values accessible in the template ---
        return {
            currentSection,
            isLoading,
            loadingMessage,
            currentUser,
            availableGifts,
            selectedGiftIds,
            errorMessage,
            cameraError,
            tempGiftError,
            totalSelectedPoints,
            remainingPoints,
            cartItemCount,
            canConfirmSelection,
            handleStartSelection,
            handleGiftSelection,
            isGiftSelected,
            handleConfirmSelection,
            resetToScan,
            // No need to return showSection, displayError etc. if only called internally
            // Only return what the template *directly* needs to call or display
        };
    } // end setup()
});




app.mount('#app');