
/**
 * LoreGraph - Emotional Memory System
 * SillyTavern Extension Script
 */

(function () {
    const EXTENSION_NAME = "LoreGraph";
    
    // Context & State
    let graphPopup = null;
    let loreGraphMemory = ""; // The text summary received from the graph
    
    // Settings Default
    const defaultSettings = {
        apiKey: "",
        model: "gemini-2.5-flash",
        autoInject: true,
        autoProcess: true, // Default to true for real-time updates
        debugMode: false
    };
    let settings = { ...defaultSettings };

    // --- 1. UTILITIES ---

    const log = (msg) => {
        console.log(`[${EXTENSION_NAME}] ${msg}`);
    };

    const saveSettings = () => {
        localStorage.setItem(`ST_LoreGraph_Settings`, JSON.stringify(settings));
    };

    const loadSettings = () => {
        const stored = localStorage.getItem(`ST_LoreGraph_Settings`);
        if (stored) {
            settings = { ...defaultSettings, ...JSON.parse(stored) };
        }
    };

    const getGraphUrl = () => {
        // Robust path finding: Try to find the script tag that loaded this file
        // If failing, fall back to standard path
        let path = `extensions/${EXTENSION_NAME}`;
        
        if (document.currentScript && document.currentScript.src) {
            const url = new URL(document.currentScript.src);
            // Remove filename to get directory
            path = url.pathname.substring(0, url.pathname.lastIndexOf('/'));
            // Remove leading slash if needed
            if (path.startsWith('/')) path = path.substring(1);
        }
        return `${path}/index.html`;
    };

    // --- 2. UI INTEGRATION (Settings & Buttons) ---

    function renderSettings() {
        const html = `
        <div class="loregraph-settings-container">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>LoreGraph Configuration</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content" style="display: block;">
                    <div class="flex-container flex-col gap-2">
                        <label>
                            <span data-i18n="Google Gemini API Key">Google Gemini API Key</span>
                            <input type="password" id="loregraph_apikey" class="text_pole" placeholder="AI Studio API Key" value="${settings.apiKey}" />
                        </label>
                        <small>Get key from <a href="https://aistudio.google.com/" target="_blank">Google AI Studio</a>. Runs locally in browser.</small>
                        
                        <div class="flex-container">
                             <label class="checkbox_label flex-1">
                                <input type="checkbox" id="loregraph_autoprocess" ${settings.autoProcess ? "checked" : ""} />
                                <span>Auto-Process Chat Logs (Real-time)</span>
                            </label>
                        </div>
                        
                        <div class="flex-container">
                             <label class="checkbox_label flex-1">
                                <input type="checkbox" id="loregraph_autoinject" ${settings.autoInject ? "checked" : ""} />
                                <span>Auto-Inject Memory into Prompt</span>
                            </label>
                        </div>
                        
                        <div class="flex-container">
                            <button id="loregraph_open_btn" class="menu_button primary">
                                <i class="fa-solid fa-circle-nodes"></i> Open Graph Monitor
                            </button>
                        </div>
                        <div id="loregraph_status" class="text-msg">Status: Ready</div>
                    </div>
                </div>
            </div>
        </div>
        `;

        // Wait for jQuery and DOM
        const checkExist = setInterval(() => {
            if (typeof $ === 'undefined') return;
            
            const extensionBlock = $(`.extension_name:contains("${EXTENSION_NAME}")`).closest('.extension_container');
            if (extensionBlock.length) {
                clearInterval(checkExist);
                if (extensionBlock.find('.loregraph-settings-container').length === 0) {
                    extensionBlock.append(html);
                    
                    $('#loregraph_apikey').on('input', (e) => {
                        settings.apiKey = e.target.value;
                        saveSettings();
                        sendToGraph('CONFIG_UPDATE', settings);
                    });

                    $('#loregraph_autoprocess').on('change', (e) => {
                        settings.autoProcess = e.target.checked;
                        saveSettings();
                        sendToGraph('CONFIG_UPDATE', settings);
                    });

                    $('#loregraph_autoinject').on('change', (e) => {
                        settings.autoInject = e.target.checked;
                        saveSettings();
                    });

                    $('#loregraph_open_btn').on('click', () => {
                        UI.openGraph();
                    });
                }
            }
        }, 1000);
    }

    const UI = {
        openGraph: () => {
            if (graphPopup && graphPopup.hasClass('ui-dialog-content') && graphPopup.dialog('isOpen')) {
                graphPopup.dialog("moveToTop");
                return;
            }
            
            const graphUrl = getGraphUrl();
            log("Opening Graph URL: " + graphUrl);

            const content = document.createElement('div');
            content.id = 'loregraph-container';
            content.style.width = '100%';
            content.style.height = '100%';
            content.innerHTML = `<iframe id="loregraph-frame" src="${graphUrl}" style="width:100%; height:100%; border:none; background:#0f172a;"></iframe>`;

            graphPopup = $(content).dialog({
                title: 'LoreGraph Monitor',
                width: 1100,
                height: 700,
                modal: false,
                autoOpen: true,
                resizable: true,
                closeOnEscape: false,
                open: () => {
                    setTimeout(() => sendToGraph('CONFIG_UPDATE', settings), 1000);
                }
            });
        }
    };

    function sendToGraph(type, payload) {
        const frame = document.getElementById('loregraph-frame');
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({ type, payload }, '*');
        }
    }

    // --- 3. TWO-WAY SYNC ---

    window.addEventListener('message', (event) => {
        if (!event.data) return;

        if (event.data.type === 'LOREGRAPH_EXPORT') {
            const promptText = event.data.payload;
            if (promptText && typeof promptText === 'string') {
                loreGraphMemory = promptText;
                if (typeof $ !== 'undefined') {
                    $('#loregraph_status').text(`Memory Updated: ${new Date().toLocaleTimeString()}`);
                }
            }
        }
        
        if (event.data.type === 'REQUEST_CONFIG') {
            sendToGraph('CONFIG_UPDATE', settings);
        }
    });

    const onMessageReceived = (data) => {
        if (!data) return;
        sendToGraph('NEW_CONTEXT', {
            text: `${data.name}: ${data.mes}`,
            timestamp: Date.now()
        });
    };

    const hook_prompt = (data) => {
        if (!settings.autoInject || !loreGraphMemory) return;
        
        const injectionText = `\n\n[System Note: The following is a psychological profile and relationship graph of the current characters. Use it to guide their reactions.]\n${loreGraphMemory}\n`;

        // SillyTavern Injection Logic
        if (Array.isArray(data.chat_completion_prompt)) {
             const msgs = data.chat_completion_prompt;
             // Insert as a System message near the end
             let insertIdx = Math.max(0, msgs.length - 1);
             msgs.splice(insertIdx, 0, { role: "system", content: injectionText });
        } 
        else if (data.final_prompt) {
            data.final_prompt += injectionText;
        }
    };

    // --- 4. INITIALIZATION ---

    const init = () => {
        if (typeof $ === 'undefined') {
            setTimeout(init, 500);
            return;
        }

        loadSettings();
        renderSettings();

        // Add Toolbar Button
        const topBar = $('#top-bar-extensions');
        if (topBar.length) {
             if ($('#loregraph_toolbar_btn').length === 0) {
                topBar.append(`
                    <div class="fa-solid fa-circle-nodes extension_icon" id="loregraph_toolbar_btn" title="LoreGraph"></div>
                `);
                $('#loregraph_toolbar_btn').on('click', UI.openGraph);
             }
        }

        // Hooks
        if (window.eventSource) {
            window.eventSource.on(window.event_types.MESSAGE_RECEIVED, onMessageReceived);
            window.eventSource.on(window.event_types.CHAT_CHANGED, () => {
                 sendToGraph('RESET_GRAPH', {});
                 loreGraphMemory = "";
            });
        }
        
        // Injection Hooks
        $(document).on('chat_completion_source_prompt_ready', function(event, data) { hook_prompt(data); });
        $(document).on('text_completion_prompt_ready', function(event, data) { hook_prompt(data); });

        log("Loaded.");
    };
    
    init();

})();
