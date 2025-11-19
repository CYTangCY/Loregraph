
/**
 * LoreGraph - SillyTavern Extension
 * Bridges SillyTavern's event system with the React Graph Visualizer
 */

const EXTENSION_NAME = "LoreGraph";
// Assuming the built React app is served from the extension directory
// SillyTavern usually serves extension files relatively
const GRAPH_URL = "extensions/LoreGraph/index.html"; 

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
        
        // We assume index.html is in the same folder as extension.js after build
        content.innerHTML = `<iframe id="loregraph-frame" src="${GRAPH_URL}" style="width:100%; height:100%; border:none;"></iframe>`;

        // Create jQuery Dialog (SillyTavern standard)
        graphPopup = $(content).dialog({
            title: 'LoreGraph - Emotional Network',
            width: 1000,
            height: 700,
            modal: false,
            autoOpen: true,
            resizeable: true,
            close: () => { /* Handle close */ }
        });

        graphFrame = document.getElementById('loregraph-frame');
    },
    
    sendToGraph: (type, payload) => {
        if (graphFrame && graphFrame.contentWindow) {
            graphFrame.contentWindow.postMessage({ type, payload }, '*');
        }
    }
};

// Hook into SillyTavern's API
async function onMessageReceived(data) {
    if (!data) return;
    
    // Only process if the graph is running to save resources? 
    // Or buffer regardless? React app buffers, so just send it.
    
    const messageText = data.mes; // The content of the message
    const speaker = data.name; // Character name

    console.log('[LoreGraph] New message detected, sending to engine...');
    
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
    // 1. Register Slash Command
    // This allows usages in Quick Replies or the "Magic Wand" macro tool
    // Command: /loregraph
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

    // 2. Add button to the Extensions Menu (Fallback)
    const buttonHtml = `
        <div id="loregraph-button" class="list-group-item flex-container flex-gap-10" title="Open LoreGraph">
            <div class="fa-solid fa-circle-nodes"></div>
            <div>LoreGraph Monitor</div>
        </div>
    `;
    $('#extensions_settings').append(buttonHtml);
    $('#loregraph-button').on('click', () => {
        UI.openGraph();
    });

    // 3. Auto-Start Listener
    // Automatically attach listeners when extension loads
    if (window.eventSource) {
        window.eventSource.on(window.event_types.MESSAGE_RECEIVED, onMessageReceived);
        window.eventSource.on(window.event_types.CHAT_CHANGED, () => {
            UI.sendToGraph('RESET_GRAPH', {});
        });
        console.log(`${EXTENSION_NAME} : Events Attached.`);
    }
    
    console.log(`${EXTENSION_NAME} : Ready. Use /loregraph to open.`);
});
