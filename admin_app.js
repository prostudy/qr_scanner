const { createApp, ref, computed, onMounted, onBeforeUnmount, nextTick } = Vue;

// Helper para generar IDs simples (para simulación)
let guestIdCounter = 0;

const app = createApp({
    setup() {
        // --- State ---
        const currentView = ref('eventForm'); // 'eventForm' o 'guestManagement'
        const isLoading = ref(false);
        const feedbackMessage = ref(''); // Mensaje de éxito o error
        const feedbackType = ref('success'); // 'success' o 'error'

        // -- Event State --
        const eventDetails = ref({
            id: null, // Podría asignarse al "guardar"
            title: '',
            cinema: '',
            hall: '',
            capacity: null,
            date: '',
            time: '',
            description: ''
        });

        // -- Guest State --
        const guests = ref([]); // Array de objetos { id: number, name: string, email: string }
        const newGuest = ref({ name: '', email: '' });
        const csvFile = ref(null); // Para el archivo CSV seleccionado

        // --- Computed ---
        const formattedDate = computed(() => {
            if (!eventDetails.value.date) return '';
            try {
                const [year, month, day] = eventDetails.value.date.split('-');
                return `${day}/${month}/${year}`; // Formato DD/MM/YYYY
            } catch { return eventDetails.value.date; } // Fallback
        });
        const formattedTime = computed(() => {
             if (!eventDetails.value.time) return '';
             // Podría formatearse a AM/PM si se desea
             return eventDetails.value.time;
        });

        // --- Methods ---

        const clearFeedback = () => { feedbackMessage.value = ''; };
        const showFeedback = (message, type = 'success', duration = 4000) => {
            feedbackMessage.value = message;
            feedbackType.value = type;
            setTimeout(clearFeedback, duration);
        };

        // == Event Methods ==
        const saveEvent = () => {
            console.log("Simulating save event:", eventDetails.value);
            isLoading.value = true;
            // ** SIMULACIÓN BACKEND **
            setTimeout(() => {
                eventDetails.value.id = Date.now(); // Simular asignación de ID
                isLoading.value = false;
                showFeedback(`Evento "${eventDetails.value.title}" guardado con éxito. Ahora añade invitados.`, 'success');
                currentView.value = 'guestManagement'; // Pasar a la siguiente vista
            }, 1000);
            // ** FIN SIMULACIÓN **
            // En una app real, harías fetch POST aquí y manejarías la respuesta
        };

        const editEvent = () => {
            currentView.value = 'eventForm'; // Volver al formulario para editar
        }

        // == Guest Methods ==
        const handleCsvUpload = (event) => {
            const file = event.target.files[0];
            if (file && file.type === "text/csv") {
                csvFile.value = file;
                showFeedback(`Archivo "${file.name}" seleccionado. Listo para procesar.`, 'success', 2000);
            } else {
                csvFile.value = null;
                if (file) {
                    showFeedback('Por favor, selecciona un archivo CSV válido.', 'error');
                }
            }
        };

        const processCsv = () => {
            if (!csvFile.value) {
                showFeedback('Primero selecciona un archivo CSV.', 'error');
                return;
            }
            if (guests.value.length >= eventDetails.value.capacity) {
                showFeedback('La capacidad de la sala ya está llena.', 'error');
                return;
            }

            isLoading.value = true;
            const reader = new FileReader();

            reader.onload = (e) => {
                const text = e.target.result;
                console.log("CSV Content:", text); // Debug
                try {
                    // Simple CSV Parsing (Name,Email) - ¡Mejorar con PapaParse para robustez!
                    const lines = text.split(/[\r\n]+/).filter(line => line.trim() !== ''); // Divide por línea y quita vacías
                    let addedCount = 0;
                    let skippedCount = 0;

                    // Detectar y/o saltar cabecera (heurística simple)
                    let startIndex = 0;
                    if (lines[0] && lines[0].toLowerCase().includes('nombre') && lines[0].toLowerCase().includes('email')) {
                        console.log("Header detected, skipping first line.");
                        startIndex = 1;
                    }

                    for (let i = startIndex; i < lines.length; i++) {
                        if (guests.value.length >= eventDetails.value.capacity) {
                            console.log("Capacity reached during CSV processing.");
                            break; // Detener si se llena la capacidad
                        }
                        const parts = lines[i].split(','); // Asume separación por coma
                        if (parts.length >= 2) {
                            const name = parts[0].trim();
                            const email = parts[1].trim();
                            // Validación simple
                            if (name && email && email.includes('@')) {
                                // Evitar duplicados por email (opcional)
                                if (!guests.value.some(g => g.email.toLowerCase() === email.toLowerCase())) {
                                    guests.value.push({ id: ++guestIdCounter, name, email });
                                    addedCount++;
                                } else {
                                    console.log(`Skipping duplicate email: ${email}`);
                                    skippedCount++;
                                }
                            } else {
                                console.log(`Skipping invalid line ${i+1}: ${lines[i]}`);
                                skippedCount++;
                            }
                        } else {
                             console.log(`Skipping malformed line ${i+1}: ${lines[i]}`);
                             skippedCount++;
                        }
                    }

                    isLoading.value = false;
                    showFeedback(`CSV Procesado: ${addedCount} invitados añadidos, ${skippedCount} omitidos.`, 'success');
                    csvFile.value = null; // Limpiar el archivo
                    document.getElementById('csvFile').value = ''; // Resetear input file visualmente

                } catch (error) {
                    console.error("Error parsing CSV:", error);
                    isLoading.value = false;
                    showFeedback('Error al procesar el archivo CSV.', 'error');
                    csvFile.value = null;
                     document.getElementById('csvFile').value = '';
                }
            };

            reader.onerror = () => {
                 isLoading.value = false;
                 showFeedback('No se pudo leer el archivo.', 'error');
                 csvFile.value = null;
                 document.getElementById('csvFile').value = '';
            };

            reader.readAsText(csvFile.value);
        };

        const addGuestManually = () => {
            const name = newGuest.value.name;
            const email = newGuest.value.email;

            if (!name || !email) {
                showFeedback('Nombre y Email son requeridos.', 'error');
                return;
            }
             if (!email.includes('@')) { // Validación email simple
                showFeedback('Introduce un email válido.', 'error');
                return;
            }
             if (guests.value.length >= eventDetails.value.capacity) {
                showFeedback('La capacidad de la sala está llena.', 'error');
                return;
            }
             // Evitar duplicados por email (opcional)
            if (guests.value.some(g => g.email.toLowerCase() === email.toLowerCase())) {
                 showFeedback(`El email ${email} ya está en la lista.`, 'error');
                 return;
            }


            console.log("Adding guest:", newGuest.value);
            guests.value.push({ id: ++guestIdCounter, name, email });
            showFeedback(`Invitado "${name}" añadido.`, 'success', 2000);

            // Limpiar formulario
            newGuest.value.name = '';
            newGuest.value.email = '';
        };

        const deleteGuest = (guestId) => {
            console.log("Deleting guest ID:", guestId);
            const guestIndex = guests.value.findIndex(g => g.id === guestId);
            if (guestIndex !== -1) {
                 const guestName = guests.value[guestIndex].name;
                 guests.value.splice(guestIndex, 1);
                 showFeedback(`Invitado "${guestName}" eliminado.`, 'success', 2000);
            }
        };

        const generateQRs = () => {
             console.log("Simulating QR generation for guests:", guests.value);
             isLoading.value = true;
            // ** SIMULACIÓN BACKEND **
            // Aquí harías una llamada a tu backend pasándole la lista de invitados (guests.value)
            // y el ID del evento (eventDetails.value.id). El backend generaría los QRs
            // (quizás guardando un código único por invitado en la BD) y podría devolver
            // un estado de éxito o incluso URLs/datos de los QRs si se necesitaran mostrar.
             setTimeout(() => {
                 isLoading.value = false;
                 showFeedback(`(Simulado) Códigos QR generados/enviados para ${guests.value.length} invitados.`, 'success');
                 // Podrías redirigir o mostrar otro estado aquí
             }, 1500);
             // ** FIN SIMULACIÓN **
        }

        /*const startNewEvent = () => {
             // Resetear todo para un nuevo evento
             currentView.value = 'eventForm';
             eventDetails.value = { id: null, title: '', cinema: '', hall: '', capacity: null, date: '', time: '', description: '' };
             guests.value = [];
             newGuest.value = { name: '', email: '' };
             csvFile.value = null;
             clearFeedback();
        }*/

        // --- Lifecycle Hooks ---
        onMounted(() => {
            console.log("Admin App Mounted");
            // Podrías cargar un evento existente aquí si fuera necesario
        });

        // --- Return ---
        return {
            // State
            currentView,
            isLoading,
            feedbackMessage,
            feedbackType,
            eventDetails,
            guests,
            newGuest,
            csvFile,
            // Computed
            formattedDate,
            formattedTime,
            // Methods
            saveEvent,
            editEvent,
            handleCsvUpload,
            processCsv,
            addGuestManually,
            deleteGuest,
            generateQRs,
            //startNewEvent,
            clearFeedback,
        };
    } // end setup()
});

// Montar la aplicación
app.mount('#admin-app');