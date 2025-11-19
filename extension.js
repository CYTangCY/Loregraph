/**
 * LoreGraph - SillyTavern Extension
 * Bridges SillyTavern's event system with the React Graph Visualizer
 */

const EXTENSION_NAME = "LoreGraph";

// Robust logic to find the index.html path relative to this script
const getGraphUrl = () => {
    // 1. Try to find the script tag that loaded this file
    const scripts = document.getElementsByTagName('script');
    let currentScriptPath = '';
    
    if (document.currentScript) {
        currentScriptPath = document.currentScript.src;
    } else {
        // Fallback: look for the script ending in extension.js
        for (let i = 0; i < scripts.length; i++) {
            if (scripts[i].src && scripts[i].src.includes('LoreGraph/extension.js')) {
                currentScriptPath = scripts[i].src;
                break;
            }
        }
    }

    if (currentScriptPath) {
        // Replace extension.js with index.html
        return currentScriptPath.replace('extension.js', 'index.html');
    }
    
    // Fallback default
    return "extensions/LoreGraph/index.html";
};

const GRAPH_URL = getGraphUrl();

let graphPopup = null;
let graphFrame = null;

const UI = {
    openGraph: () => {
        if (graphPopup) {
            graphPopup.dialog("open");
            return;
        }

        // Create the container for the visualization
        const content = document.createElement('div');
        content.id = 'loregraph-container';
        content.style.width = '100%';
        content.style.height = '100%';
        
        content.innerHTML = `<iframe id="loregraph-frame" src="${GRAPH_URL}" style="width:100%; height:100%; border:none; background:#0f172a;"></iframe>`;

        // Create jQuery Dialog (SillyTavern standard)
        graphPopup = $(content).dialog({
            title: 'LoreGraph - Emotional Network',
            width: 1000,
            height: 700,
            modal: false,
            autoOpen: true,
            resizable: true,
            close: () => { /* Handle close */ }
        });

        graphFrame = document.getElementById('loregraph-frame');
    },
    
    sendToGraph: (type, payload) => {
        const frame = document.getElementById('loregraph-frame');
        if (frame && frame.contentWindow) {
            console.log(`[LoreGraph] Sending ${type} to iframe`);
            frame.contentWindow.postMessage({ type, payload }, '*');
        } else {
            console.warn("[LoreGraph] Iframe not ready");
        }
    }
};

// Hook into SillyTavern's API
async function onMessageReceived(data) {
    if (!data) return;
    
    const messageText = data.mes; // The content of the message
    const speaker = data.name; // Character name

    // We assume the graph might be open, try to send.
    // If it's closed, the buffer inside the iframe (if loaded) might miss it, 
    // but usually extensions keep state if the iframe isn't destroyed. 
    // jQuery dialogs usually just hide.
    UI.sendToGraph('NEW_CONTEXT', {
        text: `${speaker}: ${messageText}`,
        timestamp: Date.now()
    });
}

// Slash Command Handler
function slashCommandHandler(args, value) {
    UI.openGraph();
    return ""; // Return empty string to not output to chat
}

// Initialization
jQuery(async () => {
    console.log(`${EXTENSION_NAME} : Initializing...`);

    // 1. Register Slash Command
    if (window.SlashCommandParser && window.SlashCommandParser.addCommandObject) {
        window.SlashCommandParser.addCommandObject(
            window.SlashCommandParser.createCommandObject(
                'loregraph', 
                {
                    helpString: "Opens the LoreGraph Emotional Memory Visualization",
                    function: slashCommandHandler
                }
            )
        );
    }

    // 2. Add button to the Extensions Menu
    const buttonHtml = `
        <div id="loregraph-button" class="list-group-item flex-container flex-gap-10" title="Open LoreGraph">
            <div class="fa-solid fa-circle-nodes"></div>
            <div>LoreGraph Monitor</div>
        </div>
    `;
    // Check if already exists to prevent duplicates on reload
    if ($('#loregraph-button').length === 0) {
        $('#extensions_settings').append(buttonHtml);
        $('#loregraph-button').on('click', () => {
            UI.openGraph();
        });
    }

    // 3. Auto-Start Listener
    if (window.eventSource) {
        window.eventSource.on(window.event_types.MESSAGE_RECEIVED, onMessageReceived);
        window.eventSource.on(window.event_types.CHAT_CHANGED, () => {
            UI.sendToGraph('RESET_GRAPH', {});
        });
        console.log(`${EXTENSION_NAME} : Events Attached.`);
    }
    
    console.log(`${EXTENSION_NAME} : Ready. Use /loregraph to open.`);
    
    // Auto-open minimized or notify
    toastr.info("LoreGraph Loaded. Type /loregraph to view.");
});