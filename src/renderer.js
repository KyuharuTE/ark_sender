import { createApp, ref, computed } from './lib/vue.js';
import { Contact, ChatFuncBar } from '../LiteLoaderQQNT-Euphony/src/index.js';
import { createApiHandler } from './until/apiHandler.js';
import { createMessageHandler } from './until/messageHandler.js';

async function initializeDOM() {
    const templatePath = `local:///${LiteLoader.plugins['ark_sender'].path.plugin}/src/ui/create_window.html`;
    const template = await (await fetch(templatePath)).text();
    document.body.insertAdjacentHTML('afterbegin', template);

    return {
        window: document.getElementById('ark-sender-window'),
        modal: document.getElementById('ark-sender-modal'),
        dialog: document.getElementById('ark-sender-dialog')
    };
}

function createWindowController(elements) {
    function hideWindow() {
        elements.window.style.visibility = 'hidden';
        elements.modal.style.transitionDelay = '150ms';
        elements.dialog.style.transitioDelay = '0ms';
        elements.modal.style.opacity = 0;
        elements.dialog.style.opacity = 0;
        elements.dialog.style.transform = 'translate(0px, -20px)';
    }

    function showWindow() {
        elements.window.style.visibility = 'visible';
        elements.modal.style.transitionDelay = '0ms';
        elements.dialog.style.transitionDelay = '150ms';
        elements.modal.style.opacity = 1;
        elements.dialog.style.opacity = 1;
        elements.dialog.style.transform = 'translate(0px, 0px)';
    }

    return { hideWindow, showWindow };
}

function createVueApp(elements, windowController) {
    const messageHandler = createMessageHandler();

    return createApp({
        setup() {
            const isDarkMode = ref(document.body.getAttribute('q-theme') == 'dark');
            const inputPort = ref('3000');
            const inputType = ref('json');
            const inputContent = ref('');

            const getPlaceholder = computed(() => {
                switch (inputType.value) {
                    case 'json':
                        return '请输入JSON消息内容';
                    case 'text':
                        return '请输入文本消息内容';
                    default:
                        return '请输入消息内容';
                }
            });

            async function sendMessage() {
                try {
                    if (!inputPort.value || !inputContent.value) {
                        console.warn('端口号和消息内容不能为空');
                        return;
                    }

                    const apiHandler = createApiHandler(inputPort.value);
                    const message = messageHandler.buildMessage(inputType.value, inputContent.value);
                    
                    // if (inputType.value == 'pb') {
                    //     await apiHandler.request('send_packet', message)
                    //     windowController.hideWindow();
                    //     return;
                    // }

                    await apiHandler.sendGroupMessage(
                        Contact.getCurrentContact().getId(),
                        message
                    );

                    windowController.hideWindow();
                } catch (error) {
                    console.error('发送消息时出错:', error);
                }
            }

            return {
                isDarkMode,
                inputPort,
                inputType,
                inputContent,
                getPlaceholder,
                sendMessage
            };
        }
    }).mount('#ark-sender-dialog');
}

async function main() {
    try {
        const elements = await initializeDOM();

        const windowController = createWindowController(elements);

        elements.modal.addEventListener('click', windowController.hideWindow);

        const app = createVueApp(elements, windowController);

        const buttonSvg = await (await fetch(`local:///${LiteLoader.plugins['ark_sender'].path.plugin}/src/assets/svg/open_button.svg`)).text();
        ChatFuncBar.addLeftButton(buttonSvg, windowController.showWindow);

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type == 'attributes' && mutation.attributeName == 'q-theme') {
                    app.isDarkMode = document.body.getAttribute('q-theme') == 'dark';
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    } catch (error) {
        console.error('初始化过程出错:', error);
    }
}

main();
